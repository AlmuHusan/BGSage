import torch
from transformers import AutoModel, AutoProcessor
from PIL import Image
import requests
from io import BytesIO

# Configuration
MODEL_ID = "TomoroAI/tomoro-ai-colqwen3-embed-4b-awq"
DTYPE = torch.bfloat16
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Load Model & Processor
processor = AutoProcessor.from_pretrained(
    MODEL_ID,
    trust_remote_code=True,
    max_num_visual_tokens=1280,
)
model = AutoModel.from_pretrained(
    MODEL_ID,
    dtype=DTYPE,
    attn_implementation="sdpa",  # Use "flash_attention_2" if available
    trust_remote_code=True,
    device_map=DEVICE,
).eval()

# Sample queries and documents
queries = [
    "Retrieve the city of Singapore",
    "Retrieve the city of Beijing",
]
doc_urls = [
    "https://upload.wikimedia.org/wikipedia/commons/2/27/Singapore_skyline_2022.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/6/61/Beijing_skyline_at_night.JPG",
]

def load_image(url: str) -> Image.Image:
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")

def encode_queries(texts):
    batch = processor.process_texts(texts=texts)
    batch = {k: v.to(DEVICE) for k, v in batch.items()}
    with torch.inference_mode():
        out = model(**batch)
    return out.embeddings.to(torch.bfloat16).cpu()

def encode_docs(urls):
    images = [load_image(url) for url in urls]
    features = processor.process_images(images=images)
    features = {k: v.to(DEVICE) if isinstance(v, torch.Tensor) else v for k, v in features.items()}
    with torch.inference_mode():
        out = model(**features)
    return out.embeddings.to(torch.bfloat16).cpu()

# Encode and score
query_embeddings = encode_queries(queries)
doc_embeddings = encode_docs(doc_urls)
scores = processor.score_multi_vector(query_embeddings, doc_embeddings)
print(scores)
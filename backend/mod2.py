import base64
import io

import requests
from docling_core.types.doc.document import DoclingDocument, DocTagsDocument
from PIL import Image
from requests import Response

img_url = "https://ibm.biz/docling-page-with-list"
response: Response = requests.get(img_url)
png_bytes: bytes = response.content
with open("./pdfs/SI/page13.jpg", 'rb') as f:
    image_bytes = f.read()
response = requests.post(
    url="http://localhost:11434/api/chat",
    json={
        "messages": [
            {
                "role": "user",
                "content": "Convert this image to docling.",
                "images": [base64.b64encode(image_bytes).decode("utf-8")],
            }
        ],
        "model": "danchev/granite-docling",
        "stream": False,
    },
)

doctags: str = response.json()["message"]["content"]

doc: DoclingDocument = DoclingDocument.load_from_doctags(
    doctag_document=DocTagsDocument.from_doctags_and_image_pairs(
        doctags=[doctags], images=[Image.open(io.BytesIO(png_bytes))]
    ),
)

markdown: str = doc.export_to_markdown()
print(markdown)
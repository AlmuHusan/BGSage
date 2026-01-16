"""Template Demo for IBM Granite Hugging Face spaces."""

import html
import os
import random
import re
import time
from pathlib import Path
from threading import Thread

import gradio as gr
import numpy as np
import torch
from docling_core.types.doc import DoclingDocument
from docling_core.types.doc.document import DocTagsDocument
from PIL import Image, ImageDraw, ImageOps
from transformers import (
    AutoProcessor,
    Idefics3ForConditionalGeneration,
    TextIteratorStreamer,
)



dir_ = Path(__file__).parent.parent

TITLE = "Granite-docling-258m demo"

DESCRIPTION = """
<p>This experimental demo highlights the capabilities of granite-docling-258M for document conversion, 
showcasing Granite Docling's various features. Explore the sample document excerpts and try the sample 
prompts or enter your own. Keep in mind that AI can occasionally make mistakes.</p>
"""

device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")


# Initialize the model
model_id = "ibm-granite/granite-docling-258M"

if gr.NO_RELOAD:
    processor = AutoProcessor.from_pretrained(model_id)
    model = Idefics3ForConditionalGeneration.from_pretrained(
        model_id, device_map=device, torch_dtype=torch.bfloat16)
    if not torch.cuda.is_available():
        model = model.to(device)


def lower_md_headers(md: str) -> str:
    """Convert markdown headers to lower level headers."""
    return re.sub(r"(?:^|\n)##?\s(.+)", lambda m: "\n### " + m.group(1), md)



def clean_model_response(text: str) -> str:
    """Clean up model response by removing special tokens and formatting properly."""
    if not text:
        return "No response generated."
    special_tokens = [
        "<|end_of_text|>",
        "<|end|>",
        "<|assistant|>",
        "<|user|>",
        "<|system|>",
        "<pad>",
        "</s>",
        "<s>",
    ]

    cleaned = text
    for token in special_tokens:
        cleaned = cleaned.replace(token, "")
    cleaned = cleaned.strip()

    if not cleaned or len(cleaned) == 0:
        return "The model generated a response, but it appears to be empty or contain only special tokens."
    return cleaned


def generate_with_model(question: str, image_path: str, apply_padding: bool = False) -> str:
    """Generate answer using the Granite Docling model directly on the image."""
    if os.environ.get("NO_LLM"):
        time.sleep(2)
        return "This is a simulated response from the Granite Docling model."

    try:
        image = Image.open(image_path).convert("RGB")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image"},
                    {"type": "text", "text": question},
                ],
            }
        ]
        prompt = processor.apply_chat_template(messages, add_generation_prompt=True)
        temperature = 0.0
        inputs = processor(text=prompt, images=[image], return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            generated_ids = model.generate(
                **inputs,
                max_new_tokens=4096,
                temperature=temperature,
                do_sample=temperature > 0,
                pad_token_id=processor.tokenizer.eos_token_id,
            )
        generated_texts = processor.batch_decode(
            generated_ids[:, inputs["input_ids"].shape[1] :],
            skip_special_tokens=False,
        )[0]
        cleaned_response = clean_model_response(generated_texts)

        return cleaned_response

    except Exception as e:
        return f"Error processing image: {e!s}"


_streaming_raw_output = ""


def generate_with_model_streaming(question: str, image_path: str, apply_padding: bool = False) -> None:
    """Generate answer using the Granite Docling model with streaming."""
    global _streaming_raw_output
    _streaming_raw_output = ""

    try:
        image = Image.open(image_path).convert("RGB")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image"},
                    {"type": "text", "text": question},
                ],
            }
        ]

        prompt = processor.apply_chat_template(messages, add_generation_prompt=True)
        temperature = 0.0

        inputs = processor(text=prompt, images=[image], return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}

        streamer = TextIteratorStreamer(processor, skip_prompt=True, skip_special_tokens=False)
        generation_args = dict(
            inputs,
            streamer=streamer,
            max_new_tokens=4096,
            temperature=temperature,
            do_sample=temperature > 0,
            pad_token_id=processor.tokenizer.eos_token_id,
        )

        thread = Thread(target=model.generate, kwargs=generation_args)
        thread.start()

        yield "..."
        full_output = ""
        escaped_output = ""

        for new_text in streamer:
            full_output += new_text
            escaped_output += html.escape(new_text)
            yield escaped_output

        _streaming_raw_output = full_output

    except Exception as e:
        yield f"Error generating response: {e!s}"

if __name__ == "__main__":
    test=generate_with_model("Convert this page to docling.","./pdfs/SI/page13.jpg",False)
    print(test)

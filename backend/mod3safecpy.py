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
import spaces
import torch
from docling_core.types.doc import DoclingDocument
from docling_core.types.doc.document import DocTagsDocument
from PIL import Image, ImageDraw, ImageOps
from transformers import (
    AutoProcessor,
    Idefics3ForConditionalGeneration,
    TextIteratorStreamer,
)

from themes.research_monochrome import theme

dir_ = Path(__file__).parent.parent

TITLE = "Granite-docling-258m demo"

DESCRIPTION = """
<p>This experimental demo highlights the capabilities of granite-docling-258M for document conversion, 
showcasing Granite Docling's various features. Explore the sample document excerpts and try the sample 
prompts or enter your own. Keep in mind that AI can occasionally make mistakes.</p>
"""

device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")

SAMPLES_PATH = dir_ / "data" / "images"

sample_data = [
    {
        "preview_image": str(SAMPLES_PATH / "new_arxiv.png"),
        "prompts": [
            "Convert this page to docling.",
            "Does the document contain tables?",
            "Can you extract the 2nd section header?",
            "What element is located at <loc_84><loc_403><loc_238><loc_419>",
            "How can effective temperature be computed?",
            "Extract all picture elements on the page.",
        ],
        "image": str(SAMPLES_PATH / "new_arxiv.png"),
        "name": "Doc Conversion",
        "pad": False,
    },
    {
        "preview_image": str(SAMPLES_PATH / "image-2.jpg"),
        "prompts": ["Convert this table to OTSL.", "What is the Net income in 2008?"],
        "image": str(SAMPLES_PATH / "image-2.jpg"),
        "name": "Table Recognition",
        "pad": True,
    },
    {
        "preview_image": str(SAMPLES_PATH / "code.jpg"),
        "prompts": ["Convert code to text."],
        "image": str(SAMPLES_PATH / "code.jpg"),
        "name": "Code Recognition",
        "pad": True,
    },
    {
        "preview_image": str(SAMPLES_PATH / "lake-zurich-switzerland-view-nature-landscapes-7bbda4-1024.jpg"),
        "prompts": ["Describe this image."],
        "image": str(SAMPLES_PATH / "lake-zurich-switzerland-view-nature-landscapes-7bbda4-1024.jpg"),
        "name": "Image Captioning",
        "pad": False,
    },
    {
        "preview_image": str(SAMPLES_PATH / "87664.png"),
        "prompts": ["Convert formula to latex."],
        "image": str(SAMPLES_PATH / "87664.png"),
        "name": "Formula Recognition",
        "pad": True,
    },
    {
        "preview_image": str(SAMPLES_PATH / "06236926002285.png"),
        "prompts": ["Convert chart to OTSL."],
        "image": str(SAMPLES_PATH / "06236926002285.png"),
        "name": "Chart Extraction",
        "pad": False,
    },
    {
        "preview_image": str(SAMPLES_PATH / "ar_page_0.png"),
        "prompts": ["Convert this page to docling."],
        "image": str(SAMPLES_PATH / "ar_page_0.png"),
        "name": "Arabic Conversion",
        "pad": False,
    },
    {
        "preview_image": str(SAMPLES_PATH / "japanse_4_ibm.png"),
        "prompts": ["Convert this page to docling."],
        "image": str(SAMPLES_PATH / "japanse_4_ibm.png"),
        "name": "Japanese Conversion",
        "pad": False,
    },
    {
        "preview_image": str(SAMPLES_PATH / "zh_page_0.png"),
        "prompts": ["Convert this page to docling."],
        "image": str(SAMPLES_PATH / "zh_page_0.png"),
        "name": "Chinese Conversion",
        "pad": False,
    },
]

# Initialize the model
model_id = "ibm-granite/granite-docling-258M"

if gr.NO_RELOAD:
    processor = AutoProcessor.from_pretrained(model_id, use_auth_token=True)
    model = Idefics3ForConditionalGeneration.from_pretrained(
        model_id, device_map=device, torch_dtype=torch.bfloat16, use_auth_token=True
    )
    if not torch.cuda.is_available():
        model = model.to(device)


def lower_md_headers(md: str) -> str:
    """Convert markdown headers to lower level headers."""
    return re.sub(r"(?:^|\n)##?\s(.+)", lambda m: "\n### " + m.group(1), md)


def add_random_padding(image: Image.Image, min_percent: float = 0.1, max_percent: float = 0.10) -> Image.Image:
    """Add random padding to an image."""
    image = image.convert("RGB")

    width, height = image.size

    pad_w_percent = random.uniform(min_percent, max_percent)
    pad_h_percent = random.uniform(min_percent, max_percent)

    pad_w = int(width * pad_w_percent)
    pad_h = int(height * pad_h_percent)

    corner_pixel = image.getpixel((0, 0))  # Top-left corner
    padded_image = ImageOps.expand(image, border=(pad_w, pad_h, pad_w, pad_h), fill=corner_pixel)

    return padded_image


def draw_bounding_boxes(image_path: str, response_text: str, is_doctag_response: bool = False) -> Image.Image:
    """Draw bounding boxes on the image based on loc tags and return the annotated image."""
    try:
        # Load the original image
        image = Image.open(image_path).convert("RGB")
        draw = ImageDraw.Draw(image)

        # Get image dimensions
        width, height = image.size

        # Color mapping for different classes (RGB values converted to hex)
        class_colors = {
            "caption": "#FFCC99",  # (255, 204, 153)
            "footnote": "#C8C8FF",  # (200, 200, 255)
            "formula": "#C0C0C0",  # (192, 192, 192)
            "list_item": "#9999FF",  # (153, 153, 255)
            "page_footer": "#CCFFCC",  # (204, 255, 204)
            "page_header": "#CCFFCC",  # (204, 255, 204)
            "picture": "#FFCCA4",  # (255, 204, 164)
            "chart": "#FFCCA4",  # (255, 204, 164)
            "section_header": "#FF9999",  # (255, 153, 153)
            "table": "#FFCCCC",  # (255, 204, 204)
            "text": "#FFFF99",  # (255, 255, 153)
            "title": "#FF9999",  # (255, 153, 153)
            "document_index": "#DCDCDC",  # (220, 220, 220)
            "code": "#7D7D7D",  # (125, 125, 125)
            "checkbox_selected": "#FFB6C1",  # (255, 182, 193)
            "checkbox_unselected": "#FFB6C1",  # (255, 182, 193)
            "form": "#C8FFFF",  # (200, 255, 255)
            "key_value_region": "#B7410E",  # (183, 65, 14)
            "paragraph": "#FFFF99",  # (255, 255, 153)
            "reference": "#B0E0E6",  # (176, 224, 230)
            "grading_scale": "#FFCCCC",  # (255, 204, 204)
            "handwritten_text": "#CCFFCC",  # (204, 255, 204)
            "empty_value": "#DCDCDC",  # (220, 220, 220)
        }

        doctag_class_pattern = r"<([^>]+)><loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)>[^<]*</[^>]+>"
        doctag_matches = re.findall(doctag_class_pattern, response_text)

        class_pattern = r"<([^>]+)><loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)>"
        class_matches = re.findall(class_pattern, response_text)
        seen_coords = set()
        all_class_matches = []

        for match in doctag_matches:
            coords = (match[1], match[2], match[3], match[4])
            if coords not in seen_coords:
                seen_coords.add(coords)
                all_class_matches.append(match)

        for match in class_matches:
            coords = (match[1], match[2], match[3], match[4])
            if coords not in seen_coords:
                seen_coords.add(coords)
                all_class_matches.append(match)

        loc_only_pattern = r"<loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)>"
        loc_only_matches = re.findall(loc_only_pattern, response_text)

        for class_name, xmin, ymin, xmax, ymax in all_class_matches:
            if is_doctag_response:
                color = class_colors.get(class_name.lower(), None)
                if color is None:
                    for key in class_colors:
                        if class_name.lower() in key or key in class_name.lower():
                            color = class_colors[key]
                            break
                    if color is None:
                        color = "#808080"
            else:
                color = "#E0115F"

            x1 = int((int(xmin) / 500) * width)
            y1 = int((int(ymin) / 500) * height)
            x2 = int((int(xmax) / 500) * width)
            y2 = int((int(ymax) / 500) * height)
            draw.rectangle([x1, y1, x2, y2], outline=color, width=3)

        for xmin, ymin, xmax, ymax in loc_only_matches:
            if is_doctag_response:
                continue
            else:
                color = "#808080"

            x1 = int((int(xmin) / 500) * width)
            y1 = int((int(ymin) / 500) * height)
            x2 = int((int(xmax) / 500) * width)
            y2 = int((int(ymax) / 500) * height)
            draw.rectangle([x1, y1, x2, y2], outline=color, width=3)

        return image

    except Exception:
        return Image.open(image_path)


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


@spaces.GPU()
def generate_with_model(question: str, image_path: str, apply_padding: bool = False) -> str:
    """Generate answer using the Granite Docling model directly on the image."""
    if os.environ.get("NO_LLM"):
        time.sleep(2)
        return "This is a simulated response from the Granite Docling model."

    try:
        image = Image.open(image_path).convert("RGB")
        if apply_padding:
            image = add_random_padding(image)
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


@spaces.GPU()
def generate_with_model_streaming(question: str, image_path: str, apply_padding: bool = False) -> None:
    """Generate answer using the Granite Docling model with streaming."""
    global _streaming_raw_output
    _streaming_raw_output = ""

    try:
        image = Image.open(image_path).convert("RGB")
        if apply_padding:
            image = add_random_padding(image)
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


chatbot = gr.Chatbot(
    examples=[{"text": x} for x in sample_data[0]["prompts"]],
    type="messages",
    label=f"Q&A about {sample_data[0]['name']}",
    height=685,
    group_consecutive_messages=True,
    autoscroll=False,
    elem_classes=["chatbot_view"],
)


css_file_path = Path(Path(__file__).parent / "app.css")
head_file_path = Path(Path(__file__).parent / "app_head.html")

with gr.Blocks(fill_height=True, css_paths=css_file_path, head_paths=head_file_path, theme=theme, title=TITLE) as demo:
    is_in_edit_mode = gr.State(True)  # in block to be reactive
    selected_doc = gr.State(0)
    current_question = gr.State("")
    uploaded_image_path = gr.State(None)  # Store path to uploaded image

    gr.Markdown(f"# {TITLE}")
    gr.Markdown(DESCRIPTION)

    # Create gallery with captions for hover effect
    gallery_with_captions = []
    for sd in sample_data:
        gallery_with_captions.append((sd["preview_image"], sd["name"]))

    document_gallery = gr.Gallery(
        gallery_with_captions,
        label="Select a document",
        rows=1,
        columns=9,
        height="125px",
        allow_preview=False,
        selected_index=0,
        elem_classes=["preview_im_element"],
        show_label=True,
    )

    with gr.Row():
        with gr.Column(), gr.Group():
            image_display = gr.Image(
                sample_data[0]["image"],
                label=f"Preview for {sample_data[0]['name']}",
                height=700,
                interactive=False,
                elem_classes=["image_viewer"],
            )
            # Upload button for custom images
            upload_button = gr.UploadButton(
                "📁 Upload Image", file_types=["image"], elem_classes=["upload_button"], scale=1
            )

        with gr.Column():
            chatbot.render()
            with gr.Row():
                tbb = gr.Textbox(submit_btn=True, show_label=False, placeholder="Type a message...", scale=4)
                fb = gr.Button("Ask new question", visible=False, scale=1)
            fb.click(lambda: [], outputs=[chatbot])

    def sample_image_selected(d: gr.SelectData) -> tuple:
        """Handle sample image selection."""
        dx = sample_data[d.index]
        return (
            gr.update(examples=[{"text": x} for x in dx["prompts"]], label=f"Q&A about {dx['name']}"),
            gr.update(value=dx["image"], label=f"Preview for {dx['name']}"),
            d.index,
        )

    document_gallery.select(lambda: [], outputs=[chatbot])
    document_gallery.select(sample_image_selected, inputs=[], outputs=[chatbot, image_display, selected_doc])

    def update_user_chat_x(x: gr.SelectData) -> list:
        """Update chat with user selection."""
        return [gr.ChatMessage(role="user", content=x.value["text"])]

    def question_from_selection(x: gr.SelectData) -> str:
        """Extract question text from selection."""
        return x.value["text"]

    def handle_image_upload(uploaded_file: str | None) -> tuple:
        """Handle uploaded image and update the display."""
        if uploaded_file is None:
            return None, None, None

        # Update the image display with the uploaded image
        image_update = gr.update(value=uploaded_file, label="Uploaded Image")

        # Update chatbot to show it's ready for questions about the uploaded image
        chatbot_update = gr.update(
            examples=[{"text": "Convert this page to docling."}], label="Q&A about uploaded image"
        )

        # Clear the chat history
        chat_update = []

        return image_update, chatbot_update, chat_update, uploaded_file

    # Connect upload button to handler
    upload_button.upload(
        handle_image_upload, inputs=[upload_button], outputs=[image_display, chatbot, chatbot, uploaded_image_path]
    )

    def send_generate(msg: str, cb: list, selected_sample: int, uploaded_img_path: str | None = None) -> None:
        """Generate response using the model."""
        # Use uploaded image if available, otherwise use selected sample
        image_path = uploaded_img_path if uploaded_img_path is not None else sample_data[selected_sample]["image"]
        original_msg = gr.ChatMessage(role="user", content=msg)
        cb.append(original_msg)

        processing_msg = gr.ChatMessage(
            role="assistant",
            content='<span class="jumping-dots"><span class="dot-1">.</span>  <span class="dot-2">.</span>  '
            '<span class="dot-3">.</span></span>',
        )
        cb.append(processing_msg)
        yield cb, gr.update()

        # Apply padding only for sample images, not uploaded images
        apply_padding = False if uploaded_img_path is not None else sample_data[selected_sample].get("pad", False)

        first_token = True
        try:
            stream_gen = generate_with_model_streaming(msg.strip(), image_path, apply_padding)

            for partial_answer in stream_gen:
                if first_token:
                    cb[-1] = gr.ChatMessage(role="assistant", content=partial_answer)
                    first_token = False
                else:
                    cb[-1] = gr.ChatMessage(role="assistant", content=partial_answer)
                yield cb, gr.update()

        except Exception:
            answer = generate_with_model(msg.strip(), image_path, apply_padding)
            cb[-1] = gr.ChatMessage(role="assistant", content=answer)
            yield cb, gr.update()

        global _streaming_raw_output
        answer = _streaming_raw_output if _streaming_raw_output else partial_answer

        answer = html.unescape(answer)
        answer = clean_model_response(answer)
        class_loc_pattern = r"<([^>]+)><loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)>"
        class_loc_matches = re.findall(class_loc_pattern, answer)

        loc_only_pattern = r"<loc_(\d+)><loc_(\d+)><loc_(\d+)><loc_(\d+)>"
        loc_only_matches = re.findall(loc_only_pattern, answer)

        has_doctag = "<doctag>" in answer
        has_loc_tags = class_loc_matches or loc_only_matches

        xml_tags = ["<doctag>", "<otsl>", "<chart>", "<code>", "<loc_"]
        if any(tag in answer for tag in xml_tags):
            cb[-1] = gr.ChatMessage(role="assistant", content=f"```xml\n{answer}\n```")
        else:
            cb[-1] = gr.ChatMessage(role="assistant", content=answer)

        if "convert this page to docling" in msg.lower() or ("convert" in msg.lower() and "otsl" in msg.lower()):
            try:
                doctags_doc = DocTagsDocument.from_doctags_and_image_pairs([answer], [Image.open(image_path)])
                doc = DoclingDocument.load_from_doctags(doctags_doc, document_name="Document")
                markdown_output = doc.export_to_markdown()
                response = gr.ChatMessage(
                    role="assistant",
                    content=f"\nConverted to Markdown using docling.\n\n**MD Output:**\n\n{markdown_output}",
                )
                cb.append(response)
            except Exception as e:
                error_response = gr.ChatMessage(role="assistant", content=f"Error creating markdown output: {e!s}")
                cb.append(error_response)
        elif "convert formula to latex" in msg.lower():
            try:
                doctags_doc = DocTagsDocument.from_doctags_and_image_pairs([answer], [Image.open(image_path)])
                doc = DoclingDocument.load_from_doctags(doctags_doc, document_name="Document")
                markdown_output = doc.export_to_markdown()
                if markdown_output.count("$$") >= 2:
                    parts = markdown_output.split("$$", 2)
                    formula = parts[1].strip()
                    wrapped = f"$$\n\\begin{{aligned}}\n{formula}\n\\end{{aligned}}\n$$"
                    markdown_output = parts[0] + wrapped + parts[2]
                md_response = gr.ChatMessage(
                    role="assistant",
                    content=f"\nConverted to Markdown using docling.\n\n**LaTeX Output:**\n\n{markdown_output}",
                )
                cb.append(md_response)
            except Exception as e:
                error_response = gr.ChatMessage(role="assistant", content=f"Error creating LaTeX output: {e!s}")
                cb.append(error_response)

        if has_loc_tags:
            try:
                annotated_image = draw_bounding_boxes(image_path, answer, is_doctag_response=has_doctag)
                annotated_array = np.array(annotated_image)
                yield cb, gr.update(value=annotated_array, visible=True)
            except Exception:
                yield cb, gr.update(value=image_path)
        else:
            yield cb, gr.update(value=image_path)

    chatbot.example_select(lambda: False, outputs=is_in_edit_mode)
    chatbot.example_select(question_from_selection, inputs=[], outputs=[current_question]).then(
        send_generate,
        inputs=[current_question, chatbot, selected_doc, uploaded_image_path],
        outputs=[chatbot, image_display],
    )

    def textbox_switch(e_mode: bool) -> list:
        """Switch textbox visibility based on edit mode."""
        if not e_mode:
            return [gr.update(visible=False), gr.update(visible=True)]
        else:
            return [gr.update(visible=True), gr.update(visible=False)]

    tbb.submit(lambda: False, outputs=[is_in_edit_mode])
    fb.click(lambda: True, outputs=[is_in_edit_mode])
    is_in_edit_mode.change(textbox_switch, inputs=[is_in_edit_mode], outputs=[tbb, fb])

    tbb.submit(lambda x: x, inputs=[tbb], outputs=[current_question]).then(
        send_generate,
        inputs=[current_question, chatbot, selected_doc, uploaded_image_path],
        outputs=[chatbot, image_display],
    )

if __name__ == "__main__":
    demo.queue(max_size=20)
    demo.launch()

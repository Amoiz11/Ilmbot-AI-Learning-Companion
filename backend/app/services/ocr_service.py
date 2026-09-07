import os
import io
import logging
import asyncio
from typing import List, Optional

from google import genai
from google.genai import types
import pypdfium2 as pdfium
from PIL import Image

logger = logging.getLogger(__name__)

MAX_OCR_PAGES = 15

OCR_TRANSCRIPTION_PROMPT = (
    "You are an expert academic and technical document OCR transcription engine. "
    "Carefully transcribe ALL visible text, headers, subheadings, bullet points, "
    "mathematical formulas, definitions, code blocks, tables, numbers, and diagram annotations "
    "from this document page image verbatim. "
    "Maintain clean Markdown structure where appropriate. "
    "Do NOT summarize, answer, or explain the content. "
    "Do NOT include conversational commentary, greetings, or meta-phrases such as 'Here is the transcription:'."
)


class OcrServiceException(Exception):
    """Base exception for OCR service operations."""
    pass


class OcrPageRenderError(OcrServiceException):
    """Raised when PDF pages cannot be rendered into images."""
    pass


class OcrTranscriptionError(OcrServiceException):
    """Raised when OCR transcription fails."""
    pass


def render_pdf_to_images(pdf_bytes: bytes, max_pages: int = MAX_OCR_PAGES) -> List[bytes]:
    """
    Renders PDF pages into JPEG byte buffers using pypdfium2 with Pillow fallback.
    Returns a list of JPEG image bytes (one per page).
    """
    if not pdf_bytes:
        raise OcrPageRenderError("Empty PDF payload provided for OCR rendering.")

    images_bytes: List[bytes] = []

    try:
        pdf = pdfium.PdfDocument(pdf_bytes)
        num_pages = min(len(pdf), max_pages)

        for i in range(num_pages):
            page = pdf[i]
            # scale=1.5 yields ~108 DPI which is sharp for OCR while keeping payload light (~150KB)
            pil_image = page.render(scale=1.5).to_pil()
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")

            buf = io.BytesIO()
            pil_image.save(buf, format="JPEG", quality=85)
            images_bytes.append(buf.getvalue())

        logger.info("Rendered %d pages to images via pypdfium2 for OCR", len(images_bytes))
        return images_bytes
    except Exception as pdfium_err:
        logger.warning("pypdfium2 rendering encountered an issue: %s. Attempting fallback.", pdfium_err)

    # Fallback to pypdf embedded image extraction
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        num_pages = min(len(reader.pages), max_pages)

        for i in range(num_pages):
            page = reader.pages[i]
            if page.images:
                first_img = page.images[0]
                img_data = first_img.data
                try:
                    pil_img = Image.open(io.BytesIO(img_data)).convert("RGB")
                    buf = io.BytesIO()
                    pil_img.save(buf, format="JPEG", quality=85)
                    images_bytes.append(buf.getvalue())
                except Exception:
                    images_bytes.append(img_data)

        if images_bytes:
            logger.info("Extracted %d images via pypdf fallback for OCR", len(images_bytes))
            return images_bytes
    except Exception as fallback_err:
        logger.warning("pypdf fallback also failed: %s", fallback_err)

    if not images_bytes:
        raise OcrPageRenderError("Unable to extract or render page images from scanned PDF.")

    return images_bytes


async def _ocr_single_page(
    client: genai.Client,
    image_bytes: bytes,
    page_num: int,
    total_pages: int,
    models_to_try: List[str],
) -> str:
    """
    Sends a single page image to Gemini Vision with retry/fallback for OCR transcription.
    """
    image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

    for model_name in models_to_try:
        try:
            logger.info("Transcribing OCR page %d/%d with %s...", page_num, total_pages, model_name)
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=[image_part, OCR_TRANSCRIPTION_PROMPT],
                ),
                timeout=30.0,
            )
            if response and response.text:
                return response.text.strip()
        except asyncio.TimeoutError:
            logger.warning("OCR page %d timed out on %s. Trying fallback if available.", page_num, model_name)
            continue
        except Exception as err:
            logger.warning("OCR page %d failed on %s: %s", page_num, model_name, err)
            continue

    logger.warning("Could not transcribe OCR page %d with any configured model.", page_num)
    return ""


async def extract_text_via_ocr(pdf_bytes: bytes, max_pages: int = MAX_OCR_PAGES) -> str:
    """
    High-level OCR extraction pipeline:
    1. Render PDF pages to images.
    2. Transcribe each page image via Gemini Vision.
    3. Concatenate and return full text with page markers.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
        raise OcrTranscriptionError("GEMINI_API_KEY is not configured for OCR service.")

    primary_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    fallback_model = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash")
    models_to_try = [primary_model]
    if fallback_model and fallback_model != primary_model:
        models_to_try.append(fallback_model)

    page_images = render_pdf_to_images(pdf_bytes, max_pages=max_pages)
    if not page_images:
        raise OcrTranscriptionError("No pages could be extracted for OCR.")

    client = genai.Client(api_key=api_key)

    # Process pages in batches of 3 to stay within rate limits while speeding up execution
    batch_size = 3
    transcribed_pages: List[str] = []

    for batch_start in range(0, len(page_images), batch_size):
        batch = page_images[batch_start:batch_start + batch_size]
        tasks = [
            _ocr_single_page(
                client=client,
                image_bytes=img_bytes,
                page_num=batch_start + idx + 1,
                total_pages=len(page_images),
                models_to_try=models_to_try,
            )
            for idx, img_bytes in enumerate(batch)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for idx, res in enumerate(results):
            p_num = batch_start + idx + 1
            if isinstance(res, str) and res.strip():
                transcribed_pages.append(f"--- Page {p_num} ---\n\n{res.strip()}")
            elif isinstance(res, Exception):
                logger.error("OCR batch task exception on page %d: %s", p_num, res)

    combined = "\n\n".join(transcribed_pages).strip()
    if not combined:
        raise OcrTranscriptionError("OCR transcription returned no readable text from this scanned document.")

    logger.info("OCR completed: transcribed %d pages (%d characters)", len(transcribed_pages), len(combined))
    return combined

import io
import re
import logging
from typing import Tuple

from pypdf import PdfReader
from pypdf.errors import PdfReadError

logger = logging.getLogger(__name__)

# Minimum number of non-whitespace characters to consider a document a text-based PDF
MIN_TEXT_THRESHOLD_CHARS = 60


class PdfExtractionError(Exception):
    """Raised when a PDF cannot be read or contains no extractable text."""
    pass


def extract_pdf_content(pdf_bytes: bytes) -> Tuple[str, bool]:
    """
    Attempts plain-text extraction from a PDF byte payload using pypdf.
    Returns:
        (extracted_text, is_scanned):
        - If sufficient text is found (>= MIN_TEXT_THRESHOLD_CHARS), returns (text, False).
        - If little or no text is found, returns ("", True), signaling that OCR is required.
    Raises:
        PdfExtractionError: If the PDF is damaged, password-protected, or empty.
    """
    if not pdf_bytes:
        raise PdfExtractionError("The uploaded PDF is empty.")

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except PdfReadError as err:
        logger.warning("Failed to parse PDF: %s", err)
        raise PdfExtractionError("Unable to read this PDF. The file may be damaged or password-protected.") from err
    except Exception as err:
        logger.error("Unexpected PDF parse error: %s", err, exc_info=True)
        raise PdfExtractionError("Unable to read this PDF.") from err

    if getattr(reader, "is_encrypted", False):
        try:
            decrypted = reader.decrypt("")
            if decrypted == 0:
                raise PdfExtractionError("This PDF is password-protected and cannot be processed.")
        except PdfExtractionError:
            raise
        except Exception:
            raise PdfExtractionError("This PDF is password-protected and cannot be processed.")

    pages_text: list[str] = []
    for page in reader.pages:
        try:
            page_text = page.extract_text() or ""
        except Exception as err:
            logger.warning("Skipping a PDF page that failed text extraction: %s", err)
            page_text = ""
        if page_text.strip():
            pages_text.append(page_text.strip())

    combined = "\n\n".join(pages_text).strip()
    # Check alphanumeric content length to filter out artifact garbage characters
    alphanumeric_chars = re.sub(r"\s+", "", combined)

    if len(alphanumeric_chars) >= MIN_TEXT_THRESHOLD_CHARS:
        logger.info("PDF detected as text-based (%d chars extracted via pypdf)", len(combined))
        return combined, False

    logger.info(
        "PDF detected as scanned/image-based (only %d alphanumeric chars extracted via pypdf; threshold=%d)",
        len(alphanumeric_chars),
        MIN_TEXT_THRESHOLD_CHARS,
    )
    return "", True


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Legacy extraction entry point.
    Extracts plain text using pypdf. Raises PdfExtractionError if scanned/empty.
    """
    text, is_scanned = extract_pdf_content(pdf_bytes)
    if is_scanned or not text:
        raise PdfExtractionError(
            "No extractable text was found in this PDF. Scanned image-only PDFs require OCR processing."
        )
    return text

import os
import logging
import asyncio
from typing import Optional, List
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class GeminiVisionServiceException(Exception):
    """Base exception for Gemini Vision service operations."""
    pass

class GeminiVisionAPIError(GeminiVisionServiceException):
    """Raised when Gemini Vision API returns an unrecoverable error."""
    pass

class GeminiVisionTimeoutError(GeminiVisionServiceException):
    """Raised when Gemini Vision request times out."""
    pass

class GeminiVisionRateLimitError(GeminiVisionServiceException):
    """Raised when Gemini Vision free-tier rate limit or quota is exhausted (429)."""
    pass

class GeminiVisionServiceUnavailableError(GeminiVisionServiceException):
    """Raised when Gemini Vision service is unavailable or under high demand (503)."""
    pass

LEARNING_VISION_PROMPT = (
    "You are a precise document and diagram analysis vision system for an academic learning coach. "
    "Examine the provided image carefully and extract/transcribe all visible text, academic questions, "
    "math equations, diagrams, labels, and study notes as accurately and thoroughly as possible. "
    "Do not answer or explain the question yourself; strictly extract and format all question content, "
    "text, figures, and numbers clearly so an academic AI tutor can analyze and explain it."
)

CODING_VISION_PROMPT = (
    "You are a precise code and stack trace transcription vision system for a software development coach. "
    "Examine the provided image carefully and transcribe all visible source code, terminal commands, "
    "error messages, stack traces, compiler output, line numbers, and IDE UI text. "
    "Preserve exact formatting, variable names, indentation, syntax, and punctuation where possible. "
    "Do not attempt to fix or debug the issue yourself; strictly extract and structure the exact code and "
    "error details so a coding coach can analyze and fix it."
)

async def analyze_image(image_bytes: bytes, mime_type: str, coach_type: str = "learning") -> str:
    """
    Analyzes an image using Gemini Vision API with native async support and automatic
    model fallback (gemini-3.6-flash -> gemini-3.5-flash) for maximum demo resilience.
    Surfaces specific errors (429 rate limits, 503 demand spikes, timeouts) quickly.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
        logger.error("GEMINI_API_KEY is missing or unconfigured.")
        raise GeminiVisionAPIError("Gemini API key is not configured.")

    primary_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    fallback_model = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash")

    # Order of models to try
    models_to_try: List[str] = [primary_model]
    if fallback_model and fallback_model != primary_model:
        models_to_try.append(fallback_model)

    prompt = CODING_VISION_PROMPT if coach_type == "coding" else LEARNING_VISION_PROMPT

    client = genai.Client(api_key=api_key)
    image_part = types.Part.from_bytes(
        data=image_bytes,
        mime_type=mime_type,
    )

    per_attempt_timeout = 25.0  # Safe timeout giving vision models room while failing fast
    last_err: Optional[Exception] = None

    for model_index, model_name in enumerate(models_to_try):
        logger.info(
            "Calling Gemini Vision API (model: %s [%d/%d], coach_type: %s, timeout: %.1fs)...",
            model_name, model_index + 1, len(models_to_try), coach_type, per_attempt_timeout
        )

        try:
            # Use native async method with true cancellation on timeout
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=[image_part, prompt]
                ),
                timeout=per_attempt_timeout
            )

            if not response or not response.text:
                logger.warning("Gemini Vision model %s returned empty text response.", model_name)
                raise GeminiVisionAPIError("Unable to extract text from image.")

            extracted_text = response.text.strip()
            logger.info(
                "Successfully extracted %d characters from image via Gemini Vision (%s).",
                len(extracted_text), model_name
            )
            return extracted_text

        except asyncio.TimeoutError:
            logger.warning("Gemini Vision request to %s timed out after %.1fs.", model_name, per_attempt_timeout)
            last_err = GeminiVisionTimeoutError("Image analysis timed out. Please try again with a clearer or smaller image.")
            # Try fallback model if available
            continue

        except GeminiVisionServiceException as gse:
            raise gse

        except Exception as err:
            err_str = str(err)
            logger.warning("Gemini Vision call to %s failed: %s", model_name, err_str)

            # Classify specific error scenarios
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                last_err = GeminiVisionRateLimitError(
                    "AI image service is temporarily busy (rate limit reached). Please wait a moment and try again."
                )
                # Try fallback model if available
                continue
            elif "503" in err_str or "UNAVAILABLE" in err_str or "high demand" in err_str.lower():
                last_err = GeminiVisionServiceUnavailableError(
                    "AI image service is currently experiencing high demand. Please try again in a moment."
                )
                # Brief pause before fallback attempt
                await asyncio.sleep(1.0)
                continue
            else:
                last_err = GeminiVisionAPIError(f"Unable to analyze image: {err_str}")
                continue

    # If all models failed, raise the most descriptive exception
    if isinstance(last_err, GeminiVisionServiceException):
        raise last_err
    raise GeminiVisionAPIError(f"Unable to analyze image: {str(last_err)}")

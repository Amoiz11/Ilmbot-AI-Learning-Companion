import os
import logging
from typing import List, Optional

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Locked for all Phase 7C embeddings so future cosine search is not mixed-dimension.
EMBEDDING_DIMENSION = 768
DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"
EMBED_BATCH_SIZE = 16


class EmbeddingServiceError(Exception):
    """Raised when embedding generation cannot produce a valid vector."""


def get_embedding_dimension() -> int:
    raw = os.getenv("GEMINI_EMBEDDING_DIMENSION", str(EMBEDDING_DIMENSION)).strip()
    try:
        dim = int(raw)
    except ValueError:
        dim = EMBEDDING_DIMENSION
    if dim != EMBEDDING_DIMENSION:
        logger.warning(
            "GEMINI_EMBEDDING_DIMENSION=%s ignored; Phase 7C is locked to %d.",
            raw,
            EMBEDDING_DIMENSION,
        )
    return EMBEDDING_DIMENSION


def _embedding_model() -> str:
    return os.getenv("GEMINI_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL).strip() or DEFAULT_EMBEDDING_MODEL


def _validate_vector(values: Optional[List[float]], expected_dim: int) -> List[float]:
    if not values or len(values) != expected_dim:
        raise EmbeddingServiceError(
            f"Embedding dimension mismatch: expected {expected_dim}, got {0 if not values else len(values)}."
        )
    return [float(v) for v in values]


async def embed_texts(texts: List[str]) -> List[Optional[List[float]]]:
    """
    Embed each string in order. Failed items are None (caller must leave DB NULL).
    Only the provided texts are sent to the API — never a full-corpus re-embed.
    """
    if not texts:
        return []

    expected_dim = get_embedding_dimension()
    results: List[Optional[List[float]]] = [None] * len(texts)

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_key_here":
        logger.error("GEMINI_API_KEY is missing; document chunks will remain unembedded.")
        return results

    model = _embedding_model()
    client = genai.Client(api_key=api_key)

    for start in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[start : start + EMBED_BATCH_SIZE]
        batch_ok = False
        try:
            response = await client.aio.models.embed_content(
                model=model,
                contents=batch,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=expected_dim,
                ),
            )
            embeddings = response.embeddings or []
            if len(embeddings) == len(batch):
                for offset, item in enumerate(embeddings):
                    try:
                        results[start + offset] = _validate_vector(item.values, expected_dim)
                    except EmbeddingServiceError as err:
                        logger.error("Invalid embedding for chunk offset %s: %s", start + offset, err)
                batch_ok = True
            else:
                logger.error(
                    "Embedding batch size mismatch: sent %d texts, received %d embeddings.",
                    len(batch),
                    len(embeddings),
                )
        except Exception as err:
            logger.error("Batch embedding failed at offset %s: %s", start, err, exc_info=True)

        if batch_ok:
            continue

        for offset, text in enumerate(batch):
            idx = start + offset
            try:
                response = await client.aio.models.embed_content(
                    model=model,
                    contents=text,
                    config=types.EmbedContentConfig(
                        task_type="RETRIEVAL_DOCUMENT",
                        output_dimensionality=expected_dim,
                    ),
                )
                embeddings = response.embeddings or []
                if not embeddings:
                    raise EmbeddingServiceError("Gemini returned no embedding for this chunk.")
                results[idx] = _validate_vector(embeddings[0].values, expected_dim)
            except Exception as err:
                logger.error("Embedding failed for chunk index %s: %s", idx, err, exc_info=True)
                results[idx] = None

    return results


async def embed_query(text: str) -> Optional[List[float]]:
    """
    Embed a single search query with RETRIEVAL_QUERY (same model/dim as document chunks).
    Returns None on failure so callers can fall back to non-RAG behavior.
    """
    if not text or not text.strip():
        return None

    expected_dim = get_embedding_dimension()
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_key_here":
        logger.error("GEMINI_API_KEY is missing; query embedding skipped.")
        return None

    try:
        client = genai.Client(api_key=api_key)
        response = await client.aio.models.embed_content(
            model=_embedding_model(),
            contents=text.strip(),
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=expected_dim,
            ),
        )
        embeddings = response.embeddings or []
        if not embeddings:
            raise EmbeddingServiceError("Gemini returned no query embedding.")
        return _validate_vector(embeddings[0].values, expected_dim)
    except Exception as err:
        logger.error("Query embedding failed: %s", err, exc_info=True)
        return None

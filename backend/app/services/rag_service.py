import logging
import os
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentChunk
from app.services.embedding_service import embed_query

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 5
DEFAULT_MIN_COSINE_SIMILARITY = 0.55


def _min_cosine_similarity() -> float:
    raw = os.getenv("RAG_MIN_COSINE_SIMILARITY", str(DEFAULT_MIN_COSINE_SIMILARITY)).strip()
    try:
        value = float(raw)
    except ValueError:
        return DEFAULT_MIN_COSINE_SIMILARITY
    if value < 0.0 or value > 1.0:
        return DEFAULT_MIN_COSINE_SIMILARITY
    return value


def format_document_context(chunks: List[Any]) -> str:
    if not chunks:
        return ""
    parts = ["DOCUMENT CONTEXT:"]
    for index, item in enumerate(chunks, start=1):
        content = item["content"] if isinstance(item, dict) else str(item)
        filename = item.get("filename") if isinstance(item, dict) else None
        chunk_idx = item.get("chunk_index") if isinstance(item, dict) else None
        if filename:
            section_label = f" (Section {chunk_idx + 1})" if chunk_idx is not None else ""
            parts.append(f"[Document: {filename}{section_label}]")
        else:
            parts.append(f"[Chunk {index}]")
        parts.append(content.strip())
        parts.append("")
    parts.append(
        "Use the document context above to answer the student's question when it is relevant. "
        "If the excerpts do not cover the question, answer with your usual tutoring approach."
    )
    return "\n".join(parts).strip()


def _make_chunk_item(content: str, chunk_index: int, doc_id: UUID, filename: str) -> dict:
    clean_content = (content or "").strip()
    excerpt = clean_content[:200] + ("..." if len(clean_content) > 200 else "")
    return {
        "document_id": doc_id,
        "filename": filename,
        "chunk_index": chunk_index,
        "content": clean_content,
        "excerpt": excerpt,
    }


async def get_relevant_chunks(
    db: Session,
    user_id: UUID,
    query: str,
    top_k: int = DEFAULT_TOP_K,
    document_ids: Optional[List[UUID]] = None,
) -> List[dict]:
    """
    Embed the query and return the user's best-matching document chunks as structured items.
    Empty list if none pass the similarity threshold or retrieval cannot run.
    When document_ids is provided, search is limited to those user-owned documents.
    """
    if not query or not query.strip():
        return []

    k = top_k if isinstance(top_k, int) and top_k > 0 else DEFAULT_TOP_K
    scoped_ids = [doc_id for doc_id in (document_ids or []) if doc_id]

    def _fallback_attached_chunks() -> List[dict]:
        if not scoped_ids:
            return []
        try:
            fallback_rows = (
                db.query(
                    DocumentChunk.content,
                    DocumentChunk.chunk_index,
                    Document.id,
                    Document.filename,
                )
                .join(Document, Document.id == DocumentChunk.document_id)
                .filter(
                    and_(
                        Document.user_id == user_id,
                        Document.id.in_(scoped_ids),
                    )
                )
                .order_by(DocumentChunk.chunk_index.asc())
                .limit(k)
                .all()
            )
        except Exception as err:
            logger.error("Attached-document chunk fallback failed: %s", err, exc_info=True)
            return []
        return [
            _make_chunk_item(row[0], row[1], row[2], row[3])
            for row in fallback_rows
            if row[0]
        ]

    query_vector = await embed_query(query.strip())
    if not query_vector:
        return _fallback_attached_chunks()

    min_similarity = _min_cosine_similarity()
    max_distance = 1.0 - min_similarity
    distance_expr = DocumentChunk.embedding.cosine_distance(query_vector)
    filters = [
        Document.user_id == user_id,
        DocumentChunk.embedding.isnot(None),
    ]
    if scoped_ids:
        filters.append(Document.id.in_(scoped_ids))

    try:
        rows = (
            db.query(
                DocumentChunk.content,
                DocumentChunk.chunk_index,
                Document.id,
                Document.filename,
                distance_expr.label("distance"),
            )
            .join(Document, Document.id == DocumentChunk.document_id)
            .filter(and_(*filters))
            .order_by(distance_expr.asc())
            .limit(k)
            .all()
        )
    except Exception as err:
        logger.error("pgvector similarity search failed: %s", err, exc_info=True)
        return _fallback_attached_chunks()

    matched: List[dict] = []
    for content, chunk_index, doc_id, filename, distance in rows:
        if content is None or distance is None:
            continue
        try:
            dist_val = float(distance)
        except (TypeError, ValueError):
            continue
        # Explicitly attached docs are the retrieval source; keep ranked hits even if below the global threshold.
        if not scoped_ids and dist_val > max_distance:
            continue
        matched.append(_make_chunk_item(content, chunk_index, doc_id, filename))

    if not matched:
        return _fallback_attached_chunks()

    return matched


async def get_document_chunks_for_revision(
    db: Session,
    document_id: UUID,
    user_id: UUID,
    topic_hint: str = "",
    top_k: int = 12,
) -> List[dict]:
    """
    Retrieve chunks for a specific document to use as revision context.
    If embeddings exist and a topic_hint is supplied, uses similarity search
    to return the most relevant top_k chunks. Otherwise returns the first
    top_k chunks in order (covering the whole document breadth).
    Returns an empty list if the document does not belong to the user.
    """
    # Verify ownership
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        logger.warning(
            "get_document_chunks_for_revision: document %s not found for user %s",
            document_id,
            user_id,
        )
        return []

    # If a topic hint is given, try similarity search first
    if topic_hint and topic_hint.strip():
        query_vector = await embed_query(topic_hint.strip())
        if query_vector:
            try:
                distance_expr = DocumentChunk.embedding.cosine_distance(query_vector)
                rows = (
                    db.query(
                        DocumentChunk.content,
                        DocumentChunk.chunk_index,
                        Document.id,
                        Document.filename,
                        distance_expr.label("distance"),
                    )
                    .join(Document, Document.id == DocumentChunk.document_id)
                    .filter(
                        DocumentChunk.document_id == document_id,
                        DocumentChunk.embedding.isnot(None),
                    )
                    .order_by(distance_expr.asc())
                    .limit(top_k)
                    .all()
                )
                if rows:
                    return [
                        _make_chunk_item(r[0], r[1], r[2], r[3])
                        for r in rows
                        if r[0]
                    ]
            except Exception as err:
                logger.warning(
                    "Similarity search failed for document revision, falling back to sequential: %s",
                    err,
                )

    # Fallback: sequential chunks (first top_k, covering broad document content)
    try:
        seq_rows = (
            db.query(
                DocumentChunk.content,
                DocumentChunk.chunk_index,
                Document.id,
                Document.filename,
            )
            .join(Document, Document.id == DocumentChunk.document_id)
            .filter(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index.asc())
            .limit(top_k)
            .all()
        )
        return [_make_chunk_item(r[0], r[1], r[2], r[3]) for r in seq_rows if r[0]]
    except Exception as err:
        logger.error(
            "Sequential chunk fetch failed for document %s: %s", document_id, err, exc_info=True
        )
        return []

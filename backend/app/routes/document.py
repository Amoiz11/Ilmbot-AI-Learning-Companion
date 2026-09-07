import os
import io
import json
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database.connection import get_db
from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentListItem,
    DocumentDeleteResponse,
)
from app.routes.auth_deps import get_current_user
from app.services.pdf_extraction_service import extract_pdf_content, PdfExtractionError
from app.services.ocr_service import extract_text_via_ocr, OcrServiceException
from app.services.chunking_service import chunk_text
from app.services.embedding_service import embed_texts

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_PDF_EXTENSIONS = {".pdf"}
ALLOWED_PDF_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}
MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024  # 20MB


def _documents_upload_dir() -> str:
    backend_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    uploads_dir = os.path.join(backend_root, "uploads", "documents")
    os.makedirs(uploads_dir, exist_ok=True)
    return uploads_dir


async def _save_and_embed_document(
    pdf_bytes: bytes,
    original_name: str,
    extracted_text: str,
    extraction_method: str,
    status_message: str,
    current_user: User,
    db: Session,
) -> DocumentUploadResponse:
    chunks = chunk_text(extracted_text)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No usable text chunks could be created from this PDF.",
        )

    document_id = uuid.uuid4()
    disk_name = f"{document_id.hex}.pdf"
    file_path = os.path.join(_documents_upload_dir(), disk_name)

    try:
        with open(file_path, "wb") as out:
            out.write(pdf_bytes)
    except Exception as err:
        logger.error("Failed writing PDF to disk: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save uploaded document.",
        ) from err

    try:
        doc = Document(
            id=document_id,
            user_id=current_user.id,
            filename=original_name[:255],
        )
        db.add(doc)
        db.flush()

        for index, content in enumerate(chunks):
            db.add(
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=index,
                    content=content,
                    embedding=None,
                )
            )

        db.commit()
        db.refresh(doc)
    except SQLAlchemyError as err:
        db.rollback()
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            logger.warning("Failed to remove PDF after DB error: %s", file_path)
        logger.error("Database error saving document upload: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save document metadata.",
        ) from err

    embeddings_generated = 0
    try:
        stored_chunks = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == doc.id)
            .order_by(DocumentChunk.chunk_index.asc())
            .all()
        )
        vectors = await embed_texts([chunk.content for chunk in stored_chunks])
        for chunk, vector in zip(stored_chunks, vectors):
            if vector is None:
                logger.error(
                    "Leaving embedding NULL for document %s chunk_index=%s",
                    doc.id,
                    chunk.chunk_index,
                )
                continue
            chunk.embedding = vector
            embeddings_generated += 1
        db.commit()
    except Exception as err:
        db.rollback()
        logger.error(
            "Embedding generation failed after document %s was stored; chunks preserved with NULL embeddings: %s",
            doc.id,
            err,
            exc_info=True,
        )
        embeddings_generated = 0

    logger.info(
        "Stored RAG document %s (%s) [%s] with %d chunks (%d embedded) for user %s",
        doc.id,
        original_name,
        extraction_method,
        len(chunks),
        embeddings_generated,
        current_user.id,
    )

    return DocumentUploadResponse(
        id=doc.id,
        filename=doc.filename,
        chunkCount=len(chunks),
        uploadedAt=doc.uploaded_at,
        embeddingsGenerated=embeddings_generated,
        extractionMethod=extraction_method,
        statusMessage=status_message,
    )


@router.post("/documents/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    stream: bool = Query(False, description="Whether to stream real-time upload and OCR status updates"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    original_name = file.filename or "document.pdf"
    ext = os.path.splitext(original_name)[1].lower()
    content_type = (file.content_type or "").lower()

    if ext not in ALLOWED_PDF_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF documents are supported.",
        )

    if content_type and content_type not in ALLOWED_PDF_CONTENT_TYPES and content_type != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF documents are supported.",
        )

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF is empty.",
        )
    if len(pdf_bytes) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 20MB limit.",
        )

    if not stream:
        # Standard synchronous-style processing
        try:
            extracted_text, is_scanned = extract_pdf_content(pdf_bytes)
        except PdfExtractionError as err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err

        if is_scanned:
            try:
                extracted_text = await extract_text_via_ocr(pdf_bytes)
            except OcrServiceException as ocr_err:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ocr_err)) from ocr_err
            extraction_method = "ocr"
            status_message = "OCR Complete"
        else:
            extraction_method = "text"
            status_message = "Text PDF detected"

        return await _save_and_embed_document(
            pdf_bytes=pdf_bytes,
            original_name=original_name,
            extracted_text=extracted_text,
            extraction_method=extraction_method,
            status_message=status_message,
            current_user=current_user,
            db=db,
        )

    # Streaming mode: yield status transitions as NDJSON
    async def event_generator():
        try:
            extracted_text, is_scanned = extract_pdf_content(pdf_bytes)
            if is_scanned:
                yield json.dumps({"stage": "ocr_processing", "status": "OCR Processing PDF"}) + "\n"
                extracted_text = await extract_text_via_ocr(pdf_bytes)
                extraction_method = "ocr"
                status_message = "OCR Complete"
            else:
                yield json.dumps({"stage": "text_detected", "status": "Text PDF detected"}) + "\n"
                extraction_method = "text"
                status_message = "Text PDF detected"

            doc_response = await _save_and_embed_document(
                pdf_bytes=pdf_bytes,
                original_name=original_name,
                extracted_text=extracted_text,
                extraction_method=extraction_method,
                status_message=status_message,
                current_user=current_user,
                db=db,
            )

            response_dict = {
                "id": str(doc_response.id),
                "filename": doc_response.filename,
                "chunkCount": doc_response.chunkCount,
                "uploadedAt": doc_response.uploadedAt.isoformat(),
                "embeddingsGenerated": doc_response.embeddingsGenerated,
                "extractionMethod": doc_response.extractionMethod,
                "statusMessage": doc_response.statusMessage,
            }

            yield json.dumps({"stage": "complete", "status": status_message, "data": response_dict}) + "\n"

        except Exception as exc:
            logger.error("Error during streaming PDF upload/OCR: %s", exc, exc_info=True)
            detail = getattr(exc, "detail", str(exc))
            yield json.dumps({"stage": "error", "error": detail}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


@router.get("/documents", response_model=List[DocumentListItem], status_code=status.HTTP_200_OK)
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        rows = (
            db.query(
                Document.id,
                Document.filename,
                Document.uploaded_at,
                func.count(DocumentChunk.id).label("chunk_count"),
            )
            .outerjoin(DocumentChunk, DocumentChunk.document_id == Document.id)
            .filter(Document.user_id == current_user.id)
            .group_by(Document.id, Document.filename, Document.uploaded_at)
            .order_by(Document.uploaded_at.desc())
            .all()
        )
        return [
            DocumentListItem(
                id=row.id,
                filename=row.filename,
                uploaded_at=row.uploaded_at,
                chunk_count=row.chunk_count,
            )
            for row in rows
        ]
    except SQLAlchemyError as err:
        logger.error("Database error listing documents for user %s: %s", current_user.id, err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load documents.",
        )


@router.delete("/documents/{document_id}", response_model=DocumentDeleteResponse, status_code=status.HTTP_200_OK)
def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        doc = (
            db.query(Document)
            .filter(Document.id == document_id, Document.user_id == current_user.id)
            .first()
        )
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )

        disk_name = f"{doc.id.hex}.pdf"
        file_path = os.path.join(_documents_upload_dir(), disk_name)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError as fs_err:
                logger.warning("Could not delete PDF file %s from disk: %s", file_path, fs_err)

        db.delete(doc)
        db.commit()

        logger.info("Deleted document %s for user %s", document_id, current_user.id)
        return DocumentDeleteResponse(
            detail="Document deleted successfully.",
            id=document_id,
        )
    except HTTPException:
        raise
    except SQLAlchemyError as err:
        db.rollback()
        logger.error("Database error deleting document %s: %s", document_id, err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete document.",
        )

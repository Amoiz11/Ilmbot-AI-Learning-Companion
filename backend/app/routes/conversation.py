import os
import uuid
import time
import asyncio
import logging
from datetime import datetime
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

import json
from app.database.connection import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.document import Document
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationWithMessagesResponse,
    MessageCreate,
    MessageResponse,
    DeleteResponse,
    ChatRequest,
    ChatResponse,
    ImageChatResponse,
    CitationMetadata,
)
from app.routes.auth_deps import get_current_user
from app.services import groq_service, gemini_vision_service
from app.services.groq_service import LEARNING_COACH_SYSTEM_PROMPT, CODING_COACH_SYSTEM_PROMPT
from app.services.rag_service import format_document_context, get_relevant_chunks

from pydantic import BaseModel as PydanticBaseModel

logger = logging.getLogger(__name__)

class SwitchCoachRequest(PydanticBaseModel):
    target_coach_type: str

router = APIRouter()

@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        message_for_title = payload.first_message or payload.title
        ai_title = await groq_service.generate_conversation_title(message_for_title)

        new_conv = Conversation(
            user_id=current_user.id,
            coach_type=payload.coach_type,
            title=ai_title,
        )
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        return new_conv
    except SQLAlchemyError as err:
        db.rollback()
        logger.error("Database error creating conversation: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save conversation."
        )

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    coach_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Conversation).filter(
            Conversation.user_id == current_user.id,
            Conversation.messages.any()
        )
        if coach_type:
            query = query.filter(Conversation.coach_type == coach_type)
        conversations = query.order_by(Conversation.updated_at.desc()).all()
        return conversations
    except SQLAlchemyError as err:
        logger.error("Database error fetching conversations: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load conversations."
        )

@router.get("/conversations/{conversation_id}", response_model=ConversationWithMessagesResponse)
def get_conversation_by_id(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation unavailable."
            )
        return conv
    except HTTPException:
        raise
    except SQLAlchemyError as err:
        logger.error("Database error fetching conversation %s: %s", conversation_id, err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Conversation unavailable."
        )

@router.delete("/conversations/{conversation_id}", response_model=DeleteResponse)
def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation unavailable."
            )

        # Cascade-delete any PDF documents that were uploaded within this conversation
        conv_messages = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.role == "user",
            Message.extracted_content.isnot(None),
        ).all()

        doc_ids_to_delete = set()
        for msg in conv_messages:
            try:
                p_data = json.loads(msg.extracted_content)
                did = (
                    p_data.get("pdf", {}).get("documentId")
                    or p_data.get("pdf", {}).get("document_id")
                    or p_data.get("documentId")
                    or p_data.get("document_id")
                )
                if did:
                    doc_ids_to_delete.add(str(did))
            except Exception:
                pass

        if doc_ids_to_delete:
            docs_to_remove = db.query(Document).filter(
                Document.id.in_([UUID(d) for d in doc_ids_to_delete]),
                Document.user_id == current_user.id,
            ).all()

            uploads_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "uploads", "documents",
            )
            for doc in docs_to_remove:
                disk_name = f"{doc.id.hex}.pdf"
                file_path = os.path.join(uploads_dir, disk_name)
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError as fs_err:
                        logger.warning("Could not delete PDF file %s from disk: %s", file_path, fs_err)
                db.delete(doc)

        db.delete(conv)
        db.commit()
        return DeleteResponse(detail="Conversation deleted successfully")
    except HTTPException:
        raise
    except SQLAlchemyError as err:
        db.rollback()
        logger.error("Database error deleting conversation %s: %s", conversation_id, err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to delete conversation."
        )

@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
def update_conversation_title(
    conversation_id: UUID,
    payload: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation unavailable."
            )

        if payload.title is not None:
            clean_title = payload.title.strip()
            if not clean_title or len(clean_title) > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Title must be non-empty and max 100 characters."
                )
            conv.title = clean_title

        if payload.coach_type is not None:
            if payload.coach_type not in ("learning", "coding"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Coach type must be 'learning' or 'coding'."
                )
            conv.coach_type = payload.coach_type

        conv.updated_at = func.now()
        db.commit()
        db.refresh(conv)
        return conv
    except HTTPException:
        raise
    except SQLAlchemyError as err:
        db.rollback()
        logger.error("Database error updating conversation %s: %s", conversation_id, err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update conversation title."
        )

@router.post("/conversations/{conversation_id}/switch-coach", response_model=ConversationResponse)
def switch_coach_conversation(
    conversation_id: UUID,
    payload: SwitchCoachRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Split conversation at the last user message and move it to a new conversation in the target coach."""
    if payload.target_coach_type not in ("learning", "coding"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coach type must be 'learning' or 'coding'.")

    try:
        source_conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        if not source_conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

        # Find the last user message (the one that triggered routing)
        last_user_msg = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.role == "user"
        ).order_by(Message.created_at.desc()).first()

        if not last_user_msg:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user message to move.")

        # Find the assistant response that follows the triggering user message
        last_assistant_msg = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.role == "assistant",
            Message.created_at >= last_user_msg.created_at
        ).order_by(Message.created_at.asc()).first()

        # Create new conversation in destination coach
        title = (last_user_msg.content or "Switched Chat")[:60]
        new_conv = Conversation(
            user_id=current_user.id,
            coach_type=payload.target_coach_type,
            title=title,
        )
        db.add(new_conv)
        db.flush()

        # Move the triggering user message to the new conversation
        last_user_msg.conversation_id = new_conv.id

        # Move its assistant reply if it exists
        if last_assistant_msg:
            last_assistant_msg.conversation_id = new_conv.id

        source_conv.updated_at = func.now()
        new_conv.updated_at = func.now()
        db.commit()
        db.refresh(new_conv)
        return new_conv

    except HTTPException:
        raise
    except SQLAlchemyError as err:
        db.rollback()
        logger.error("Database error during coach switch for conversation %s: %s", conversation_id, err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to switch coach."
        )

@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        conv = db.query(Conversation).filter(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == current_user.id
        ).first()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation unavailable."
            )

        new_msg = Message(
            conversation_id=payload.conversation_id,
            role=payload.role,
            content=payload.content
        )
        db.add(new_msg)
        conv.updated_at = func.now()
        db.commit()
        db.refresh(new_msg)
        return new_msg
    except HTTPException:
        raise
    except SQLAlchemyError as err:
        db.rollback()
        logger.error("Database error storing message: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Message could not be stored."
        )

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
def get_conversation_messages(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation unavailable."
            )

        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc()).all()

        return messages
    except HTTPException:
        raise
    except SQLAlchemyError as err:
        logger.error("Database error fetching messages for conversation %s: %s", conversation_id, err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Conversation unavailable."
        )

# Helper function to process AI chat completion requests via Groq with parallel routing classification
async def _process_chat(
    payload: ChatRequest,
    system_prompt: str,
    coach_type: str,
    current_user: User,
    db: Session
) -> ChatResponse:
    conv = None
    if payload.conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == current_user.id
        ).first()

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation unavailable."
            )

    # 1. If conversation does not exist yet, create it now
    if not conv:
        try:
            ai_title = await groq_service.generate_conversation_title(payload.message)
            conv = Conversation(
                user_id=current_user.id,
                coach_type=coach_type,
                title=ai_title,
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)
        except SQLAlchemyError as err:
            db.rollback()
            logger.error("Database error creating conversation in chat: %s", err, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to save conversation."
            )

    # 2. Save incoming user message (persisting PDF metadata if attached)
    try:
        extracted_content_val = None
        if payload.pdf_attachment:
            extracted_content_val = json.dumps({
                "type": "pdf",
                "pdf": {
                    "filename": payload.pdf_attachment.filename,
                    "fileSize": payload.pdf_attachment.file_size,
                    "documentId": str(payload.pdf_attachment.document_id) if payload.pdf_attachment.document_id else None
                }
            })
        elif payload.document_ids:
            doc = db.query(Document).filter(Document.id.in_(payload.document_ids)).first()
            if doc:
                extracted_content_val = json.dumps({
                    "type": "pdf",
                    "pdf": {
                        "filename": doc.filename,
                        "fileSize": None,
                        "documentId": str(doc.id)
                    }
                })

        user_msg = Message(
            conversation_id=conv.id,
            role="user",
            content=payload.message,
            extracted_content=extracted_content_val
        )
        db.add(user_msg)
        conv.updated_at = func.now()
        db.commit()
        db.refresh(user_msg)
    except SQLAlchemyError as db_err:
        db.rollback()
        logger.error("Database error saving user message: %s", db_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Message could not be stored."
        )

    # 3. Build conversation context (capped to 20 most recent prior messages)
    try:
        prior_msgs = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.id != user_msg.id
        ).order_by(Message.created_at.desc()).limit(20).all()

        prior_msgs.reverse()

        context_messages = [{"role": "system", "content": system_prompt}]
        for pm in prior_msgs:
            context_messages.append({"role": pm.role, "content": pm.content})

        groq_user_content = payload.message
        citations = []
        retrieved_chunks = []
        routing_task = None

        effective_doc_ids = list(payload.document_ids or [])
        if payload.pdf_attachment and payload.pdf_attachment.document_id:
            if payload.pdf_attachment.document_id not in effective_doc_ids:
                effective_doc_ids.append(payload.pdf_attachment.document_id)

        if conv and conv.id:
            prior_doc_msgs = db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.role == "user",
                Message.extracted_content.isnot(None)
            ).all()
            for msg in prior_doc_msgs:
                if not msg.extracted_content:
                    continue
                try:
                    p_data = json.loads(msg.extracted_content)
                    did = (
                        p_data.get("pdf", {}).get("documentId")
                        or p_data.get("pdf", {}).get("document_id")
                        or p_data.get("documentId")
                        or p_data.get("document_id")
                    )
                    if did:
                        u_did = UUID(str(did))
                        if u_did not in effective_doc_ids:
                            effective_doc_ids.append(u_did)
                except Exception:
                    pass

        if effective_doc_ids:
            try:
                retrieved_chunks = await get_relevant_chunks(
                    db=db,
                    user_id=current_user.id,
                    query=payload.message,
                    top_k=5,
                    document_ids=effective_doc_ids,
                )
            except Exception as rag_err:
                logger.error("RAG retrieval failed; continuing without documents: %s", rag_err, exc_info=True)
                retrieved_chunks = []
        else:
            retrieved_chunks = []

        if retrieved_chunks:
            groq_user_content = (
                f"{format_document_context(retrieved_chunks)}\n\n"
                f"User question:\n{payload.message}"
            )
            citations = [
                CitationMetadata(
                    document_id=c["document_id"],
                    filename=c["filename"],
                    chunk_index=c["chunk_index"],
                    excerpt=c["excerpt"],
                )
                for c in retrieved_chunks
            ]
            if coach_type == "learning":
                # Hybrid PDF routing decision: retrieved PDF chunks + query + classifier
                routing_task = asyncio.create_task(
                    groq_service.evaluate_pdf_coding_intent(
                        user_query=payload.message,
                        retrieved_chunk_texts=[c.get("content") or c.get("excerpt", "") for c in retrieved_chunks]
                    )
                )
            else:
                routing_task = asyncio.create_task(
                    groq_service.classify_routing(coach_type="coding", user_message=payload.message)
                )
        else:
            routing_task = asyncio.create_task(
                groq_service.classify_routing(coach_type=coach_type, user_message=payload.message)
            )

        context_messages.append({"role": "user", "content": groq_user_content})
    except SQLAlchemyError as db_err:
        logger.error("Database error loading context messages: %s", db_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate response. Please try again."
        )

    # 4. Call Groq AI Service for main response generation
    try:
        groq_reply = await groq_service.get_groq_response(context_messages)
    except groq_service.GroqRateLimitError as rle:
        logger.warning("Groq rate limit: %s", rle)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI service is temporarily busy. Please try again shortly."
        )
    except groq_service.GroqTimeoutError as te:
        logger.warning("Groq timeout: %s", te)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Response is taking longer than expected. Please try again."
        )
    except (groq_service.GroqAPIError, groq_service.GroqServiceException) as gae:
        logger.error("Groq API error: %s", gae)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate response. Please try again."
        )
    except Exception as err:
        logger.error("Unexpected error calling Groq API: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate response. Please try again."
        )

    # 5. Resolve parallel routing decision
    should_switch = False
    if routing_task:
        try:
            should_switch = await routing_task
        except Exception as r_err:
            logger.warning("Routing task error: %s", r_err)
            should_switch = False

    routing_type = None
    routing_message = None
    if should_switch:
        if coach_type == "learning" and (effective_doc_ids or retrieved_chunks or payload.pdf_attachment):
            routing_type = "coding_pdf"
            routing_message = "This document appears to be programming-related. Continue in Coding Coach?"
        elif coach_type == "learning":
            routing_type = "coding_text"
            routing_message = "This looks like a coding problem. Continue in Coding Coach?"
        elif coach_type == "coding":
            routing_type = "academic_text"
            routing_message = "This looks academic. Continue in Learning Coach?"

    # 6. Save Groq assistant reply to database
    try:
        citations_json = None
        if citations:
            citations_json = json.dumps([
                {
                    "document_id": str(c.document_id),
                    "filename": c.filename,
                    "chunk_index": c.chunk_index,
                    "excerpt": c.excerpt,
                }
                for c in citations
            ])

        assistant_msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content=groq_reply,
            extracted_content=citations_json,
        )
        db.add(assistant_msg)
        conv.updated_at = func.now()
        db.commit()
        db.refresh(assistant_msg)
        return ChatResponse(
            id=assistant_msg.id,
            conversation_id=conv.id,
            role=assistant_msg.role,
            content=assistant_msg.content,
            image_url=assistant_msg.image_url,
            extracted_content=assistant_msg.extracted_content,
            created_at=assistant_msg.created_at,
            suggestRouting=should_switch,
            suggest_routing=should_switch,
            routing_type=routing_type,
            routing_message=routing_message,
            citations=citations if citations else None,
        )
    except SQLAlchemyError as db_err:
        db.rollback()
        logger.error("Database error saving assistant response: %s", db_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Message could not be stored."
        )

@router.post("/learning-chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def learning_chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await _process_chat(
        payload=payload,
        system_prompt=LEARNING_COACH_SYSTEM_PROMPT,
        coach_type="learning",
        current_user=current_user,
        db=db
    )

@router.post("/coding-chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def coding_chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await _process_chat(
        payload=payload,
        system_prompt=CODING_COACH_SYSTEM_PROMPT,
        coach_type="coding",
        current_user=current_user,
        db=db
    )


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB


@router.post("/chat/image", response_model=ImageChatResponse, status_code=status.HTTP_200_OK)
async def chat_image(
    image: UploadFile = File(...),
    message: Optional[str] = Form(None),
    coach_type: str = Form(...),
    conversation_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    clean_coach_type = coach_type.strip().lower() if coach_type else ""
    if clean_coach_type not in ["learning", "coding"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coach type must be either 'learning' or 'coding'."
        )

    # Validate file extension and MIME type
    filename = image.filename or "uploaded_image.png"
    ext = os.path.splitext(filename)[1].lower()
    content_type = (image.content_type or "").lower()

    if ext not in ALLOWED_IMAGE_EXTENSIONS or content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPG, PNG, and WEBP images are supported."
        )

    image_bytes = await image.read()
    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 10MB limit."
        )

    t_pipeline_start = time.perf_counter()

    # 1. Save uploaded image to disk
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "images")
    os.makedirs(uploads_dir, exist_ok=True)
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(uploads_dir, unique_filename)

    try:
        with open(file_path, "wb") as f:
            f.write(image_bytes)
    except Exception as err:
        logger.error("Failed writing image to disk: %s", err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save uploaded image."
        )

    t_disk_save = (time.perf_counter() - t_pipeline_start) * 1000
    image_url = f"/uploads/images/{unique_filename}"

    # 2. Get or create conversation (fast creation without blocking on title generation)
    conv = None
    clean_conv_id = conversation_id.strip() if conversation_id and conversation_id.strip() else None
    title_task = None
    user_caption = message.strip() if message and message.strip() else ""

    if clean_conv_id:
        try:
            parsed_uuid = UUID(clean_conv_id)
            conv = db.query(Conversation).filter(
                Conversation.id == parsed_uuid,
                Conversation.user_id == current_user.id
            ).first()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid conversation ID."
            )

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation unavailable."
            )
    else:
        # Generate initial clean title immediately so Gemini Vision starts without waiting
        initial_title = user_caption[:60] if user_caption else ("Code Question" if clean_coach_type == "coding" else "Image Question")
        message_for_title = user_caption or ("Code Question" if clean_coach_type == "coding" else "Academic Question")
        # Run AI title generation concurrently with image analysis
        title_task = asyncio.create_task(groq_service.generate_conversation_title(message_for_title))

        try:
            conv = Conversation(
                user_id=current_user.id,
                coach_type=clean_coach_type,
                title=initial_title
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)
        except SQLAlchemyError as err:
            db.rollback()
            logger.error("Database error creating conversation for image chat: %s", err, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to save conversation."
            )

    # 3. Store user message initial row
    try:
        user_msg = Message(
            conversation_id=conv.id,
            role="user",
            content=user_caption,
            image_url=image_url
        )
        db.add(user_msg)
        conv.updated_at = func.now()
        db.commit()
        db.refresh(user_msg)
    except SQLAlchemyError as db_err:
        db.rollback()
        logger.error("Database error saving user image message: %s", db_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Message could not be stored."
        )

    # 4. Process image with Gemini Vision API (timed)
    mime_type = content_type or f"image/{ext.lstrip('.')}"
    t_gem_start = time.perf_counter()
    try:
        extracted_content = await gemini_vision_service.analyze_image(
            image_bytes=image_bytes,
            mime_type=mime_type,
            coach_type=clean_coach_type
        )
    except gemini_vision_service.GeminiVisionRateLimitError as rle:
        logger.warning("Gemini Vision rate limit reached: %s", rle)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(rle)
        )
    except gemini_vision_service.GeminiVisionServiceUnavailableError as sue:
        logger.warning("Gemini Vision high demand / unavailable: %s", sue)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(sue)
        )
    except gemini_vision_service.GeminiVisionTimeoutError as te:
        logger.warning("Gemini Vision timeout: %s", te)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(te)
        )
    except gemini_vision_service.GeminiVisionServiceException as ge:
        logger.error("Gemini Vision error: %s", ge)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to analyze image. Please try again."
        )
    t_gemini = time.perf_counter() - t_gem_start

    try:
        user_msg.extracted_content = extracted_content
        db.commit()
        db.refresh(user_msg)
    except SQLAlchemyError as db_err:
        logger.warning("Failed to store extracted_content on user message: %s", db_err)

    # 5. Build conversation context for Groq
    system_prompt = (
        CODING_COACH_SYSTEM_PROMPT if clean_coach_type == "coding" else LEARNING_COACH_SYSTEM_PROMPT
    )

    try:
        prior_msgs = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.id != user_msg.id
        ).order_by(Message.created_at.desc()).limit(20).all()
        prior_msgs.reverse()

        context_messages = [{"role": "system", "content": system_prompt}]
        for pm in prior_msgs:
            context_messages.append({"role": pm.role, "content": pm.content})

        groq_user_prompt = f"[Attached Image Content Extracted by Vision AI]:\n{extracted_content}"
        if user_caption:
            groq_user_prompt += f"\n\n[User Caption/Question]: {user_caption}"

        context_messages.append({"role": "user", "content": groq_user_prompt})
    except SQLAlchemyError as db_err:
        logger.error("Database error loading context messages for image chat: %s", db_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate response. Please try again."
        )

    # 6. Call Groq Service (timed) and evaluate media routing in parallel
    combined_media_text = f"User message: {user_caption}\nExtracted image content: {extracted_content}".strip()
    routing_task = asyncio.create_task(
        groq_service.classify_routing(coach_type=clean_coach_type, user_message=combined_media_text)
    )

    t_groq_start = time.perf_counter()
    try:
        groq_reply = await groq_service.get_groq_response(context_messages)
    except groq_service.GroqRateLimitError as rle:
        logger.warning("Groq rate limit: %s", rle)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI service is temporarily busy. Please try again shortly."
        )
    except groq_service.GroqTimeoutError as te:
        logger.warning("Groq timeout: %s", te)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Response is taking longer than expected. Please try again."
        )
    except (groq_service.GroqAPIError, groq_service.GroqServiceException) as gae:
        logger.error("Groq API error in image flow: %s", gae)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate response. Please try again."
        )
    t_groq = time.perf_counter() - t_groq_start

    # Resolve media routing decision
    should_switch = False
    if routing_task:
        try:
            should_switch = await routing_task
        except Exception as r_err:
            logger.warning("Routing task error in image flow: %s", r_err)
            should_switch = False

    routing_type = None
    routing_message = None
    if should_switch:
        if clean_coach_type == "learning":
            routing_type = "coding_image"
            routing_message = "This looks like a coding problem. Continue in Coding Coach?"
        else:
            routing_type = "academic_image"
            routing_message = "This looks academic. Continue in Learning Coach?"

    # 7. Check if title_task finished and update conv.title
    if title_task:
        try:
            if title_task.done() and not title_task.cancelled() and not title_task.exception():
                smart_title = title_task.result()
                if smart_title:
                    conv.title = smart_title
        except Exception as title_err:
            logger.warning("Error checking title_task: %s", title_err)

    # 8. Save Assistant message row
    try:
        assistant_msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content=groq_reply
        )
        db.add(assistant_msg)
        conv.updated_at = func.now()
        db.commit()
        db.refresh(assistant_msg)

        t_total = time.perf_counter() - t_pipeline_start
        logger.info(
            "[PERF TIMING] /api/chat/image completed in %.2fs | Disk Save: %.1fms | Gemini Vision: %.2fs | Groq LLM: %.2fs",
            t_total, t_disk_save, t_gemini, t_groq
        )

        return {
            "id": assistant_msg.id,
            "conversation_id": conv.id,
            "role": "assistant",
            "content": assistant_msg.content,
            "answer": assistant_msg.content,
            "extractedContent": extracted_content,
            "model": "gemini-vision + groq",
            "created_at": assistant_msg.created_at,
            "suggestRouting": should_switch,
            "suggest_routing": should_switch,
            "routing_type": routing_type,
            "routing_message": routing_message,
            "user_message": {
                "id": user_msg.id,
                "conversation_id": conv.id,
                "role": "user",
                "content": user_msg.content,
                "image_url": user_msg.image_url,
                "extracted_content": user_msg.extracted_content,
                "created_at": user_msg.created_at
            }
        }
    except SQLAlchemyError as db_err:
        db.rollback()
        logger.error("Database error saving assistant response for image chat: %s", db_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Message could not be stored."
        )

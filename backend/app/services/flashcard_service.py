import os
import json
import logging
from uuid import UUID
from typing import List, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message
from app.models.revision_pack import RevisionPack
from app.models.flashcard import Flashcard
from app.models.document import Document
from app.services.rag_service import get_document_chunks_for_revision, format_document_context

logger = logging.getLogger(__name__)

FLASHCARD_SYSTEM_PROMPT = """You are IlmBot Flashcard Generator, an expert educational AI specialized in active recall and spaced repetition.
Your task is to analyze the provided study session and generate exactly 5 high-yield, exam-oriented study flashcards.

CRITICAL: You MUST respond ONLY with a single, valid JSON object matching this exact schema:
{
  "flashcards": [
    {
      "front": "Concise question, definition prompt, formula, or problem statement",
      "back": "Clear, direct answer, explanation, formula breakdown, or solution"
    }
  ]
}

Content Rules:
1. Generate exactly 5 flashcards focusing on the most critical concepts from the session.
2. Front: Prompt, question, formula, or concept name (clear, focused on a single idea).
3. Back: Direct, accurate explanation, definition, or solution that facilitates quick mental recall.
4. Reflect what was actually discussed in the session without fabricated or irrelevant topics.
"""

def _validate_flashcard_data(data: Any) -> bool:
    """Validate that parsed data has a non-empty flashcards list of valid front/back items."""
    if not isinstance(data, dict):
        return False
    
    cards = data.get("flashcards")
    if not isinstance(cards, list) or len(cards) < 1:
        return False

    for c in cards:
        if not isinstance(c, dict):
            return False
        front = c.get("front")
        back = c.get("back")
        if not isinstance(front, str) or not front.strip():
            return False
        if not isinstance(back, str) or not back.strip():
            return False

    return True


async def _call_groq_flashcards_json(prompt_messages: list[dict]) -> dict:
    """Call Groq API with JSON object response format for flashcards."""
    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key or groq_api_key == "your_key_here":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY is not configured in backend/.env file."
        )

    target_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip() or "openai/gpt-oss-120b"
    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": target_model,
        "messages": prompt_messages,
        "temperature": 0.35,
        "response_format": {"type": "json_object"}
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, headers=headers, json=payload)

            if response.status_code == 429:
                logger.warning("Groq API HTTP 429 Rate Limit hit during flashcards generation.")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="AI service rate limit exceeded. Please wait a moment and try again."
                )

            if response.status_code != 200:
                logger.error("Groq API HTTP %s: %s", response.status_code, response.text)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Groq API returned status code {response.status_code}."
                )

            data = response.json()
            content = data["choices"][0]["message"].get("content", "").strip()
            if not content:
                raise ValueError("Empty response from Groq API")

            clean_content = content
            if clean_content.startswith("```"):
                clean_content = clean_content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            parsed = json.loads(clean_content)
            return parsed

    except httpx.TimeoutException:
        logger.warning("Groq API call timed out during flashcard generation.")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI generation request timed out. Please try again."
        )
    except json.JSONDecodeError as jde:
        logger.warning("Failed to decode JSON from Groq flashcard response: %s", jde)
        raise ValueError(f"Invalid JSON returned: {jde}")
    except httpx.RequestError as req_err:
        logger.error("Network error connecting to Groq API: %s", req_err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Network error connecting to AI service: {req_err}"
        )


async def generate_flashcards(db: Session, session_id: UUID, user_id: UUID) -> List[Dict[str, Any]]:
    """
    Generate an AI flashcard deck for an existing study session.
    Verifies ownership, compiles transcript + revision pack context, calls Groq JSON mode,
    deletes previous flashcard rows for this session, saves the new deck, and returns it.
    """
    # 1. Verify ownership of the conversation session
    conv = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user_id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found or access denied."
        )

    # 2. Fetch messages
    messages = db.query(Message).filter(
        Message.conversation_id == session_id
    ).order_by(Message.created_at.asc()).all()

    # Minimum-content guard: Check whether the conversation has substantive material before calling Groq
    user_count = sum(1 for m in messages if m.role == "user")
    total_assistant_chars = sum(len((m.content or "").strip()) for m in messages if m.role == "assistant")
    MIN_ASSISTANT_CONTENT_CHARS = 250

    if user_count < 1 or total_assistant_chars < MIN_ASSISTANT_CONTENT_CHARS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This conversation doesn't have enough content yet to generate flashcards. Try asking a few more questions first."
        )

    # 3. Format study session transcript
    recent_messages = messages[-40:]
    transcript_lines = []
    for msg in recent_messages:
        speaker = "Student" if msg.role == "user" else "Tutor"
        transcript_lines.append(f"{speaker}: {msg.content}")

    transcript = "\n\n".join(transcript_lines)

    # 4. Optional: Incorporate latest revision pack for enhanced flashcard accuracy
    rev_pack = db.query(RevisionPack).filter(
        RevisionPack.session_id == session_id,
        RevisionPack.user_id == user_id
    ).order_by(RevisionPack.created_at.desc()).first()

    extra_context = ""
    if rev_pack:
        concepts_str = ", ".join(
            c if isinstance(c, str) else str(c) for c in (rev_pack.key_concepts or [])
        )
        extra_context = f"\nKey Concepts Already Synthesized: {concepts_str}\nSummary: {rev_pack.summary[:400]}...\n"

    user_prompt = (
        f"Session Title: {conv.title}\n"
        f"Coach Module: {conv.coach_type.capitalize()} Coach\n"
        f"{extra_context}\n"
        f"--- STUDY SESSION TRANSCRIPT ---\n{transcript}\n\n"
        "Generate exactly 5 exam-ready study flashcards in strict JSON format according to your system prompt instructions."
    )

    prompt_messages = [
        {"role": "system", "content": FLASHCARD_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    # 5. Call Groq with retry once
    parsed_result = None
    for attempt in range(2):
        try:
            candidate = await _call_groq_flashcards_json(prompt_messages)
            if _validate_flashcard_data(candidate):
                parsed_result = candidate
                break
            else:
                logger.warning("Flashcard attempt %d validation failed: %s", attempt + 1, candidate)
        except Exception as err:
            logger.warning("Flashcard attempt %d error: %s", attempt + 1, err)
            if attempt == 1:
                if isinstance(err, HTTPException):
                    raise err
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to generate flashcards. Please try again."
                )

    if not parsed_result or not _validate_flashcard_data(parsed_result):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate flashcards with valid structure. Please try again."
        )

    # 6. Delete previous flashcard rows for this session (maintain a single fresh deck)
    db.query(Flashcard).filter(
        Flashcard.session_id == session_id,
        Flashcard.user_id == user_id
    ).delete(synchronize_session=False)

    # 7. Persist new flashcards (strictly cap to 5 cards)
    saved_cards = []
    deck_cards = parsed_result["flashcards"][:5]
    for card in deck_cards:
        fc = Flashcard(
            user_id=user_id,
            session_id=session_id,
            front=card["front"].strip(),
            back=card["back"].strip()
        )
        db.add(fc)
        saved_cards.append(fc)

    db.commit()
    for fc in saved_cards:
        db.refresh(fc)

    logger.info("Successfully saved %d flashcards for session=%s", len(saved_cards), session_id)

    return [
        {
            "id": str(fc.id),
            "front": fc.front,
            "back": fc.back,
            "createdAt": fc.created_at.isoformat()
        }
        for fc in saved_cards
    ]


def get_saved_flashcards(db: Session, session_id: UUID, user_id: UUID) -> List[Dict[str, Any]]:
    """
    Retrieve saved flashcards for a study session.
    Verifies ownership. Returns empty list if none generated yet.
    """
    conv = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user_id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found or access denied."
        )

    cards = db.query(Flashcard).filter(
        Flashcard.session_id == session_id,
        Flashcard.user_id == user_id
    ).order_by(Flashcard.created_at.asc()).all()

    return [
        {
            "id": str(fc.id),
            "front": fc.front,
            "back": fc.back,
            "createdAt": fc.created_at.isoformat()
        }
        for fc in cards
    ]


async def generate_flashcards_from_document(db: Session, document_id: UUID, user_id: UUID) -> List[Dict[str, Any]]:
    """
    Generate AI flashcards grounded in an uploaded PDF document's content.
    Retrieves top document chunks via RAG, builds the standard flashcard prompt,
    and calls Groq. Does NOT persist flashcards to DB (no conversation session_id).
    Returns list of flashcard dicts with front/back.
    """
    # 1. Verify the document exists and belongs to this user
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user_id
    ).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    # 2. Retrieve relevant chunks
    chunks = await get_document_chunks_for_revision(
        db=db,
        document_id=document_id,
        user_id=user_id,
        topic_hint="key concepts definitions terms",
        top_k=8
    )
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No content could be retrieved from this document."
        )

    # 3. Build the prompt from document chunks
    doc_context = format_document_context(chunks)
    user_prompt = (
        f"Document Title: {doc.filename}\n"
        f"Source: Uploaded PDF Document\n\n"
        f"--- DOCUMENT CONTENT (RAG Excerpts) ---\n{doc_context}\n\n"
        "Generate exactly 5 exam-ready study flashcards in strict JSON format according to your system prompt instructions. "
        "Base ALL flashcards strictly on the provided document excerpts above."
    )

    prompt_messages = [
        {"role": "system", "content": FLASHCARD_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    # 4. Call Groq with retry
    parsed_result = None
    for attempt in range(2):
        try:
            candidate = await _call_groq_flashcards_json(prompt_messages)
            if _validate_flashcard_data(candidate):
                parsed_result = candidate
                break
            else:
                logger.warning("Doc flashcard attempt %d validation failed: %s", attempt + 1, candidate)
        except Exception as err:
            logger.warning("Doc flashcard attempt %d error: %s", attempt + 1, err)
            if attempt == 1:
                if isinstance(err, HTTPException):
                    raise err
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to generate flashcards from document. Please try again."
                )

    if not parsed_result or not _validate_flashcard_data(parsed_result):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate valid flashcards from this document. Please try again."
        )

    # Return without persisting (no session_id FK)
    cards = parsed_result["flashcards"][:5]
    logger.info("Generated %d doc flashcards (not persisted) for document=%s", len(cards), document_id)
    return [
        {
            "id": str(document_id) + f"-{idx}",
            "front": card["front"].strip(),
            "back": card["back"].strip(),
            "createdAt": doc.uploaded_at.isoformat() if doc.uploaded_at else ""
        }
        for idx, card in enumerate(cards)
    ]

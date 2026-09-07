import os
import json
import logging
from uuid import UUID
from typing import Optional, Dict, Any, List
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message
from app.models.revision_pack import RevisionPack
from app.models.document import Document
from app.services.groq_service import GroqAPIError, GroqRateLimitError, GroqTimeoutError
from app.services.rag_service import get_document_chunks_for_revision, format_document_context

logger = logging.getLogger(__name__)

REVISION_SYSTEM_PROMPT = """You are IlmBot Smart Revision Tutor, an expert educational AI specialized in exam preparation and academic synthesis.
Your task is to analyze the provided study session transcript between a student and tutor and generate a high-yield, exam-oriented Smart Revision Pack.

CRITICAL: You MUST respond ONLY with a single, valid JSON object matching this exact schema:
{
  "summary": "150-300 words exam-focused summary that is comprehensive yet accessible, synthesizing the key academic/technical ideas discussed in the session.",
  "keyConcepts": [
    "Name of Concept 1",
    "Name of Concept 2",
    "Name of Concept 3"
  ],
  "importantPoints": [
    "Actionable revision takeaway, formula, rule, or principle 1",
    "Actionable revision takeaway, formula, rule, or principle 2",
    "Actionable revision takeaway, formula, rule, or principle 3"
  ],
  "commonMistakes": [
    "Common student error, misconception, or trap related to this topic 1",
    "Common student error, misconception, or trap related to this topic 2",
    "Common student error, misconception, or trap related to this topic 3"
  ]
}

Content Guidelines:
1. summary: Must be 150 to 300 words. Focused on key mechanics, definitions, and applications. Do not use slang or filler words.
2. keyConcepts: Array of 3 to 8 concise major concept names directly relevant to what was explored.
3. importantPoints: Array of 5 to 10 clear, high-yield revision bullet points, formulae, or rules.
4. commonMistakes: Array of 3 to 6 specific pitfalls, false assumptions, or typical exam errors students make on this topic.
"""

def _validate_revision_data(data: Any) -> bool:
    """Validate that parsed data has the four required keys with appropriate types."""
    if not isinstance(data, dict):
        return False
    
    summary = data.get("summary")
    key_concepts = data.get("keyConcepts")
    important_points = data.get("importantPoints")
    common_mistakes = data.get("commonMistakes")

    if not isinstance(summary, str) or len(summary.strip()) < 50:
        return False
    if not isinstance(key_concepts, list) or len(key_concepts) < 1:
        return False
    if not isinstance(important_points, list) or len(important_points) < 1:
        return False
    if not isinstance(common_mistakes, list) or len(common_mistakes) < 1:
        return False
    
    # Ensure items inside lists are strings
    if not all(isinstance(k, str) and k.strip() for k in key_concepts):
        return False
    if not all(isinstance(p, str) and p.strip() for p in important_points):
        return False
    if not all(isinstance(m, str) and m.strip() for m in common_mistakes):
        return False

    return True


async def _call_groq_json_mode(prompt_messages: list[dict]) -> dict:
    """Call Groq API with JSON object response format."""
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
        "temperature": 0.3,
        "response_format": {"type": "json_object"}
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, headers=headers, json=payload)

            if response.status_code == 429:
                logger.warning("Groq API HTTP 429 Rate Limit hit.")
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

            # Remove potential markdown code fences if model enclosed JSON in ```json ... ```
            clean_content = content
            if clean_content.startswith("```"):
                clean_content = clean_content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            parsed = json.loads(clean_content)
            return parsed

    except httpx.TimeoutException:
        logger.warning("Groq API call timed out during smart revision generation.")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI generation request timed out. Please try again."
        )
    except json.JSONDecodeError as jde:
        logger.warning("Failed to decode JSON from Groq response: %s", jde)
        raise ValueError(f"Invalid JSON returned: {jde}")
    except httpx.RequestError as req_err:
        logger.error("Network error connecting to Groq API: %s", req_err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Network error connecting to AI service: {req_err}"
        )


async def generate_smart_revision_pack(db: Session, session_id: UUID, user_id: UUID) -> Dict[str, Any]:
    """
    Generate an AI revision pack for an existing conversation study session.
    Verifies ownership, formats recent messages into transcript, queries Groq in JSON mode,
    validates output structure, saves a new RevisionPack row, and returns it.
    """
    # 1. Verify ownership of the conversation (session)
    conv = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user_id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found or access denied."
        )

    # 2. Fetch conversation messages
    messages = db.query(Message).filter(
        Message.conversation_id == session_id
    ).order_by(Message.created_at.asc()).all()

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate revision material for a session with no messages."
        )

    # 3. Format study session transcript (capped to most recent 40 messages to respect context)
    recent_messages = messages[-40:]
    transcript_lines = []
    for msg in recent_messages:
        speaker = "Student" if msg.role == "user" else "Tutor"
        transcript_lines.append(f"{speaker}: {msg.content}")

    transcript = "\n\n".join(transcript_lines)

    user_prompt = (
        f"Session Title: {conv.title}\n"
        f"Coach Module: {conv.coach_type.capitalize()} Coach\n\n"
        f"--- STUDY SESSION TRANSCRIPT ---\n{transcript}\n\n"
        "Generate the complete Smart Revision Pack in strict JSON format according to your system prompt instructions."
    )

    prompt_messages = [
        {"role": "system", "content": REVISION_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    # 4. Generate with retry once on validation failure
    parsed_result = None
    for attempt in range(2):
        try:
            candidate = await _call_groq_json_mode(prompt_messages)
            if _validate_revision_data(candidate):
                parsed_result = candidate
                break
            else:
                logger.warning("Smart revision attempt %d schema validation failed: %s", attempt + 1, candidate)
        except Exception as err:
            logger.warning("Smart revision attempt %d error: %s", attempt + 1, err)
            if attempt == 1:
                # Re-raise HTTPException directly if already formatted
                if isinstance(err, HTTPException):
                    raise err
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to generate revision pack. Please try again."
                )

    if not parsed_result or not _validate_revision_data(parsed_result):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate revision pack with valid structure. Please try again."
        )

    # 5. Persist to revision_packs table
    new_pack = RevisionPack(
        user_id=user_id,
        session_id=session_id,
        summary=parsed_result["summary"].strip(),
        key_concepts=parsed_result["keyConcepts"],
        important_points=parsed_result["importantPoints"],
        common_mistakes=parsed_result["commonMistakes"]
    )
    db.add(new_pack)
    db.commit()
    db.refresh(new_pack)

    logger.info("Smart revision pack created successfully: id=%s for session=%s", new_pack.id, session_id)

    return {
        "id": str(new_pack.id),
        "sessionId": str(new_pack.session_id),
        "summary": new_pack.summary,
        "keyConcepts": new_pack.key_concepts,
        "importantPoints": new_pack.important_points,
        "commonMistakes": new_pack.common_mistakes,
        "createdAt": new_pack.created_at.isoformat()
    }


def get_latest_revision_pack(db: Session, session_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
    """
    Retrieve the most recently generated revision pack for a given study session.
    Verifies ownership.
    """
    # Verify ownership of the conversation
    conv = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user_id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found or access denied."
        )

    latest_pack = db.query(RevisionPack).filter(
        RevisionPack.session_id == session_id,
        RevisionPack.user_id == user_id
    ).order_by(RevisionPack.created_at.desc()).first()

    if not latest_pack:
        return None

    return {
        "id": str(latest_pack.id),
        "sessionId": str(latest_pack.session_id),
        "summary": latest_pack.summary,
        "keyConcepts": latest_pack.key_concepts,
        "importantPoints": latest_pack.important_points,
        "commonMistakes": latest_pack.common_mistakes,
        "createdAt": latest_pack.created_at.isoformat()
    }


async def generate_revision_from_document(db: Session, document_id: UUID, user_id: UUID) -> Dict[str, Any]:
    """
    Generate an AI revision pack grounded in an uploaded PDF document's content.
    Uses RAG retrieval (get_document_chunks_for_revision) to get the best chunks,
    then calls Groq JSON mode with the same revision system prompt.
    Returns the pack dict WITHOUT persisting to DB (no conversation FK available).
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

    # 2. Retrieve relevant chunks (up to 12 for broad coverage)
    chunks = await get_document_chunks_for_revision(
        db=db,
        document_id=document_id,
        user_id=user_id,
        topic_hint="",  # no topic hint → sequential breadth coverage
        top_k=12
    )
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No text content could be retrieved from this document. Ensure it contains selectable text."
        )

    # 3. Build the prompt using document chunks as context
    doc_context = format_document_context(chunks)
    user_prompt = (
        f"Document Title: {doc.filename}\n"
        f"Source: Uploaded PDF Document\n\n"
        f"--- DOCUMENT CONTENT (RAG Excerpts) ---\n{doc_context}\n\n"
        "Generate the complete Smart Revision Pack in strict JSON format according to your system prompt instructions. "
        "Base ALL content strictly on the provided document excerpts above."
    )

    prompt_messages = [
        {"role": "system", "content": REVISION_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    # 4. Generate with single retry
    parsed_result = None
    for attempt in range(2):
        try:
            candidate = await _call_groq_json_mode(prompt_messages)
            if _validate_revision_data(candidate):
                parsed_result = candidate
                break
            else:
                logger.warning("Doc revision attempt %d schema validation failed: %s", attempt + 1, candidate)
        except Exception as err:
            logger.warning("Doc revision attempt %d error: %s", attempt + 1, err)
            if attempt == 1:
                if isinstance(err, HTTPException):
                    raise err
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to generate revision pack from document. Please try again."
                )

    if not parsed_result or not _validate_revision_data(parsed_result):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate a valid revision pack from this document. Please try again."
        )

    logger.info("Document revision pack generated (not persisted) for document=%s user=%s", document_id, user_id)

    # Return without persisting — no conversation session_id FK available
    return {
        "id": str(document_id),  # use document_id as synthetic id
        "sessionId": str(document_id),
        "documentId": str(document_id),
        "documentFilename": doc.filename,
        "summary": parsed_result["summary"].strip(),
        "keyConcepts": parsed_result["keyConcepts"],
        "importantPoints": parsed_result["importantPoints"],
        "commonMistakes": parsed_result["commonMistakes"],
        "createdAt": doc.uploaded_at.isoformat() if doc.uploaded_at else ""
    }

import os
import asyncio
import json
import logging
import uuid
from uuid import UUID
from typing import List, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.conversation import Conversation
from app.models.message import Message
from app.models.revision_pack import RevisionPack
from app.models.flashcard import Flashcard
from app.models.quiz import QuizSession, QuizAnswer
from app.models.document import Document
from app.services.rag_service import get_document_chunks_for_revision, format_document_context

logger = logging.getLogger(__name__)

QUIZ_SYSTEM_PROMPT = """You are IlmBot Quiz Generator, an expert educational AI specialized in multiple-choice questions (MCQs) for active recall, concept mastery, and exam preparation.
Your task is to analyze the provided study session conversation and generate between 5 to 10 high-yield, exam-grade MCQs.

CRITICAL: You MUST respond ONLY with a single, valid JSON object matching this exact schema:
{
  "questions": [
    {
      "question": "Clear and specific question prompt testing concept understanding, definitions, applications, formula usage, or common mistakes",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correctAnswer": "Exact text of the correct option matching one of the 4 options",
      "explanation": "Educational explanation of why this answer is correct and why other distractors are incorrect"
    }
  ]
}

Content Rules:
1. Generate between 5 and 10 questions depending on the depth and topics covered in the study session.
2. Each question MUST have exactly 4 plausible, distinct options.
3. 'correctAnswer' MUST EXACTLY match one of the 4 strings in 'options'.
4. 'explanation' MUST be instructional and helpful.
5. Cover core conceptual understanding, technical definitions, practical application, and pitfalls discussed in the conversation.
"""

def _validate_quiz_data(data: Any) -> tuple[bool, list[dict]]:
    """Validate that parsed data has 5-10 valid questions with 4 options and valid correctAnswer."""
    if not isinstance(data, dict):
        return False, []
    
    questions = data.get("questions")
    if not isinstance(questions, list) or len(questions) < 1:
        return False, []

    validated_questions = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        q_text = q.get("question")
        options = q.get("options")
        correct_answer = q.get("correctAnswer")
        explanation = q.get("explanation", "")

        if not isinstance(q_text, str) or not q_text.strip():
            continue
        if not isinstance(options, list) or len(options) != 4:
            continue
        # Check all options are non-empty strings
        clean_options = [str(opt).strip() for opt in options]
        if any(not opt for opt in clean_options):
            continue

        if not isinstance(correct_answer, str) or not correct_answer.strip():
            continue

        # Find match for correctAnswer in clean_options
        match_idx = -1
        for idx, opt in enumerate(clean_options):
            if opt.lower() == correct_answer.strip().lower() or opt == correct_answer:
                match_idx = idx
                break

        if match_idx == -1:
            # Fallback: check if correctAnswer is an option letter like "A", "B", "C", "D"
            letter = correct_answer.strip().upper()
            if letter in ["A", "B", "C", "D"]:
                match_idx = ord(letter) - ord("A")
                correct_answer = clean_options[match_idx]
            else:
                continue

        validated_questions.append({
            "question": q_text.strip(),
            "options": clean_options,
            "correctAnswer": clean_options[match_idx],
            "correct": match_idx,
            "explanation": str(explanation).strip() or "Review the core concepts from the session for further context."
        })

    if len(validated_questions) < 3:
        return False, []

    return True, validated_questions


async def _call_groq_quiz_json(prompt_messages: list[dict]) -> dict:
    """Call Groq API with JSON object response format for quiz generation."""
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
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 3000
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code in [413, 429]:
                logger.warning(f"Groq API HTTP {res.status_code} limit hit during quiz generation.")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="AI service rate limit reached. Please wait a few seconds and try again."
                )
            if res.status_code != 200:
                logger.error(f"Groq HTTP error {res.status_code}: {res.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Groq API returned status {res.status_code} during quiz generation."
                )
            data = res.json()
            content = data["choices"][0]["message"]["content"].strip()
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            return json.loads(content)
        except HTTPException:
            raise
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            logger.warning(f"Failed to parse Groq quiz JSON response: {e}")
            raise ValueError("Groq did not return valid JSON.")


def _build_quiz_user_prompt(conversation: Conversation, messages: List[Message], pack: Optional[RevisionPack]) -> str:
    """Build user prompt combining session details, revision pack (if any), and chat messages."""
    lines = [
        f"Topic Title: {conversation.title}",
        f"Coach Module: {'Coding Coach' if conversation.coach_type == 'coding' else 'Learning Coach'}",
        ""
    ]

    if pack:
        lines.append("--- Existing High-Yield Revision Pack Context ---")
        if pack.summary:
            lines.append(f"Summary:\n{pack.summary[:1200]}")
        if pack.key_concepts:
            lines.append("Key Concepts:")
            for kc in pack.key_concepts[:6]:
                if isinstance(kc, dict):
                    lines.append(f"- {kc.get('title', '')}: {str(kc.get('desc', ''))[:200]}")
                else:
                    lines.append(f"- {str(kc)[:200]}")
        if pack.important_points:
            lines.append("Important Points & Rules:")
            for p in pack.important_points[:6]:
                lines.append(f"- {str(p)[:200]}")
        if pack.common_mistakes:
            lines.append("Common Mistakes & Traps:")
            for m in pack.common_mistakes[:5]:
                lines.append(f"- {str(m)[:200]}")
        lines.append("")

    lines.append("--- Conversation Transcript ---")
    # Limit to the most recent 10 messages and truncate long code/text to stay well within Groq TPM limits
    recent_messages = messages[-10:] if len(messages) > 10 else messages
    for m in recent_messages:
        sender = "Student" if m.role == "user" else "Tutor"
        clean_content = m.content[:450] + ("..." if len(m.content) > 450 else "")
        lines.append(f"{sender}: {clean_content}")

    lines.append("")
    lines.append("Generate between 5 to 10 exam-ready multiple-choice questions (4 options each, exactly 1 correct answer) testing the material above.")
    return "\n".join(lines)


async def generate_quiz(db: Session, session_id: UUID, user_id: UUID) -> list[dict]:
    """Generate 5-10 AI multiple choice quiz questions based on session history."""
    # 1. Verify ownership
    conversation = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found or access denied."
        )

    # 2. Gather conversation context
    messages = db.query(Message).filter(
        Message.conversation_id == session_id
    ).order_by(Message.created_at.asc()).all()

    pack = db.query(RevisionPack).filter(
        RevisionPack.session_id == session_id
    ).order_by(desc(RevisionPack.created_at)).first()

    if not messages and not pack:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has no message history or revision content to generate a quiz from."
        )

    user_prompt = _build_quiz_user_prompt(conversation, messages, pack)

    prompt_messages = [
        {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    # 3. Call Groq with JSON Mode (with 1 retry on failure)
    quiz_data = None
    for attempt in range(2):
        try:
            if attempt > 0:
                await asyncio.sleep(2.0)
            raw_json = await _call_groq_quiz_json(prompt_messages)
            is_valid, validated_questions = _validate_quiz_data(raw_json)
            if is_valid and len(validated_questions) >= 3:
                quiz_data = validated_questions
                break
            else:
                logger.warning(f"Quiz validation attempt {attempt + 1} produced insufficient questions.")
        except Exception as e:
            logger.warning(f"Quiz generation attempt {attempt + 1} failed: {e}")
            if attempt == 1:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate valid quiz questions from AI service after retry."
                )

    if not quiz_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate valid quiz questions. Please try again."
        )

    logger.info(f"Successfully generated {len(quiz_data)} quiz questions for session {session_id}")
    return quiz_data


async def _derive_weak_areas_ai(incorrect_items: list[dict], coach_type: str = "learning") -> list[str]:
    """Derive 1-4 specific weak areas / topics needing review based on missed questions."""
    if not incorrect_items:
        return []

    # Fast fallback extractor in case Groq is unavailable
    fallback_areas = []
    for item in incorrect_items[:4]:
        q = item.get("question", "")
        # Clean question into a concise topic candidate
        words = [w for w in q.replace("?", "").replace("What is", "").replace("Why does", "").replace("Which of the following", "").strip().split() if len(w) > 2]
        topic = " ".join(words[:4]).title()
        if topic and topic not in fallback_areas:
            fallback_areas.append(topic)

    groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not groq_api_key or groq_api_key == "your_key_here":
        return fallback_areas[:3]

    target_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip() or "openai/gpt-oss-120b"
    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }

    missed_summary = []
    for item in incorrect_items:
        missed_summary.append({
            "question": item.get("question", ""),
            "missed_answer": item.get("selected_answer", item.get("selectedAnswer", "")),
            "correct_answer": item.get("correct_answer", item.get("correctAnswer", ""))
        })

    prompt_messages = [
        {
            "role": "system",
            "content": "You are a learning diagnostic assistant. Based on the questions a student missed, identify between 1 and 4 concise topic/concept names (2 to 5 words each) representing their specific weak areas. Respond ONLY with a valid JSON object: {\"weakAreas\": [\"Topic 1\", \"Topic 2\"]}"
        },
        {
            "role": "user",
            "content": f"Missed Questions:\n{json.dumps(missed_summary, indent=2)}"
        }
    ]

    payload = {
        "model": target_model,
        "messages": prompt_messages,
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_tokens": 300
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                raw_text = data["choices"][0]["message"]["content"].strip()
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                elif raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()
                content = json.loads(raw_text)
                areas = content.get("weakAreas", [])
                if isinstance(areas, list) and len(areas) > 0:
                    clean = [str(a).strip() for a in areas if str(a).strip()]
                    if clean:
                        return clean[:4]
    except Exception as e:
        logger.warning(f"Error deriving AI weak areas: {e}. Using fallback.")

    return fallback_areas[:3]


async def submit_quiz_result(db: Session, session_id: UUID, user_id: UUID, answers: list[dict]) -> dict:
    """Calculate score, save QuizSession and QuizAnswers to database, and return results with weak areas."""
    # 1. Verify ownership
    conversation = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found or access denied."
        )

    if not answers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit an empty quiz answer list."
        )

    # 2. Score calculation
    total_questions = len(answers)
    score = sum(1 for a in answers if a.get("is_correct") or a.get("isCorrect"))
    percentage = round((score / total_questions) * 100, 1) if total_questions > 0 else 0.0

    # 3. Derive weak areas for missed questions
    incorrect_items = [a for a in answers if not (a.get("is_correct") or a.get("isCorrect"))]
    weak_areas = await _derive_weak_areas_ai(incorrect_items, conversation.coach_type)

    # 4. Save QuizSession row
    quiz_session = QuizSession(
        id=uuid.uuid4(),
        user_id=user_id,
        session_id=session_id,
        score=score,
        total_questions=total_questions,
        percentage=percentage
    )
    db.add(quiz_session)
    db.flush()

    # 5. Save QuizAnswer rows
    for a in answers:
        q_text = a.get("question", "")
        sel_ans = a.get("selected_answer", a.get("selectedAnswer", ""))
        cor_ans = a.get("correct_answer", a.get("correctAnswer", ""))
        is_cor = bool(a.get("is_correct") or a.get("isCorrect"))

        ans_obj = QuizAnswer(
            id=uuid.uuid4(),
            quiz_session_id=quiz_session.id,
            question=q_text,
            selected_answer=sel_ans,
            correct_answer=cor_ans,
            is_correct=is_cor
        )
        db.add(ans_obj)

    db.commit()
    db.refresh(quiz_session)

    logger.info(f"Quiz submitted: user {user_id}, session {session_id}, score {score}/{total_questions} ({percentage}%)")

    return {
        "quizSessionId": str(quiz_session.id),
        "sessionId": str(session_id),
        "score": score,
        "totalQuestions": total_questions,
        "percentage": percentage,
        "weakAreas": weak_areas,
        "createdAt": quiz_session.created_at.isoformat()
    }


def get_quiz_session(db: Session, quiz_id: UUID, user_id: UUID) -> dict:
    """Retrieve saved quiz session details and answers."""
    quiz_session = db.query(QuizSession).filter(
        QuizSession.id == quiz_id,
        QuizSession.user_id == user_id
    ).first()

    if not quiz_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz session not found."
        )

    answers_list = []
    incorrect_items = []
    for a in quiz_session.answers:
        item = {
            "id": str(a.id),
            "question": a.question,
            "selectedAnswer": a.selected_answer,
            "correctAnswer": a.correct_answer,
            "isCorrect": a.is_correct
        }
        answers_list.append(item)
        if not a.is_correct:
            incorrect_items.append(item)

    # Derive concise weak areas from missed questions
    weak_areas = []
    for item in incorrect_items[:4]:
        q = item.get("question", "")
        words = [w for w in q.replace("?", "").replace("What is", "").replace("Why does", "").replace("Which of the following", "").strip().split() if len(w) > 2]
        topic = " ".join(words[:4]).title()
        if topic and topic not in weak_areas:
            weak_areas.append(topic)

    return {
        "id": str(quiz_session.id),
        "sessionId": str(quiz_session.session_id),
        "score": quiz_session.score,
        "totalQuestions": quiz_session.total_questions,
        "percentage": quiz_session.percentage,
        "weakAreas": weak_areas,
        "createdAt": quiz_session.created_at.isoformat(),
        "answers": answers_list
    }


def get_user_analytics(db: Session, user_id: UUID) -> dict:
    """Compute real user analytics using database-level aggregate functions."""
    flashcards_count = db.query(func.count(Flashcard.id)).filter(Flashcard.user_id == user_id).scalar() or 0

    quiz_stats = db.query(
        func.count(QuizSession.id),
        func.avg(QuizSession.percentage),
        func.max(QuizSession.percentage)
    ).filter(QuizSession.user_id == user_id).first()

    quiz_attempts = quiz_stats[0] or 0
    avg_val = quiz_stats[1]
    max_val = quiz_stats[2]

    average_score = round(float(avg_val), 1) if avg_val is not None else 0.0
    best_score = round(float(max_val), 1) if max_val is not None else 0.0

    return {
        "flashcardsGenerated": flashcards_count,
        "quizAttempts": quiz_attempts,
        "averageScore": average_score,
        "bestScore": best_score
    }


async def generate_quiz_from_document(db: Session, document_id: UUID, user_id: UUID) -> list[dict]:
    """
    Generate 5-10 AI MCQ questions grounded in an uploaded PDF document's content.
    Uses RAG chunks as context instead of conversation messages.
    Does NOT persist a QuizSession row — returns questions list only.
    """
    # 1. Verify document ownership
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == user_id
    ).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied."
        )

    # 2. Retrieve top chunks for quiz context
    chunks = await get_document_chunks_for_revision(
        db=db,
        document_id=document_id,
        user_id=user_id,
        topic_hint="important concepts facts definitions",
        top_k=10
    )
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No content could be retrieved from this document."
        )

    # 3. Build quiz prompt from document chunks
    doc_context = format_document_context(chunks)
    lines = [
        f"Topic Title: {doc.filename}",
        f"Source: Uploaded PDF Document",
        "",
        "--- DOCUMENT CONTENT (RAG Excerpts) ---",
        doc_context,
        "",
        "Generate between 5 to 10 exam-ready multiple-choice questions (4 options each, exactly 1 correct answer) "
        "testing the material from the document excerpts above. Base ALL questions strictly on the document content."
    ]
    user_prompt = "\n".join(lines)

    prompt_messages = [
        {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    # 4. Call Groq with retry
    quiz_data = None
    for attempt in range(2):
        try:
            if attempt > 0:
                await asyncio.sleep(2.0)
            raw_json = await _call_groq_quiz_json(prompt_messages)
            is_valid, validated_questions = _validate_quiz_data(raw_json)
            if is_valid and len(validated_questions) >= 3:
                quiz_data = validated_questions
                break
            else:
                logger.warning(f"Doc quiz validation attempt {attempt + 1} produced insufficient questions.")
        except Exception as e:
            logger.warning(f"Doc quiz generation attempt {attempt + 1} failed: {e}")
            if attempt == 1:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate valid quiz questions from document after retry."
                )

    if not quiz_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate valid quiz questions from this document. Please try again."
        )

    logger.info(f"Generated {len(quiz_data)} doc quiz questions for document {document_id}")
    return quiz_data

import logging
from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.models.revision_pack import RevisionPack
from app.models.quiz import QuizSession
from app.routes.auth_deps import get_current_user
from app.schemas.revision import (
    GenerateRevisionRequest,
    RevisionPackResponse,
    GenerateFlashcardsRequest,
    FlashcardDeckResponse
)
from app.services.smart_revision_service import (
    generate_smart_revision_pack,
    get_latest_revision_pack,
    generate_revision_from_document
)
from app.services.flashcard_service import (
    generate_flashcards,
    get_saved_flashcards,
    generate_flashcards_from_document
)
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
    QuizSessionDetailResponse,
    UserAnalyticsResponse
)
from app.services.quiz_service import (
    generate_quiz,
    submit_quiz_result,
    get_quiz_session,
    get_user_analytics,
    generate_quiz_from_document
)

logger = logging.getLogger(__name__)


# ── Request schema for document-sourced revision endpoints ──────────────────
class DocumentRevisionRequest(BaseModel):
    documentId: UUID


router = APIRouter(tags=["revision"])

@router.post("/revision/generate", response_model=RevisionPackResponse, status_code=status.HTTP_201_CREATED)
async def generate_revision(
    request: GenerateRevisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a new AI Smart Revision Pack for an existing conversation session.
    Persists the revision pack in the database and returns the generated content.
    """
    pack = await generate_smart_revision_pack(
        db=db,
        session_id=request.sessionId,
        user_id=current_user.id
    )
    return pack

@router.get("/revision/history")
def get_user_revision_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all revision packs generated for the current user, ordered by creation date descending.
    """
    packs = (
        db.query(RevisionPack)
        .filter(RevisionPack.user_id == current_user.id)
        .order_by(RevisionPack.created_at.desc())
        .all()
    )
    results = []
    for pack in packs:
        title = pack.conversation.title if pack.conversation and pack.conversation.title else "Smart Revision Pack"
        coach_type = pack.conversation.coach_type if pack.conversation and pack.conversation.coach_type else "learning"
        results.append({
            "id": str(pack.id),
            "sessionId": str(pack.session_id),
            "title": title,
            "coachType": coach_type,
            "badgeClass": "badge-coding" if coach_type == "coding" else "badge-learning",
            "module": "Coding Coach" if coach_type == "coding" else "Learning Coach",
            "summary": (pack.summary[:120] + "...") if pack.summary and len(pack.summary) > 120 else (pack.summary or ""),
            "createdAt": pack.created_at.isoformat() if pack.created_at else None
        })
    return results


@router.get("/revision/{session_id}", response_model=RevisionPackResponse)
def get_revision(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch the most recently generated Smart Revision Pack for a given conversation session.
    Returns 404 if no revision pack has been generated yet.
    """
    pack = get_latest_revision_pack(
        db=db,
        session_id=session_id,
        user_id=current_user.id
    )
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No revision pack found for this session."
        )
    return pack

@router.post("/revision/flashcards", response_model=FlashcardDeckResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcards(
    request: GenerateFlashcardsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an AI Flashcard deck for an existing conversation session.
    Replaces any previous flashcard deck for that session and returns the new deck.
    """
    cards = await generate_flashcards(
        db=db,
        session_id=request.sessionId,
        user_id=current_user.id
    )
    return {"flashcards": cards}

@router.get("/revision/flashcards/{session_id}", response_model=FlashcardDeckResponse)
def read_flashcards(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve the current saved flashcard deck for a given conversation session.
    Returns an empty list if no flashcards have been generated yet.
    """
    cards = get_saved_flashcards(
        db=db,
        session_id=session_id,
        user_id=current_user.id
    )
    return {"flashcards": cards}


@router.post("/revision/quiz", response_model=QuizGenerateResponse, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate 5-10 AI-powered multiple choice questions for a given conversation session.
    Does not persist a quiz_session until the student completes and submits the quiz.
    """
    questions = await generate_quiz(
        db=db,
        session_id=request.sessionId,
        user_id=current_user.id
    )
    return {"sessionId": request.sessionId, "questions": questions}


@router.post("/revision/quiz/{session_id}/submit", response_model=QuizSubmitResponse, status_code=status.HTTP_201_CREATED)
async def submit_quiz(
    session_id: UUID,
    request: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit completed quiz answers, save quiz session & answers to Neon database,
    and return calculated score, percentage, and diagnostic weak areas.
    """
    answers_dict = [a.model_dump() for a in request.answers]
    result = await submit_quiz_result(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        answers=answers_dict
    )
    return result


@router.get("/revision/quiz/history")
def get_user_quiz_history(
    limit: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve quiz attempts for the current user, ordered by creation date descending.
    Optionally limited to the most recent N sessions.
    """
    query = (
        db.query(QuizSession)
        .filter(QuizSession.user_id == current_user.id)
        .order_by(QuizSession.created_at.desc())
    )
    if limit is not None and limit > 0:
        query = query.limit(limit)
    quizzes = query.all()
    results = []
    for q in quizzes:
        conv_title = q.conversation.title if q.conversation and q.conversation.title else "Quiz Assessment"
        coach_type = q.conversation.coach_type if q.conversation and q.conversation.coach_type else "learning"
        pct = round(q.percentage, 1)
        passed = pct >= 60.0
        results.append({
            "id": str(q.id),
            "sessionId": str(q.session_id),
            "title": f"{conv_title} Quiz",
            "conversationTitle": conv_title,
            "coachType": coach_type,
            "badgeClass": "badge-coding" if coach_type == "coding" else "badge-learning",
            "module": f"{q.score}/{q.total_questions} ({int(round(pct))}%)",
            "score": q.score,
            "totalQuestions": q.total_questions,
            "percentage": pct,
            "status": "Passed" if passed else "Review Needed",
            "createdAt": q.created_at.isoformat() if q.created_at else None
        })
    return results


@router.get("/revision/quiz/{quiz_id}", response_model=QuizSessionDetailResponse)
def read_quiz_session(
    quiz_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch a previously saved quiz session with question-by-question breakdown.
    """
    return get_quiz_session(
        db=db,
        quiz_id=quiz_id,
        user_id=current_user.id
    )


@router.get("/analytics/profile", response_model=UserAnalyticsResponse)
def read_profile_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve real learning statistics (flashcards generated, quiz attempts, average score, best score).
    """
    return get_user_analytics(db=db, user_id=current_user.id)


# ── Document-Source Smart Revision Endpoints (Phase 7F) ─────────────────────

@router.post("/revision/document/generate", status_code=status.HTTP_200_OK)
async def generate_revision_from_doc(
    request: DocumentRevisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an AI Smart Revision Pack from an uploaded PDF document.
    Uses RAG-retrieved chunks as the knowledge source. Result is NOT persisted
    to the database (no conversation session FK).
    """
    return await generate_revision_from_document(
        db=db,
        document_id=request.documentId,
        user_id=current_user.id
    )


@router.post("/revision/document/flashcards", status_code=status.HTTP_200_OK)
async def create_flashcards_from_doc(
    request: DocumentRevisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI flashcards grounded in an uploaded PDF document's content.
    Returns flashcard list directly without DB persistence.
    """
    cards = await generate_flashcards_from_document(
        db=db,
        document_id=request.documentId,
        user_id=current_user.id
    )
    return {"flashcards": cards}


@router.post("/revision/document/quiz", status_code=status.HTTP_200_OK)
async def create_quiz_from_doc(
    request: DocumentRevisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate 5-10 AI MCQ quiz questions grounded in an uploaded PDF document.
    Returns questions list directly without persisting a QuizSession row.
    """
    questions = await generate_quiz_from_document(
        db=db,
        document_id=request.documentId,
        user_id=current_user.id
    )
    return {"documentId": str(request.documentId), "questions": questions}

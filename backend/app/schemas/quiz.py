from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correctAnswer: str
    correct: int
    explanation: str

class QuizGenerateRequest(BaseModel):
    sessionId: str

class QuizGenerateResponse(BaseModel):
    sessionId: str
    questions: List[QuizQuestion]

class QuizAnswerSubmitItem(BaseModel):
    question: str
    selectedAnswer: str = Field(alias="selected_answer", default="")
    correctAnswer: str = Field(alias="correct_answer", default="")
    isCorrect: bool = Field(alias="is_correct", default=False)

    class Config:
        populate_by_name = True

class QuizSubmitRequest(BaseModel):
    answers: List[QuizAnswerSubmitItem]

class QuizSubmitResponse(BaseModel):
    quizSessionId: str
    sessionId: str
    score: int
    totalQuestions: int
    percentage: float
    weakAreas: List[str] = []
    createdAt: str

class QuizSessionDetailResponse(BaseModel):
    id: str
    sessionId: str
    score: int
    totalQuestions: int
    percentage: float
    weakAreas: List[str] = []
    createdAt: str
    answers: List[dict] = []

class UserAnalyticsResponse(BaseModel):
    flashcardsGenerated: int
    quizAttempts: int
    averageScore: float
    bestScore: float

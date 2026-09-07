from uuid import UUID
from datetime import datetime
from typing import List, Union, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class GenerateRevisionRequest(BaseModel):
    sessionId: UUID = Field(..., description="The conversation ID corresponding to the study session")

    model_config = ConfigDict(populate_by_name=True)

class RevisionPackResponse(BaseModel):
    id: UUID
    sessionId: UUID
    summary: str
    keyConcepts: List[Union[str, Dict[str, Any]]]
    importantPoints: List[str]
    commonMistakes: List[str]
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class GenerateFlashcardsRequest(BaseModel):
    sessionId: UUID = Field(..., description="The conversation ID corresponding to the study session")

    model_config = ConfigDict(populate_by_name=True)

class FlashcardItem(BaseModel):
    id: UUID
    front: str
    back: str
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class FlashcardDeckResponse(BaseModel):
    flashcards: List[FlashcardItem]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

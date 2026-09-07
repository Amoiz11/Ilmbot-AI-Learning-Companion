from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class DocumentUploadResponse(BaseModel):
    id: UUID
    filename: str
    chunkCount: int = Field(..., description="Number of text chunks stored")
    uploadedAt: datetime
    embeddingsGenerated: int = Field(
        0,
        description="Count of chunks that received a stored embedding (failed chunks stay NULL)",
    )
    extractionMethod: str = Field(
        "text",
        description="Extraction method used: 'text' or 'ocr'",
    )
    statusMessage: str = Field(
        "Text PDF detected",
        description="Upload status message (e.g. 'Text PDF detected' or 'OCR Complete')",
    )

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DocumentListItem(BaseModel):
    id: UUID
    filename: str
    uploaded_at: datetime
    chunk_count: int = 0

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DocumentDeleteResponse(BaseModel):
    detail: str
    id: UUID

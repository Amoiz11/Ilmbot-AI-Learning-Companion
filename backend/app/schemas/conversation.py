from uuid import UUID
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class MessageCreate(BaseModel):
    conversation_id: UUID
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)

class CitationMetadata(BaseModel):
    document_id: UUID = Field(..., alias="documentId")
    filename: str
    chunk_index: int = Field(..., alias="chunkIndex")
    excerpt: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    image_url: Optional[str] = None
    extracted_content: Optional[str] = None
    citations: Optional[List[CitationMetadata]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ConversationCreate(BaseModel):
    coach_type: Literal["learning", "coding"]
    title: str = Field(..., min_length=1, max_length=255)
    first_message: Optional[str] = None

class ConversationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    coach_type: Optional[Literal["learning", "coding"]] = None

class ConversationResponse(BaseModel):
    id: UUID
    user_id: UUID
    coach_type: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationWithMessagesResponse(ConversationResponse):
    messages: List[MessageResponse] = []

class DeleteResponse(BaseModel):
    detail: str

class PdfAttachmentMetadata(BaseModel):
    filename: str
    file_size: Optional[str] = Field(None, alias="fileSize")
    document_id: Optional[UUID] = Field(None, alias="documentId")

    model_config = ConfigDict(populate_by_name=True)

class ChatRequest(BaseModel):
    conversation_id: Optional[UUID] = None
    message: str = Field(..., min_length=1)
    document_ids: Optional[List[UUID]] = Field(
        default=None,
        alias="documentIds",
        description="Uploaded document IDs attached to this chat turn",
    )
    pdf_attachment: Optional[PdfAttachmentMetadata] = Field(
        default=None,
        alias="pdfAttachment",
        description="Attached PDF metadata for chat turn display",
    )

    model_config = ConfigDict(populate_by_name=True)

class ChatResponse(BaseModel):
    id: Optional[UUID] = None
    conversation_id: Optional[UUID] = None
    role: str = "assistant"
    content: Optional[str] = ""
    image_url: Optional[str] = None
    extracted_content: Optional[str] = None
    created_at: Optional[datetime] = None
    suggestRouting: bool = False
    suggest_routing: bool = False
    routing_type: Optional[str] = None
    routing_message: Optional[str] = None
    citations: Optional[List[CitationMetadata]] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ImageChatResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: str = "assistant"
    content: str
    answer: str
    extractedContent: str
    model: str = "gemini-vision + groq"
    created_at: datetime
    user_message: Optional[MessageResponse] = None
    suggestRouting: bool = False
    suggest_routing: bool = False
    routing_type: Optional[str] = None
    routing_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

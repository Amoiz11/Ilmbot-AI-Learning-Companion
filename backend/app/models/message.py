import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, CheckConstraint, Index, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    extracted_content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")

    @property
    def citations(self):
        if self.role == "assistant" and self.extracted_content:
            try:
                import json
                data = json.loads(self.extracted_content)
                if isinstance(data, list):
                    return data
            except Exception:
                pass
        return None

    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="check_message_role"),
        Index("ix_messages_conv_created", "conversation_id", text("created_at ASC")),
    )

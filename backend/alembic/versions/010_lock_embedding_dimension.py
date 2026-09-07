"""lock document_chunks.embedding to vector(768) for Phase 7C Gemini embeddings

Revision ID: 010_lock_embedding_dimension
Revises: 009_create_rag_document_tables
Create Date: 2026-09-06 17:45:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "010_lock_embedding_dimension"
down_revision: Union[str, None] = "009_create_rag_document_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    # Existing rows are NULL (Phase 7A/7B). USING keeps nulls; non-null rows must already be 768-d.
    op.execute(
        "ALTER TABLE document_chunks "
        "ALTER COLUMN embedding TYPE vector(768) "
        "USING embedding::vector(768)"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE document_chunks "
        "ALTER COLUMN embedding TYPE vector "
        "USING embedding::vector"
    )

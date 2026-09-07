"""add HNSW vector index on document_chunks.embedding for cosine similarity

Revision ID: 011_add_hnsw_vector_index
Revises: 010_lock_embedding_dimension
Create Date: 2026-09-06 19:35:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "011_add_hnsw_vector_index"
down_revision: Union[str, None] = "010_lock_embedding_dimension"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # HNSW index for cosine distance queries (matches .cosine_distance in pgvector)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw_cosine "
        "ON document_chunks USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding_hnsw_cosine")

"""create flashcards table

Revision ID: 006_create_flashcards_table
Revises: 005_create_revision_packs_table
Create Date: 2026-09-04 03:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '006_create_flashcards_table'
down_revision: Union[str, None] = '005_create_revision_packs_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'flashcards',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('front', sa.Text(), nullable=False),
        sa.Column('back', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_flashcards_id'), 'flashcards', ['id'], unique=False)
    op.create_index(op.f('ix_flashcards_user_id'), 'flashcards', ['user_id'], unique=False)
    op.create_index(op.f('ix_flashcards_session_id'), 'flashcards', ['session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_flashcards_session_id'), table_name='flashcards')
    op.drop_index(op.f('ix_flashcards_user_id'), table_name='flashcards')
    op.drop_index(op.f('ix_flashcards_id'), table_name='flashcards')
    op.drop_table('flashcards')

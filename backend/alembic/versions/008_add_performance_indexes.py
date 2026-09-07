"""add performance composite indexes

Revision ID: 008_add_performance_indexes
Revises: 007_create_quiz_tables
Create Date: 2026-09-05 11:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '008_add_performance_indexes'
down_revision: Union[str, None] = '007_create_quiz_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Composite index on conversations for fast user + coach + updated_at filtering
    op.create_index(
        'ix_conversations_user_coach_updated',
        'conversations',
        ['user_id', 'coach_type', sa.text('updated_at DESC')],
        unique=False
    )

    # 2. Composite index on messages for fast ordered conversation transcript retrieval
    op.create_index(
        'ix_messages_conv_created',
        'messages',
        ['conversation_id', sa.text('created_at ASC')],
        unique=False
    )

    # 3. Composite index on flashcards for fast user + created_at retrieval
    op.create_index(
        'ix_flashcards_user_created',
        'flashcards',
        ['user_id', sa.text('created_at DESC')],
        unique=False
    )

    # 4. Composite index on quiz_sessions for fast analytics & history retrieval
    op.create_index(
        'ix_quiz_sessions_user_created',
        'quiz_sessions',
        ['user_id', sa.text('created_at DESC')],
        unique=False
    )

    # 5. Composite index on revision_packs for fast session + created_at retrieval
    op.create_index(
        'ix_revision_packs_session_created',
        'revision_packs',
        ['session_id', sa.text('created_at DESC')],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_revision_packs_session_created', table_name='revision_packs')
    op.drop_index('ix_quiz_sessions_user_created', table_name='quiz_sessions')
    op.drop_index('ix_flashcards_user_created', table_name='flashcards')
    op.drop_index('ix_messages_conv_created', table_name='messages')
    op.drop_index('ix_conversations_user_coach_updated', table_name='conversations')

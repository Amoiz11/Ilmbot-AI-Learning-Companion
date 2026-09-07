"""create quiz tables

Revision ID: 007_create_quiz_tables
Revises: 006_create_flashcards_table
Create Date: 2026-09-04 04:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '007_create_quiz_tables'
down_revision: Union[str, None] = '006_create_flashcards_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create quiz_sessions table
    op.create_table(
        'quiz_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('total_questions', sa.Integer(), nullable=False),
        sa.Column('percentage', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quiz_sessions_id'), 'quiz_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_quiz_sessions_user_id'), 'quiz_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_quiz_sessions_session_id'), 'quiz_sessions', ['session_id'], unique=False)

    # 2. Create quiz_answers table
    op.create_table(
        'quiz_answers',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('quiz_session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('quiz_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('selected_answer', sa.Text(), nullable=False),
        sa.Column('correct_answer', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quiz_answers_id'), 'quiz_answers', ['id'], unique=False)
    op.create_index(op.f('ix_quiz_answers_quiz_session_id'), 'quiz_answers', ['quiz_session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_quiz_answers_quiz_session_id'), table_name='quiz_answers')
    op.drop_index(op.f('ix_quiz_answers_id'), table_name='quiz_answers')
    op.drop_table('quiz_answers')

    op.drop_index(op.f('ix_quiz_sessions_session_id'), table_name='quiz_sessions')
    op.drop_index(op.f('ix_quiz_sessions_user_id'), table_name='quiz_sessions')
    op.drop_index(op.f('ix_quiz_sessions_id'), table_name='quiz_sessions')
    op.drop_table('quiz_sessions')

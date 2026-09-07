"""create revision_packs table

Revision ID: 005_create_revision_packs_table
Revises: 004_add_image_url
Create Date: 2026-09-04 03:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005_create_revision_packs_table'
down_revision: Union[str, None] = '004_add_image_url'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'revision_packs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('key_concepts', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('important_points', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('common_mistakes', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_revision_packs_id'), 'revision_packs', ['id'], unique=False)
    op.create_index(op.f('ix_revision_packs_user_id'), 'revision_packs', ['user_id'], unique=False)
    op.create_index(op.f('ix_revision_packs_session_id'), 'revision_packs', ['session_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_revision_packs_session_id'), table_name='revision_packs')
    op.drop_index(op.f('ix_revision_packs_user_id'), table_name='revision_packs')
    op.drop_index(op.f('ix_revision_packs_id'), table_name='revision_packs')
    op.drop_table('revision_packs')

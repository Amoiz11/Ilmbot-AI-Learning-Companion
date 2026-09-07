"""add image_url and extracted_content to messages table

Revision ID: 004_add_image_url
Revises: 003_create_chat_tables
Create Date: 2026-09-03 15:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '004_add_image_url'
down_revision: Union[str, None] = '003_create_chat_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('messages', sa.Column('image_url', sa.String(), nullable=True))
    op.add_column('messages', sa.Column('extracted_content', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('messages', 'extracted_content')
    op.drop_column('messages', 'image_url')

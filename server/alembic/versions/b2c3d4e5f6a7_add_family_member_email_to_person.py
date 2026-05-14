"""add family_member_email to person

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-13 23:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'persons',
        sa.Column('family_member_email', sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('persons', 'family_member_email')

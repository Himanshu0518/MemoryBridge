"""add is_family to person

Revision ID: a1b2c3d4e5f6
Revises: 1abb9aeb552d
Create Date: 2026-05-13 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = ('1abb9aeb552d', 'f4d4d48a8091')
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'persons',
        sa.Column('is_family', sa.Boolean(), nullable=True, server_default=sa.text('false')),
    )


def downgrade() -> None:
    op.drop_column('persons', 'is_family')

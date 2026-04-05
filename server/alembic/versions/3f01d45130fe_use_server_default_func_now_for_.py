"""use server_default func_now for timestamps

Revision ID: 3f01d45130fe
Revises: 464f25916a07
Create Date: 2026-04-01 21:08:25.272766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f01d45130fe'
down_revision: Union[str, Sequence[str], None] = '464f25916a07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add server-side DEFAULT now() to all timestamp columns.

    Previously these used Python-side `default=datetime.utcnow` which meant
    the DEFAULT clause was invisible to the database.  Switching to
    `server_default=func.now()` pushes the default into PostgreSQL itself.
    """
    # patients
    op.alter_column("patients", "created_at", server_default=sa.text("now()"))
    op.alter_column("patients", "updated_at", server_default=sa.text("now()"))

    # persons
    op.alter_column("persons", "first_seen", server_default=sa.text("now()"))
    op.alter_column("persons", "last_seen", server_default=sa.text("now()"))

    # conversations
    op.alter_column("conversations", "started_at", server_default=sa.text("now()"))

    # transcripts
    op.alter_column("transcripts", "timestamp", server_default=sa.text("now()"))

    # summaries
    op.alter_column("summaries", "generated_at", server_default=sa.text("now()"))


def downgrade() -> None:
    """Remove server-side DEFAULT from timestamp columns."""
    op.alter_column("summaries", "generated_at", server_default=None)
    op.alter_column("transcripts", "timestamp", server_default=None)
    op.alter_column("conversations", "started_at", server_default=None)
    op.alter_column("persons", "last_seen", server_default=None)
    op.alter_column("persons", "first_seen", server_default=None)
    op.alter_column("patients", "updated_at", server_default=None)
    op.alter_column("patients", "created_at", server_default=None)

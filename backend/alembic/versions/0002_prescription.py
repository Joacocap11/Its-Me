"""Atributo predefinido de graduación de anteojos

Revision ID: 0002
Revises: 0001
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "INSERT INTO attributes (key, name, data_type, region, history_enabled, builtin, sort_order) "
            "SELECT 'eyeglass_prescription', 'Graduación de anteojos', 'prescription', 'eyes', true, true, "
            "COALESCE(MAX(sort_order), 0) + 1 FROM attributes"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM attributes WHERE key = 'eyeglass_prescription'"))

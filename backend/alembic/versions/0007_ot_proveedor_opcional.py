"""Proveedor opcional en ítems de orden de trabajo

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-02
"""

from pathlib import Path

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0007_ot_proveedor_opcional.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("ALTER TABLE ordenes_trabajo_items ALTER COLUMN proveedor_id SET NOT NULL;")

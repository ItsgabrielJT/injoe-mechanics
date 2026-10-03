"""Bodega en ítems de factura

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-03
"""

from pathlib import Path

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0010_facturas_items_bodega.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_facturas_items_bodega_id;")
    op.execute("ALTER TABLE facturas_items DROP COLUMN IF EXISTS bodega_id;")

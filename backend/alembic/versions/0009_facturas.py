"""Facturas e ítems

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-02
"""

from pathlib import Path

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0009_facturas.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS facturas_items;")
    op.execute("DROP TABLE IF EXISTS facturas;")
    op.execute("DROP TYPE IF EXISTS tipo_receptor_factura;")
    op.execute("DROP TYPE IF EXISTS estado_factura;")

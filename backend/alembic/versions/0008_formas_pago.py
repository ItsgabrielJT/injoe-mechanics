"""Formas de pago SRI y por empresa/punto

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-02
"""

from pathlib import Path

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0008_formas_pago.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS formas_pago;")
    op.execute("DROP TABLE IF EXISTS formas_pago_sri;")

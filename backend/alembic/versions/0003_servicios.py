"""Catálogo de servicios

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-02
"""

from pathlib import Path

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0003_servicios.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS servicios CASCADE;
        DROP TYPE IF EXISTS tipo_impuesto;
        DROP TYPE IF EXISTS categoria_servicio;
        """
    )

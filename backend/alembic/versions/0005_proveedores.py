"""Proveedores, precios de compra y aplica_inventario

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-02
"""

from pathlib import Path

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0005_proveedores.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS servicios_proveedores CASCADE;
        DROP TABLE IF EXISTS productos_proveedores CASCADE;
        DROP TABLE IF EXISTS proveedores CASCADE;
        ALTER TABLE productos DROP COLUMN IF EXISTS aplica_inventario;
        """
    )

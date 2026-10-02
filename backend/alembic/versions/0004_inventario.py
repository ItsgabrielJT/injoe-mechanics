"""Inventario: categorías, bodegas, productos y movimientos

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-02
"""

from pathlib import Path

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0004_inventario.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS movimientos_inventario_lineas CASCADE;
        DROP TABLE IF EXISTS movimientos_inventario CASCADE;
        DROP TABLE IF EXISTS existencias CASCADE;
        DROP TABLE IF EXISTS productos CASCADE;
        DROP TABLE IF EXISTS bodegas CASCADE;
        DROP TABLE IF EXISTS categorias_producto CASCADE;
        DROP TYPE IF EXISTS tipo_ajuste_inventario;
        DROP TYPE IF EXISTS tipo_movimiento_inventario;
        """
    )

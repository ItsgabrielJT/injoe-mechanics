"""Clientes y vehículos

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-02
"""

from pathlib import Path

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0002_clientes_vehiculos.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS vehiculos CASCADE;
        DROP TABLE IF EXISTS clientes CASCADE;
        DROP TYPE IF EXISTS tipo_transmision;
        DROP TYPE IF EXISTS tipo_combustible;
        DROP TYPE IF EXISTS tipo_vehiculo;
        DROP TYPE IF EXISTS tipo_cliente;
        """
    )

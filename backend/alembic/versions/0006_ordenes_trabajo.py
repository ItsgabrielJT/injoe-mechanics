"""Órdenes de trabajo y identificación de cliente opcional

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-02
"""

from pathlib import Path

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0006_ordenes_trabajo.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS ordenes_trabajo_items CASCADE;
        DROP TABLE IF EXISTS ordenes_trabajo CASCADE;
        DROP TYPE IF EXISTS estado_orden_trabajo;
        DROP INDEX IF EXISTS uq_clientes_identificacion_punto;
        ALTER TABLE clientes ALTER COLUMN identificacion SET NOT NULL;
        ALTER TABLE clientes ADD CONSTRAINT uq_clientes_identificacion_punto
            UNIQUE (empresa_id, punto_emision_id, identificacion);
        """
    )

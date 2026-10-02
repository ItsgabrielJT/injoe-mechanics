"""Identidad multi-tenant

Revision ID: 0001
Revises:
Create Date: 2026-10-02
"""

from pathlib import Path

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1].parent / "sql" / "0001_identidad_multitenancy.sql"
    op.execute(sql_path.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS usuarios_puntos_emision CASCADE;
        DROP TABLE IF EXISTS usuarios_roles CASCADE;
        DROP TABLE IF EXISTS roles_permisos CASCADE;
        DROP TABLE IF EXISTS permisos CASCADE;
        DROP TABLE IF EXISTS roles CASCADE;
        DROP TABLE IF EXISTS usuarios CASCADE;
        DROP TABLE IF EXISTS puntos_emision CASCADE;
        DROP TABLE IF EXISTS empresas CASCADE;
        """
    )

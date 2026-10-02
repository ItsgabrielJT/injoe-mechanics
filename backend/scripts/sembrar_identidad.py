"""Copia empresas, puntos y usuarios desde autocare_db hacia mecanicos_db."""

from __future__ import annotations

from pathlib import Path
import sys

import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402

MAPA_ROLES = {
    "ADMIN": "admin",
    "VENDEDOR": "vendedor",
    "CONTADOR": "mecanico",
    "USUARIO": "mecanico",
}

ROLES = [
    ("superadmin", "Superadministrador", "Acceso total de plataforma"),
    ("admin", "Administrador", "Administra la empresa y sus puntos"),
    ("vendedor", "Vendedor", "Opera ventas en su punto"),
    ("mecanico", "Mecánico", "Opera el taller en su punto"),
]

PERMISOS = [
    ("auth:me", "Ver sesión", "Consultar el perfil autenticado"),
    ("auth:cambiar-punto", "Cambiar punto", "Cambiar el punto de emisión activo"),
    ("dashboard:ver", "Ver panel", "Acceder al dashboard"),
]


def upsert_roles(cur) -> dict[str, int]:
    ids: dict[str, int] = {}
    for codigo, nombre, descripcion in ROLES:
        cur.execute(
            """
            INSERT INTO roles (codigo, nombre, descripcion, es_sistema)
            VALUES (%s, %s, %s, TRUE)
            ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
            RETURNING id
            """,
            (codigo, nombre, descripcion),
        )
        ids[codigo] = cur.fetchone()["id"]
    return ids


def upsert_permisos(cur, roles_ids: dict[str, int]) -> None:
    permisos_ids: dict[str, int] = {}
    for codigo, nombre, descripcion in PERMISOS:
        cur.execute(
            """
            INSERT INTO permisos (codigo, nombre, descripcion, es_sistema)
            VALUES (%s, %s, %s, TRUE)
            ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
            RETURNING id
            """,
            (codigo, nombre, descripcion),
        )
        permisos_ids[codigo] = cur.fetchone()["id"]

    for rol_codigo, rol_id in roles_ids.items():
        for permiso_id in permisos_ids.values():
            cur.execute(
                """
                INSERT INTO roles_permisos (rol_id, permiso_id)
                VALUES (%s, %s)
                ON CONFLICT (rol_id, permiso_id) DO NOTHING
                """,
                (rol_id, permiso_id),
            )


def copiar_empresas(origen, destino) -> dict[int, int]:
    origen.execute(
        """
        SELECT id, name, slug, ruc, address, phone, email, sri_id, currency,
               language, timezone, sri_environment, logo_path, is_active,
               is_verified, subscription_plan
        FROM companies
        ORDER BY id
        """
    )
    mapa: dict[int, int] = {}
    for fila in origen.fetchall():
        destino.execute(
            """
            INSERT INTO empresas (
                nombre, slug, ruc, direccion, telefono, correo, sri_id, moneda,
                idioma, zona_horaria, entorno_sri, ruta_logo, activa, verificada,
                plan_suscripcion
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (slug) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                ruc = EXCLUDED.ruc,
                direccion = EXCLUDED.direccion,
                telefono = EXCLUDED.telefono,
                correo = EXCLUDED.correo
            RETURNING id
            """,
            (
                fila["name"],
                fila["slug"],
                fila["ruc"],
                fila["address"],
                fila["phone"],
                fila["email"],
                fila["sri_id"],
                fila["currency"] or "USD",
                fila["language"] or "es",
                fila["timezone"] or "America/Guayaquil",
                fila["sri_environment"] or "1",
                fila["logo_path"],
                fila["is_active"],
                fila["is_verified"],
                fila["subscription_plan"] or "basic",
            ),
        )
        mapa[fila["id"]] = destino.fetchone()["id"]
    return mapa


def copiar_puntos(origen, destino, mapa_empresas: dict[int, int]) -> dict[int, int]:
    origen.execute(
        """
        SELECT id, company_id, point_emission, code, address, invoice_seq,
               credit_note_seq, debit_note_seq, retention_seq, purchase_liq_seq,
               shipping_guide_seq, info
        FROM establishments
        ORDER BY id
        """
    )
    mapa: dict[int, int] = {}
    for fila in origen.fetchall():
        empresa_id = mapa_empresas[fila["company_id"]]
        destino.execute(
            """
            SELECT id FROM puntos_emision
            WHERE empresa_id = %s AND codigo = %s AND punto_emision = %s
            """,
            (empresa_id, fila["code"], fila["point_emission"]),
        )
        existente = destino.fetchone()
        if existente:
            mapa[fila["id"]] = existente["id"]
            continue
        destino.execute(
            """
            INSERT INTO puntos_emision (
                empresa_id, punto_emision, codigo, direccion, factura_seq,
                nota_credito_seq, nota_debito_seq, retencion_seq,
                liquidacion_compra_seq, guia_remision_seq, info
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                empresa_id,
                fila["point_emission"],
                fila["code"],
                fila["address"],
                fila["invoice_seq"] or 0,
                fila["credit_note_seq"] or 0,
                fila["debit_note_seq"] or 0,
                fila["retention_seq"] or 0,
                fila["purchase_liq_seq"] or 0,
                fila["shipping_guide_seq"] or 0,
                (
                    f"Matriz {fila['info'].replace('Default point of emission for ', '')}"
                    if fila["info"] and fila["info"].startswith("Default point of emission for")
                    else fila["info"]
                ),
            ),
        )
        mapa[fila["id"]] = destino.fetchone()["id"]
    return mapa


def asegurar_punto_injoe(destino, mapa_empresas: dict[int, int], mapa_puntos: dict[int, int]) -> int | None:
    destino.execute("SELECT id FROM empresas WHERE slug = %s", ("techcorp",))
    empresa = destino.fetchone()
    if empresa is None:
        return None
    destino.execute(
        """
        SELECT id FROM puntos_emision
        WHERE empresa_id = %s AND punto_emision = %s
        """,
        (empresa["id"], "002"),
    )
    existente = destino.fetchone()
    if existente:
        return existente["id"]
    destino.execute(
        """
        INSERT INTO puntos_emision (
            empresa_id, punto_emision, codigo, direccion, info
        )
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            empresa["id"],
            "002",
            "002",
            "Av. Sucursal 456, Guayaquil",
            "Sucursal Norte INJOE DEV",
        ),
    )
    return destino.fetchone()["id"]


def copiar_usuarios(origen, destino, mapa_empresas: dict[int, int], roles_ids: dict[str, int]) -> dict[int, int]:
    origen.execute(
        """
        SELECT id, company_id, email, username, full_name, hashed_password,
               role, is_active, is_verified
        FROM users
        ORDER BY id
        """
    )
    mapa: dict[int, int] = {}
    for fila in origen.fetchall():
        empresa_id = mapa_empresas[fila["company_id"]]
        destino.execute(
            """
            INSERT INTO usuarios (
                empresa_id, correo, nombre_usuario, nombre_completo,
                contrasena_hash, activo, verificado
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (correo, empresa_id) DO UPDATE SET
                nombre_usuario = EXCLUDED.nombre_usuario,
                nombre_completo = EXCLUDED.nombre_completo,
                contrasena_hash = EXCLUDED.contrasena_hash,
                activo = EXCLUDED.activo
            RETURNING id
            """,
            (
                empresa_id,
                fila["email"],
                fila["username"],
                fila["full_name"],
                fila["hashed_password"],
                fila["is_active"],
                fila["is_verified"],
            ),
        )
        usuario_id = destino.fetchone()["id"]
        mapa[fila["id"]] = usuario_id

        rol_codigo = MAPA_ROLES.get(str(fila["role"]), "mecanico")
        destino.execute(
            """
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES (%s, %s)
            ON CONFLICT (usuario_id, rol_id) DO NOTHING
            """,
            (usuario_id, roles_ids[rol_codigo]),
        )
        if fila["email"] == "admin@techcorp.com":
            destino.execute(
                """
                INSERT INTO usuarios_roles (usuario_id, rol_id)
                VALUES (%s, %s)
                ON CONFLICT (usuario_id, rol_id) DO NOTHING
                """,
                (usuario_id, roles_ids["superadmin"]),
            )
    return mapa


def asignar_puntos(
    origen,
    destino,
    mapa_usuarios: dict[int, int],
    mapa_puntos: dict[int, int],
    punto_injoe_002: int | None,
) -> None:
    origen.execute("SELECT id, company_id, email FROM users ORDER BY id")
    usuarios = origen.fetchall()
    origen.execute("SELECT id, company_id FROM establishments ORDER BY id")
    puntos_por_empresa: dict[int, list[int]] = {}
    for fila in origen.fetchall():
        puntos_por_empresa.setdefault(fila["company_id"], []).append(fila["id"])

    for usuario in usuarios:
        usuario_id = mapa_usuarios[usuario["id"]]
        ids_origen = puntos_por_empresa.get(usuario["company_id"], [])
        destinos = [mapa_puntos[pid] for pid in ids_origen if pid in mapa_puntos]
        if usuario["email"] == "admin@techcorp.com" and punto_injoe_002:
            destinos.append(punto_injoe_002)
        for punto_id in destinos:
            destino.execute(
                """
                INSERT INTO usuarios_puntos_emision (usuario_id, punto_emision_id)
                VALUES (%s, %s)
                ON CONFLICT (usuario_id, punto_emision_id) DO NOTHING
                """,
                (usuario_id, punto_id),
            )


def main() -> None:
    origen_conn = psycopg2.connect(settings.AUTOCARE_DATABASE_URL)
    destino_conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with origen_conn.cursor(cursor_factory=RealDictCursor) as origen, destino_conn.cursor(
            cursor_factory=RealDictCursor
        ) as destino:
            roles_ids = upsert_roles(destino)
            upsert_permisos(destino, roles_ids)
            mapa_empresas = copiar_empresas(origen, destino)
            mapa_puntos = copiar_puntos(origen, destino, mapa_empresas)
            punto_002 = asegurar_punto_injoe(destino, mapa_empresas, mapa_puntos)
            mapa_usuarios = copiar_usuarios(origen, destino, mapa_empresas, roles_ids)
            asignar_puntos(origen, destino, mapa_usuarios, mapa_puntos, punto_002)
            destino_conn.commit()
            print("Identidad sembrada en mecanicos_db")
            print(f"Empresas: {len(mapa_empresas)} | Puntos: {len(mapa_puntos) + (1 if punto_002 else 0)} | Usuarios: {len(mapa_usuarios)}")
    finally:
        origen_conn.close()
        destino_conn.close()


if __name__ == "__main__":
    main()

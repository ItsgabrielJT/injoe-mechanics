from __future__ import annotations

import re

from app.modules.configuracion.domain.entorno_sri import etiqueta_entorno_sri, normalizar_entorno_sri

_AMBIENTE_XML = re.compile(r"<ambiente>\s*([12])\s*</ambiente>", re.IGNORECASE)


def codigo_ambiente_clave(clave_acceso: str | None) -> str | None:
    clave = (clave_acceso or "").strip()
    if len(clave) >= 24 and clave[23] in {"1", "2"}:
        return clave[23]
    return None


def codigo_ambiente_xml(xml_content: str | None) -> str | None:
    if not xml_content:
        return None
    match = _AMBIENTE_XML.search(xml_content)
    return match.group(1) if match else None


def codigo_ambiente_comprobante(
    clave_acceso: str | None = None,
    xml_content: str | None = None,
    fallback: object | None = None,
) -> str:
    return (
        codigo_ambiente_clave(clave_acceso)
        or codigo_ambiente_xml(xml_content)
        or normalizar_entorno_sri(fallback)
        or "1"
    )


def etiqueta_ambiente_comprobante(
    clave_acceso: str | None = None,
    xml_content: str | None = None,
    fallback: object | None = None,
) -> str:
    return etiqueta_entorno_sri(codigo_ambiente_comprobante(clave_acceso, xml_content, fallback))

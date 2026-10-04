from __future__ import annotations

from app.core.config import settings


def _texto(*valores) -> str | None:
    for valor in valores:
        if valor is None:
            continue
        texto = str(valor).strip()
        if texto and texto != "N/A":
            return texto
    return None


def filas_info_adicional(factura, empresa, correo: str | None = None, telefono: str | None = None) -> list[tuple[str, str]]:
    contactanos = " - ".join(
        parte for parte in (_texto(getattr(empresa, "telefono", None)), _texto(getattr(empresa, "correo", None))) if parte
    )
    filas = [
        ("Contactanos", contactanos or "-"),
        ("Correo Cliente", _texto(correo, getattr(factura, "cliente_correo", None)) or "-"),
        ("RUC Proveedor", _texto(settings.PDF_RUC_PROVEEDOR) or "-"),
        ("Teléfonos Cliente", _texto(telefono, getattr(factura, "cliente_telefono", None)) or "-"),
    ]
    extras = [
        ("Notas", _texto(getattr(factura, "notas", None))),
        ("Términos", _texto(getattr(factura, "terminos", None))),
    ]
    return filas + [(nombre, valor) for nombre, valor in extras if valor]


def additional_info_sri(factura, empresa, correo: str | None = None, telefono: str | None = None) -> list[dict[str, str]]:
    return [{"name": nombre, "value": valor} for nombre, valor in filas_info_adicional(factura, empresa, correo, telefono)]

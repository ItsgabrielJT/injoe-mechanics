from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum


class TipoPersona(str, Enum):
    PERSONA_NATURAL = "PERSONA_NATURAL"
    PERSONA_JURIDICA = "PERSONA_JURIDICA"


def identificacion_valida(valor: str) -> bool:
    limpia = valor.strip()
    return limpia.isdigit() and len(limpia) in (10, 13)


def nombre_valido(valor: str) -> bool:
    return 2 <= len(valor.strip()) <= 255


@dataclass
class Proveedor:
    id: int | None
    empresa_id: int
    punto_emision_id: int
    identificacion: str
    nombres: str
    tipo_persona: TipoPersona = TipoPersona.PERSONA_NATURAL
    razon_social: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    correo: str | None = None
    direccion_fiscal: str | None = None
    telefono_fiscal: str | None = None
    correo_fiscal: str | None = None
    notas: str | None = None
    activo: bool = True
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None


@dataclass
class PrecioProveedor:
    id: int | None
    proveedor_id: int
    precio_compra: Decimal
    es_principal: bool = False
    proveedor_nombres: str | None = None
    proveedor_identificacion: str | None = None
    producto_id: int | None = None
    servicio_id: int | None = None
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

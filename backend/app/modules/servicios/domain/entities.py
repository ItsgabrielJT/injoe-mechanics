from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum
import random
import string


class CategoriaServicio(str, Enum):
    CONSULTORIA = "consultoria"
    DESARROLLO = "desarrollo"
    MANTENIMIENTO = "mantenimiento"
    SOPORTE = "soporte"
    CAPACITACION = "capacitacion"
    OTROS = "otros"


class TipoImpuesto(str, Enum):
    CERO = "0"
    CINCO = "5"
    QUINCE = "15"
    NO_OBJETO = "no_objeto"
    EXENTO_IVA = "exento_iva"


NOMBRE_MIN = 2
NOMBRE_MAX = 255
CODIGO_MAX = 20
DESCRIPCION_MAX = 500
PRECIO_MAX = Decimal("99999999.99")
INTENTOS_CODIGO = 20


def generar_codigo_servicio() -> str:
    letras = "".join(random.choices(string.ascii_uppercase, k=4))
    numeros = f"{random.randint(0, 99999):05d}"
    return f"{letras}-{numeros}"


def nombre_valido(valor: str) -> bool:
    return NOMBRE_MIN <= len(valor.strip()) <= NOMBRE_MAX


def precio_valido(valor: Decimal) -> bool:
    return valor > 0 and valor <= PRECIO_MAX


def descripcion_valida(valor: str | None) -> bool:
    if valor is None:
        return True
    return len(valor) <= DESCRIPCION_MAX


def peso_valido(valor: Decimal | None) -> bool:
    if valor is None:
        return True
    return valor >= 0


def codigo_valido(valor: str) -> bool:
    limpio = valor.strip()
    return 1 <= len(limpio) <= CODIGO_MAX


@dataclass
class Servicio:
    id: int | None
    empresa_id: int
    punto_emision_id: int
    codigo: str
    nombre: str
    tipo_impuesto: TipoImpuesto
    precio_venta: Decimal
    descripcion: str | None = None
    categoria: CategoriaServicio | None = None
    aplica_iva: bool = True
    peso: Decimal | None = None
    activo: bool = True
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

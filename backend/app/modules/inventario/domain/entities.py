from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum
import random
import string

NOMBRE_MIN = 2
NOMBRE_MAX = 255
CODIGO_MAX = 20
CODIGO_BARRAS_MAX = 64
DESCRIPCION_MAX = 500
CATEGORIA_NOMBRE_MAX = 120
BODEGA_NOMBRE_MAX = 120
UBICACION_MAX = 255
UNIDAD_MAX = 20
NOTA_MAX = 255
PRECIO_MAX = Decimal("99999999.99")
INTENTOS_CODIGO = 20


class TipoImpuesto(str, Enum):
    CERO = "0"
    CINCO = "5"
    QUINCE = "15"
    NO_OBJETO = "no_objeto"
    EXENTO_IVA = "exento_iva"


class TipoMovimiento(str, Enum):
    INGRESO = "INGRESO"
    SALIDA = "SALIDA"
    AJUSTE = "AJUSTE"
    TRANSFERENCIA = "TRANSFERENCIA"
    STOCK_INICIAL = "STOCK_INICIAL"


class TipoAjuste(str, Enum):
    INGRESO = "INGRESO"
    EGRESO = "EGRESO"


class SeveridadAlerta(str, Enum):
    WARNING = "warning"
    CRITICAL = "critical"


def generar_codigo_lote() -> str:
    letras = "".join(random.choices(string.ascii_uppercase, k=4))
    numeros = f"{random.randint(0, 99999):05d}"
    return f"{letras}-{numeros}"


def nombre_valido(valor: str, minimo: int = NOMBRE_MIN, maximo: int = NOMBRE_MAX) -> bool:
    return minimo <= len(valor.strip()) <= maximo


def codigo_valido(valor: str) -> bool:
    return 1 <= len(valor.strip()) <= CODIGO_MAX


def codigo_barras_valido(valor: str | None) -> bool:
    if valor is None or valor == "":
        return True
    limpio = valor.strip()
    if len(limpio) > CODIGO_BARRAS_MAX:
        return False
    return limpio.replace("-", "").replace("_", "").isalnum()


def descripcion_valida(valor: str | None) -> bool:
    if valor is None:
        return True
    return len(valor) <= DESCRIPCION_MAX


def precio_valido(valor: Decimal) -> bool:
    return valor > 0 and valor <= PRECIO_MAX


def cantidad_valida(valor: Decimal) -> bool:
    return valor > 0


def stock_minimo_valido(valor: Decimal) -> bool:
    return valor >= 0


def tasa_iva(tipo: TipoImpuesto) -> Decimal:
    if tipo == TipoImpuesto.CINCO:
        return Decimal("0.05")
    if tipo == TipoImpuesto.QUINCE:
        return Decimal("0.15")
    return Decimal("0")


@dataclass
class CategoriaProducto:
    id: int | None
    empresa_id: int
    punto_emision_id: int
    nombre: str
    descripcion: str | None = None
    activo: bool = True
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None


@dataclass
class Bodega:
    id: int | None
    empresa_id: int
    punto_emision_id: int
    nombre: str
    ubicacion: str | None = None
    activo: bool = True
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None


@dataclass
class Existencia:
    producto_id: int
    bodega_id: int
    cantidad: Decimal
    bodega_nombre: str | None = None
    actualizado_en: datetime | None = None


@dataclass
class Producto:
    id: int | None
    empresa_id: int
    punto_emision_id: int
    codigo: str
    nombre: str
    categoria_id: int
    precio_venta: Decimal
    tipo_impuesto: TipoImpuesto
    codigo_barras: str | None = None
    descripcion: str | None = None
    categoria_nombre: str | None = None
    aplica_iva: bool = True
    aplica_inventario: bool = True
    stock_minimo: Decimal = Decimal("0")
    stock_maximo: Decimal | None = None
    unidad_medida: str = "UN"
    peso: Decimal | None = None
    activo: bool = True
    stock_total: Decimal = Decimal("0")
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None


@dataclass
class LineaMovimiento:
    producto_id: int
    cantidad: Decimal
    stock_origen_despues: Decimal
    id: int | None = None
    producto_codigo: str | None = None
    producto_nombre: str | None = None
    stock_destino_despues: Decimal | None = None


@dataclass
class MovimientoInventario:
    id: int | None
    empresa_id: int
    punto_emision_id: int
    codigo: str
    tipo: TipoMovimiento
    bodega_id: int
    bodega_nombre: str | None = None
    bodega_destino_id: int | None = None
    bodega_destino_nombre: str | None = None
    tipo_ajuste: TipoAjuste | None = None
    nota: str | None = None
    observacion: str | None = None
    creado_en: datetime | None = None
    lineas: list[LineaMovimiento] = field(default_factory=list)


@dataclass
class AlertaStock:
    producto_id: int
    codigo: str
    nombre: str
    stock_minimo: Decimal
    stock_total: Decimal
    severidad: SeveridadAlerta


@dataclass
class ItemKardex:
    movimiento_id: int
    codigo: str
    tipo: TipoMovimiento
    bodega_id: int
    bodega_nombre: str
    bodega_destino_id: int | None
    bodega_destino_nombre: str | None
    tipo_ajuste: TipoAjuste | None
    cantidad: Decimal
    stock_origen_despues: Decimal
    stock_destino_despues: Decimal | None
    nota: str | None
    creado_en: datetime

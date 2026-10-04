from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from app.modules.inventario.domain.entities import TipoAjuste, TipoImpuesto, TipoMovimiento


@dataclass(frozen=True)
class ContextoTenant:
    empresa_id: int
    punto_emision_id: int


@dataclass(frozen=True)
class CrearCategoriaCommand:
    nombre: str
    descripcion: str | None = None
    activo: bool = True


@dataclass(frozen=True)
class ActualizarCategoriaCommand:
    categoria_id: int
    nombre: str | None = None
    descripcion: str | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class ListarCatalogoQuery:
    page: int = 1
    size: int = 10
    search: str | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class CrearBodegaCommand:
    nombre: str
    ubicacion: str | None = None
    activo: bool = True


@dataclass(frozen=True)
class ActualizarBodegaCommand:
    bodega_id: int
    nombre: str | None = None
    ubicacion: str | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class StockInicialCommand:
    bodega_id: int
    cantidad: Decimal


@dataclass(frozen=True)
class CrearProductoCommand:
    codigo: str
    nombre: str
    categoria_id: int
    precio_venta: Decimal
    tipo_impuesto: TipoImpuesto
    codigo_barras: str | None = None
    descripcion: str | None = None
    aplica_iva: bool = True
    aplica_inventario: bool = True
    stock_minimo: Decimal = Decimal("0")
    stock_maximo: Decimal | None = None
    unidad_medida: str = "UN"
    peso: Decimal | None = None
    activo: bool = True
    stock_inicial: StockInicialCommand | None = None


@dataclass(frozen=True)
class ActualizarProductoCommand:
    producto_id: int
    codigo: str | None = None
    nombre: str | None = None
    categoria_id: int | None = None
    precio_venta: Decimal | None = None
    tipo_impuesto: TipoImpuesto | None = None
    codigo_barras: str | None = None
    descripcion: str | None = None
    aplica_iva: bool | None = None
    aplica_inventario: bool | None = None
    stock_minimo: Decimal | None = None
    stock_maximo: Decimal | None = None
    unidad_medida: str | None = None
    peso: Decimal | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class ListarProductosQuery:
    page: int = 1
    size: int = 10
    search: str | None = None
    categoria_id: int | None = None
    activo: bool | None = None
    aplica_inventario: bool | None = None


@dataclass(frozen=True)
class ItemMovimientoCommand:
    producto_id: int
    cantidad: Decimal


@dataclass(frozen=True)
class RegistrarMovimientoCommand:
    tipo: TipoMovimiento
    bodega_id: int
    items: list[ItemMovimientoCommand]
    bodega_destino_id: int | None = None
    tipo_ajuste: TipoAjuste | None = None
    nota: str | None = None
    observacion: str | None = None


@dataclass(frozen=True)
class ListarMovimientosQuery:
    page: int = 1
    size: int = 10
    producto_ids: list[int] | None = None
    bodega_ids: list[int] | None = None
    tipo: TipoMovimiento | None = None
    fecha_desde: datetime | None = None
    fecha_hasta: datetime | None = None


@dataclass(frozen=True)
class ListarReporteProductosQuery:
    page: int = 1
    size: int = 10
    producto_ids: list[int] | None = None
    bodega_ids: list[int] | None = None
    fecha_desde: datetime | None = None
    fecha_hasta: datetime | None = None

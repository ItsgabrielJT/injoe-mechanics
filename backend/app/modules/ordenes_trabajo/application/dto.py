from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from app.modules.inventario.domain.entities import TipoImpuesto
from app.modules.ordenes_trabajo.domain.entities import EstadoOrden


@dataclass(frozen=True)
class ContextoTenant:
    empresa_id: int
    punto_emision_id: int


@dataclass(frozen=True)
class ItemOrdenCommand:
    cantidad: Decimal
    precio_venta: Decimal
    precio_compra: Decimal
    aplica_iva: bool
    tipo_impuesto: TipoImpuesto
    proveedor_id: int | None = None
    producto_id: int | None = None
    servicio_id: int | None = None
    bodega_id: int | None = None
    descripcion: str | None = None
    codigo: str | None = None


@dataclass(frozen=True)
class GuardarOrdenCommand:
    cliente_id: int
    vehiculo_id: int
    tecnico_id: int
    fecha_inicio: datetime | None = None
    fecha_entrega: datetime | None = None
    kilometraje: Decimal | None = None
    notas_generales: str | None = None
    notas_tecnicas: str | None = None
    items: list[ItemOrdenCommand] = field(default_factory=list)
    orden_id: int | None = None


@dataclass(frozen=True)
class ListarOrdenesQuery:
    page: int = 1
    size: int = 10
    search: str | None = None
    estado: EstadoOrden | None = None
    tecnico_id: int | None = None

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from app.modules.facturacion.domain.entities import EstadoFactura, TipoReceptor
from app.modules.inventario.domain.entities import TipoImpuesto


@dataclass(frozen=True)
class ContextoTenant:
    empresa_id: int
    punto_emision_id: int
    usuario_id: int


@dataclass(frozen=True)
class ItemFacturaCommand:
    producto_id: int | None
    servicio_id: int | None
    descripcion: str
    codigo: str | None
    cantidad: Decimal
    precio_unitario: Decimal
    descuento_porcentaje: Decimal
    aplica_iva: bool
    tipo_impuesto: TipoImpuesto
    bodega_id: int | None = None


@dataclass(frozen=True)
class GuardarFacturaCommand:
    factura_id: int | None
    tipo_receptor: TipoReceptor
    cliente_id: int | None
    forma_pago_id: int | None
    fecha_emision: date
    fecha_vencimiento: date | None
    fecha_pago: date | None
    notas: str | None
    terminos: str | None
    items: list[ItemFacturaCommand] = field(default_factory=list)
    orden_trabajo_id: int | None = None


@dataclass(frozen=True)
class CrearDesdeOrdenCommand:
    orden_id: int
    tipo_receptor: TipoReceptor
    cliente_id: int | None = None
    forma_pago_id: int | None = None


@dataclass(frozen=True)
class ListarFacturasQuery:
    page: int = 1
    size: int = 10
    search: str | None = None
    estado: EstadoFactura | None = None
    cliente_id: int | None = None
    fecha_desde: date | None = None
    fecha_hasta: date | None = None


@dataclass
class TotalesFactura:
    cantidad: int = 0
    subtotal: Decimal = Decimal("0")
    iva_15: Decimal = Decimal("0")
    iva_5: Decimal = Decimal("0")
    iva_0: Decimal = Decimal("0")
    total: Decimal = Decimal("0")


@dataclass
class ImpuestoEstadistica:
    tasa: int
    subtotal: Decimal = Decimal("0")
    iva: Decimal = Decimal("0")
    total: Decimal = Decimal("0")


@dataclass
class EstadoEstadistica:
    estado: EstadoFactura
    cantidad: int = 0
    subtotal: Decimal = Decimal("0")
    iva_15: Decimal = Decimal("0")
    iva_5: Decimal = Decimal("0")
    iva_0: Decimal = Decimal("0")
    total: Decimal = Decimal("0")
    numeros: list[str] = field(default_factory=list)


@dataclass
class EstadisticasFactura:
    fecha_desde: date | None
    fecha_hasta: date | None
    por_estado: list[EstadoEstadistica] = field(default_factory=list)
    totales: TotalesFactura = field(default_factory=TotalesFactura)
    por_impuesto: list[ImpuestoEstadistica] = field(default_factory=list)

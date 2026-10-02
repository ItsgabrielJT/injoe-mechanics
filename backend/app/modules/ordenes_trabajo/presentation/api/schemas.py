from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.modules.inventario.domain.entities import TipoImpuesto
from app.modules.ordenes_trabajo.application.dto import GuardarOrdenCommand, ItemOrdenCommand, ListarOrdenesQuery
from app.modules.ordenes_trabajo.domain.entities import EstadoOrden, OrdenTrabajo, OrdenTrabajoItem, TotalesOrdenes


class ItemOrdenRequest(BaseModel):
    producto_id: int | None = None
    servicio_id: int | None = None
    proveedor_id: int | None = None
    bodega_id: int | None = None
    descripcion: str | None = None
    codigo: str | None = None
    cantidad: Decimal = Field(..., gt=0)
    precio_venta: Decimal = Field(..., ge=0)
    precio_compra: Decimal = Field(default=Decimal("0"), ge=0)
    aplica_iva: bool = True
    tipo_impuesto: TipoImpuesto

    def to_command(self) -> ItemOrdenCommand:
        return ItemOrdenCommand(**self.model_dump())


class OrdenCreateRequest(BaseModel):
    cliente_id: int
    vehiculo_id: int
    tecnico_id: int
    fecha_inicio: datetime | None = None
    fecha_entrega: datetime | None = None
    kilometraje: Decimal | None = Field(None, ge=0)
    notas_generales: str | None = None
    notas_tecnicas: str | None = None
    items: list[ItemOrdenRequest] = []

    def to_command(self, orden_id: int | None = None) -> GuardarOrdenCommand:
        data = self.model_dump()
        items = [ItemOrdenCommand(**item) for item in data.pop("items")]
        return GuardarOrdenCommand(orden_id=orden_id, items=items, **data)


class ItemOrdenResponse(BaseModel):
    id: int
    producto_id: int | None = None
    servicio_id: int | None = None
    proveedor_id: int | None = None
    bodega_id: int | None = None
    descripcion: str
    codigo: str | None = None
    cantidad: Decimal
    precio_venta: Decimal
    precio_compra: Decimal
    aplica_iva: bool
    tipo_impuesto: TipoImpuesto
    utilidad: Decimal
    total: Decimal
    proveedor_nombres: str | None = None
    bodega_nombre: str | None = None

    @classmethod
    def from_domain(cls, item: OrdenTrabajoItem) -> "ItemOrdenResponse":
        return cls(
            id=item.id or 0,
            producto_id=item.producto_id,
            servicio_id=item.servicio_id,
            proveedor_id=item.proveedor_id,
            bodega_id=item.bodega_id,
            descripcion=item.descripcion,
            codigo=item.codigo,
            cantidad=item.cantidad,
            precio_venta=item.precio_venta,
            precio_compra=item.precio_compra,
            aplica_iva=item.aplica_iva,
            tipo_impuesto=item.tipo_impuesto,
            utilidad=item.utilidad,
            total=item.total,
            proveedor_nombres=item.proveedor_nombres,
            bodega_nombre=item.bodega_nombre,
        )


class OrdenResponse(BaseModel):
    id: int
    empresa_id: int
    punto_emision_id: int
    numero: str
    cliente_id: int
    vehiculo_id: int
    tecnico_id: int
    estado: EstadoOrden
    fecha_inicio: datetime
    fecha_entrega: datetime | None = None
    kilometraje: Decimal | None = None
    notas_generales: str | None = None
    notas_tecnicas: str | None = None
    total_productos: Decimal
    total_servicios: Decimal
    total_costo: Decimal
    total_utilidad: Decimal
    total: Decimal
    cliente_nombres: str | None = None
    cliente_identificacion: str | None = None
    vehiculo_placa: str | None = None
    vehiculo_marca: str | None = None
    vehiculo_modelo: str | None = None
    tecnico_nombre: str | None = None
    items: list[ItemOrdenResponse] = []
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

    @classmethod
    def from_domain(cls, orden: OrdenTrabajo) -> "OrdenResponse":
        return cls(
            id=orden.id or 0,
            empresa_id=orden.empresa_id,
            punto_emision_id=orden.punto_emision_id,
            numero=orden.numero,
            cliente_id=orden.cliente_id,
            vehiculo_id=orden.vehiculo_id,
            tecnico_id=orden.tecnico_id,
            estado=orden.estado,
            fecha_inicio=orden.fecha_inicio,
            fecha_entrega=orden.fecha_entrega,
            kilometraje=orden.kilometraje,
            notas_generales=orden.notas_generales,
            notas_tecnicas=orden.notas_tecnicas,
            total_productos=orden.total_productos,
            total_servicios=orden.total_servicios,
            total_costo=orden.total_costo,
            total_utilidad=orden.total_utilidad,
            total=orden.total,
            cliente_nombres=orden.cliente_nombres,
            cliente_identificacion=orden.cliente_identificacion,
            vehiculo_placa=orden.vehiculo_placa,
            vehiculo_marca=orden.vehiculo_marca,
            vehiculo_modelo=orden.vehiculo_modelo,
            tecnico_nombre=orden.tecnico_nombre,
            items=[ItemOrdenResponse.from_domain(item) for item in orden.items],
            creado_en=orden.creado_en,
            actualizado_en=orden.actualizado_en,
        )


class TotalesOrdenesResponse(BaseModel):
    total_costo: Decimal
    total_utilidad: Decimal
    total: Decimal

    @classmethod
    def from_domain(cls, totales: TotalesOrdenes) -> "TotalesOrdenesResponse":
        return cls(total_costo=totales.total_costo, total_utilidad=totales.total_utilidad, total=totales.total)


class OrdenDataResponse(BaseModel):
    data: OrdenResponse
    message: str


class OrdenListResponse(BaseModel):
    data: list[OrdenResponse]
    total: int
    page: int
    size: int
    pages: int
    totales: TotalesOrdenesResponse
    message: str = "Órdenes de trabajo"


def listar_ordenes_query(
    page: int, size: int, search: str | None, estado: EstadoOrden | None, tecnico_id: int | None
) -> ListarOrdenesQuery:
    return ListarOrdenesQuery(page=page, size=size, search=search, estado=estado, tecnico_id=tecnico_id)

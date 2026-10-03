from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.modules.facturacion.application.dto import (
    CrearDesdeOrdenCommand,
    GuardarFacturaCommand,
    ItemFacturaCommand,
    ListarFacturasQuery,
)
from app.modules.facturacion.domain.entities import EstadoFactura, Factura, FacturaItem, FormaPago, FormaPagoSri, TipoReceptor
from app.modules.inventario.domain.entities import TipoImpuesto


class ItemFacturaRequest(BaseModel):
    producto_id: int | None = None
    servicio_id: int | None = None
    descripcion: str
    codigo: str | None = None
    cantidad: Decimal = Field(..., gt=0)
    precio_unitario: Decimal = Field(..., ge=0)
    descuento_porcentaje: Decimal = Field(default=Decimal("0"), ge=0)
    aplica_iva: bool = True
    tipo_impuesto: TipoImpuesto
    bodega_id: int | None = None

    def to_command(self) -> ItemFacturaCommand:
        return ItemFacturaCommand(**self.model_dump())


class FacturaCreateRequest(BaseModel):
    tipo_receptor: TipoReceptor
    cliente_id: int | None = None
    forma_pago_id: int | None = None
    fecha_emision: date
    fecha_vencimiento: date | None = None
    fecha_pago: date | None = None
    notas: str | None = None
    terminos: str | None = None
    orden_trabajo_id: int | None = None
    items: list[ItemFacturaRequest]

    def to_command(self, factura_id: int | None = None) -> GuardarFacturaCommand:
        data = self.model_dump()
        items = [ItemFacturaCommand(**item) for item in data.pop("items")]
        return GuardarFacturaCommand(factura_id=factura_id, items=items, **data)


class DesdeOrdenRequest(BaseModel):
    tipo_receptor: TipoReceptor
    cliente_id: int | None = None
    forma_pago_id: int | None = None

    def to_command(self, orden_id: int) -> CrearDesdeOrdenCommand:
        return CrearDesdeOrdenCommand(orden_id=orden_id, **self.model_dump())


class ItemFacturaResponse(BaseModel):
    id: int
    producto_id: int | None = None
    servicio_id: int | None = None
    descripcion: str
    codigo: str | None = None
    cantidad: Decimal
    precio_unitario: Decimal
    descuento_porcentaje: Decimal
    aplica_iva: bool
    tipo_impuesto: TipoImpuesto
    bodega_id: int | None = None
    subtotal: Decimal
    iva_amount: Decimal
    total: Decimal

    @classmethod
    def from_domain(cls, item: FacturaItem) -> "ItemFacturaResponse":
        return cls(
            id=item.id or 0,
            producto_id=item.producto_id,
            servicio_id=item.servicio_id,
            descripcion=item.descripcion,
            codigo=item.codigo,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            descuento_porcentaje=item.descuento_porcentaje,
            aplica_iva=item.aplica_iva,
            tipo_impuesto=item.tipo_impuesto,
            bodega_id=item.bodega_id,
            subtotal=item.subtotal,
            iva_amount=item.iva_amount,
            total=item.total,
        )


class FacturaResponse(BaseModel):
    id: int
    empresa_id: int
    punto_emision_id: int
    numero: str
    tipo_receptor: TipoReceptor
    estado: EstadoFactura
    cliente_id: int | None = None
    orden_trabajo_id: int | None = None
    forma_pago_id: int | None = None
    fecha_emision: date
    fecha_vencimiento: date | None = None
    fecha_pago: date | None = None
    fecha_autorizacion: datetime | None = None
    clave_acceso: str | None = None
    xml_content: str | None = None
    reason_error: str | None = None
    numero_autorizacion: str | None = None
    subtotal_15: Decimal
    subtotal_5: Decimal
    subtotal_0: Decimal
    subtotal_objeto: Decimal
    subtotal_exento: Decimal
    iva_15: Decimal
    iva_5: Decimal
    descuento: Decimal
    total: Decimal
    notas: str | None = None
    terminos: str | None = None
    cliente_nombres: str | None = None
    cliente_identificacion: str | None = None
    cliente_correo: str | None = None
    forma_pago_nombre: str | None = None
    items: list[ItemFacturaResponse] = []
    creado_en: datetime | None = None

    @classmethod
    def from_domain(cls, factura: Factura) -> "FacturaResponse":
        return cls(
            id=factura.id or 0,
            empresa_id=factura.empresa_id,
            punto_emision_id=factura.punto_emision_id,
            numero=factura.numero,
            tipo_receptor=factura.tipo_receptor,
            estado=factura.estado,
            cliente_id=factura.cliente_id,
            orden_trabajo_id=factura.orden_trabajo_id,
            forma_pago_id=factura.forma_pago_id,
            fecha_emision=factura.fecha_emision,
            fecha_vencimiento=factura.fecha_vencimiento,
            fecha_pago=factura.fecha_pago,
            fecha_autorizacion=factura.fecha_autorizacion,
            clave_acceso=factura.clave_acceso,
            xml_content=factura.xml_content,
            reason_error=factura.reason_error,
            numero_autorizacion=factura.numero_autorizacion,
            subtotal_15=factura.subtotal_15,
            subtotal_5=factura.subtotal_5,
            subtotal_0=factura.subtotal_0,
            subtotal_objeto=factura.subtotal_objeto,
            subtotal_exento=factura.subtotal_exento,
            iva_15=factura.iva_15,
            iva_5=factura.iva_5,
            descuento=factura.descuento,
            total=factura.total,
            notas=factura.notas,
            terminos=factura.terminos,
            cliente_nombres=factura.cliente_nombres,
            cliente_identificacion=factura.cliente_identificacion,
            cliente_correo=factura.cliente_correo,
            forma_pago_nombre=factura.forma_pago_nombre,
            items=[ItemFacturaResponse.from_domain(item) for item in factura.items],
            creado_en=factura.creado_en,
        )


class FacturaDataResponse(BaseModel):
    data: FacturaResponse
    message: str


class FacturaListResponse(BaseModel):
    data: list[FacturaResponse]
    total: int
    page: int
    size: int
    pages: int
    message: str = "Facturas"


class FormaPagoResponse(BaseModel):
    id: int
    codigo: str
    nombre: str
    forma_pago_sri_id: int | None = None
    forma_pago_sri_codigo: str | None = None
    forma_pago_sri_nombre: str | None = None
    aplica_venta: bool
    activo: bool

    @classmethod
    def from_domain(cls, forma: FormaPago) -> "FormaPagoResponse":
        return cls(
            id=forma.id,
            codigo=forma.codigo,
            nombre=forma.nombre,
            forma_pago_sri_id=forma.forma_pago_sri_id,
            forma_pago_sri_codigo=forma.forma_pago_sri_codigo,
            forma_pago_sri_nombre=forma.forma_pago_sri_nombre,
            aplica_venta=forma.aplica_venta,
            activo=forma.activo,
        )


class FormaPagoSriResponse(BaseModel):
    id: int
    codigo: str
    nombre: str
    activo: bool

    @classmethod
    def from_domain(cls, forma: FormaPagoSri) -> "FormaPagoSriResponse":
        return cls(id=forma.id, codigo=forma.codigo, nombre=forma.nombre, activo=forma.activo)


def listar_facturas_query(
    page: int, size: int, search: str | None, estado: EstadoFactura | None, cliente_id: int | None
) -> ListarFacturasQuery:
    return ListarFacturasQuery(page=page, size=size, search=search, estado=estado, cliente_id=cliente_id)

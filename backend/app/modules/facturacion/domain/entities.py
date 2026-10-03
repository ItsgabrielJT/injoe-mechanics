from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum

from app.modules.inventario.domain.entities import TipoImpuesto


class EstadoFactura(str, Enum):
    BORRADOR = "BORRADOR"
    ENVIADA = "ENVIADA"
    PENDIENTE_AUTORIZACION = "PENDIENTE_AUTORIZACION"
    AUTORIZADA = "AUTORIZADA"
    RECHAZADA = "RECHAZADA"
    CANCELADA = "CANCELADA"


class TipoReceptor(str, Enum):
    CLIENTE = "cliente"
    CONSUMIDOR_FINAL = "consumidor_final"


CONSUMIDOR_FINAL_NOMBRE = "CONSUMIDOR FINAL"
CONSUMIDOR_FINAL_IDENTIFICACION = "9999999999999"
CONSUMIDOR_FINAL_TIPO_ID = "07"


def tasa_iva(tipo: TipoImpuesto, aplica_iva: bool) -> Decimal:
    if tipo == TipoImpuesto.QUINCE:
        return Decimal("0.15")
    if tipo == TipoImpuesto.CINCO:
        return Decimal("0.05")
    return Decimal("0")


def dinero(valor: Decimal | int | float | str) -> Decimal:
    return Decimal(str(valor or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def precio_base(precio_catalogo: Decimal, aplica_iva: bool, tipo: TipoImpuesto) -> Decimal:
    tasa = tasa_iva(tipo, aplica_iva)
    if aplica_iva and tasa > 0:
        return dinero(precio_catalogo / (1 + tasa))
    return dinero(precio_catalogo)


@dataclass
class FormaPagoSri:
    id: int
    codigo: str
    nombre: str
    activo: bool


@dataclass
class FormaPago:
    id: int
    empresa_id: int
    punto_emision_id: int
    codigo: str
    nombre: str
    forma_pago_sri_id: int | None
    forma_pago_sri_codigo: str | None
    forma_pago_sri_nombre: str | None
    aplica_venta: bool
    aplica_compra: bool
    activo: bool


@dataclass
class FacturaItem:
    id: int | None
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
    subtotal: Decimal = Decimal("0")
    iva_amount: Decimal = Decimal("0")
    ice_amount: Decimal = Decimal("0")
    irbpnr_amount: Decimal = Decimal("0")
    total: Decimal = Decimal("0")

    def recalcular(self) -> None:
        bruto = dinero(self.cantidad * self.precio_unitario)
        descuento = dinero(bruto * (self.descuento_porcentaje or Decimal("0")) / Decimal("100"))
        self.subtotal = dinero(bruto - descuento)
        tasa = tasa_iva(self.tipo_impuesto, self.aplica_iva)
        self.iva_amount = dinero(self.subtotal * tasa) if tasa > 0 else Decimal("0.00")
        self.total = dinero(self.subtotal + self.iva_amount + self.ice_amount + self.irbpnr_amount)


@dataclass
class Factura:
    id: int | None
    empresa_id: int
    punto_emision_id: int
    usuario_id: int
    numero: str
    tipo_receptor: TipoReceptor
    estado: EstadoFactura
    fecha_emision: date
    cliente_id: int | None = None
    orden_trabajo_id: int | None = None
    forma_pago_id: int | None = None
    fecha_vencimiento: date | None = None
    fecha_pago: date | None = None
    fecha_autorizacion: datetime | None = None
    clave_acceso: str | None = None
    xml_content: str | None = None
    reason_error: str | None = None
    numero_autorizacion: str | None = None
    subtotal_15: Decimal = Decimal("0")
    subtotal_5: Decimal = Decimal("0")
    subtotal_0: Decimal = Decimal("0")
    subtotal_objeto: Decimal = Decimal("0")
    subtotal_exento: Decimal = Decimal("0")
    iva_15: Decimal = Decimal("0")
    iva_5: Decimal = Decimal("0")
    ice: Decimal = Decimal("0")
    irbpnr: Decimal = Decimal("0")
    descuento: Decimal = Decimal("0")
    total: Decimal = Decimal("0")
    notas: str | None = None
    terminos: str | None = None
    cliente_nombres: str | None = None
    cliente_identificacion: str | None = None
    cliente_correo: str | None = None
    cliente_direccion: str | None = None
    forma_pago_nombre: str | None = None
    forma_pago_sri_codigo: str | None = None
    items: list[FacturaItem] = field(default_factory=list)
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

    def recalcular(self) -> None:
        self.subtotal_15 = Decimal("0")
        self.subtotal_5 = Decimal("0")
        self.subtotal_0 = Decimal("0")
        self.subtotal_objeto = Decimal("0")
        self.subtotal_exento = Decimal("0")
        self.iva_15 = Decimal("0")
        self.iva_5 = Decimal("0")
        self.descuento = Decimal("0")
        self.ice = Decimal("0")
        self.irbpnr = Decimal("0")
        for item in self.items:
            item.recalcular()
            bruto = dinero(item.cantidad * item.precio_unitario)
            self.descuento += dinero(bruto - item.subtotal)
            self.ice += item.ice_amount
            self.irbpnr += item.irbpnr_amount
            tipo = item.tipo_impuesto
            if tipo == TipoImpuesto.QUINCE:
                self.subtotal_15 += item.subtotal
                self.iva_15 += item.iva_amount
            elif tipo == TipoImpuesto.CINCO:
                self.subtotal_5 += item.subtotal
                self.iva_5 += item.iva_amount
            elif tipo == TipoImpuesto.NO_OBJETO:
                self.subtotal_objeto += item.subtotal
            elif tipo == TipoImpuesto.EXENTO_IVA:
                self.subtotal_exento += item.subtotal
            else:
                self.subtotal_0 += item.subtotal
        self.subtotal_15 = dinero(self.subtotal_15)
        self.subtotal_5 = dinero(self.subtotal_5)
        self.subtotal_0 = dinero(self.subtotal_0)
        self.subtotal_objeto = dinero(self.subtotal_objeto)
        self.subtotal_exento = dinero(self.subtotal_exento)
        self.iva_15 = dinero(self.iva_15)
        self.iva_5 = dinero(self.iva_5)
        self.descuento = dinero(self.descuento)
        self.ice = dinero(self.ice)
        self.irbpnr = dinero(self.irbpnr)
        self.total = dinero(
            self.subtotal_15
            + self.subtotal_5
            + self.subtotal_0
            + self.subtotal_objeto
            + self.subtotal_exento
            + self.iva_15
            + self.iva_5
            + self.ice
            + self.irbpnr
        )

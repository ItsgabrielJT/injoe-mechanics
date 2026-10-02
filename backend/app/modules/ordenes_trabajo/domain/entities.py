from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import Enum

from app.modules.inventario.domain.entities import TipoImpuesto


class EstadoOrden(str, Enum):
    EN_PROCESO = "EN_PROCESO"
    CERRADA = "CERRADA"


@dataclass
class OrdenTrabajoItem:
    id: int | None
    producto_id: int | None
    servicio_id: int | None
    proveedor_id: int | None
    bodega_id: int | None
    descripcion: str
    codigo: str | None
    cantidad: Decimal
    precio_venta: Decimal
    precio_compra: Decimal
    aplica_iva: bool
    tipo_impuesto: TipoImpuesto
    utilidad: Decimal
    total: Decimal
    proveedor_nombres: str | None = None
    bodega_nombre: str | None = None


@dataclass
class OrdenTrabajo:
    id: int | None
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
    total_productos: Decimal = Decimal("0")
    total_servicios: Decimal = Decimal("0")
    total_costo: Decimal = Decimal("0")
    total_utilidad: Decimal = Decimal("0")
    total: Decimal = Decimal("0")
    cliente_nombres: str | None = None
    cliente_identificacion: str | None = None
    vehiculo_placa: str | None = None
    vehiculo_marca: str | None = None
    vehiculo_modelo: str | None = None
    tecnico_nombre: str | None = None
    items: list[OrdenTrabajoItem] = field(default_factory=list)
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

    def calcular_totales(self) -> None:
        self.total_productos = Decimal("0")
        self.total_servicios = Decimal("0")
        self.total_costo = Decimal("0")
        self.total_utilidad = Decimal("0")
        for item in self.items:
            item.total = (item.cantidad * item.precio_venta).quantize(Decimal("0.01"))
            item.utilidad = (item.total - item.cantidad * item.precio_compra).quantize(Decimal("0.01"))
            if item.producto_id:
                self.total_productos += item.total
            else:
                self.total_servicios += item.total
            self.total_costo += item.cantidad * item.precio_compra
            self.total_utilidad += item.utilidad
        self.total_productos = self.total_productos.quantize(Decimal("0.01"))
        self.total_servicios = self.total_servicios.quantize(Decimal("0.01"))
        self.total_costo = self.total_costo.quantize(Decimal("0.01"))
        self.total_utilidad = self.total_utilidad.quantize(Decimal("0.01"))
        self.total = (self.total_productos + self.total_servicios).quantize(Decimal("0.01"))


@dataclass
class TotalesOrdenes:
    total_costo: Decimal = Decimal("0")
    total_utilidad: Decimal = Decimal("0")
    total: Decimal = Decimal("0")

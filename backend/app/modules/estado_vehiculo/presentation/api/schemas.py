from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.modules.estado_vehiculo.application.dto import ListarEstadoVehiculoQuery
from app.modules.estado_vehiculo.domain.entities import EstadoVehiculo, OrdenEstadoResumen, TotalesEstadoVehiculo
from app.modules.ordenes_trabajo.domain.entities import EstadoOrden
from app.modules.ordenes_trabajo.presentation.api.schemas import ItemOrdenResponse


class OrdenEstadoResponse(BaseModel):
    id: int
    numero: str
    estado: EstadoOrden
    fecha_inicio: datetime
    fecha_entrega: datetime | None = None
    kilometraje: Decimal | None = None
    tecnico_nombre: str | None = None
    total_costo: Decimal
    total_utilidad: Decimal
    total: Decimal
    notas_generales: str | None = None
    notas_tecnicas: str | None = None
    items: list[ItemOrdenResponse] = []

    @classmethod
    def from_domain(cls, orden: OrdenEstadoResumen) -> "OrdenEstadoResponse":
        return cls(
            id=orden.id,
            numero=orden.numero,
            estado=orden.estado,
            fecha_inicio=orden.fecha_inicio,
            fecha_entrega=orden.fecha_entrega,
            kilometraje=orden.kilometraje,
            tecnico_nombre=orden.tecnico_nombre,
            total_costo=orden.total_costo,
            total_utilidad=orden.total_utilidad,
            total=orden.total,
            notas_generales=orden.notas_generales,
            notas_tecnicas=orden.notas_tecnicas,
            items=[ItemOrdenResponse.from_domain(item) for item in orden.items],
        )


class EstadoVehiculoResponse(BaseModel):
    vehiculo_id: int
    placa: str
    marca: str | None = None
    modelo: str | None = None
    anio: int | None = None
    color: str | None = None
    cliente_id: int
    cliente_nombres: str
    cliente_identificacion: str | None = None
    ordenes_count: int
    ultima_fecha: datetime | None = None
    total_costo: Decimal
    total_utilidad: Decimal
    total: Decimal
    ordenes: list[OrdenEstadoResponse] = []

    @classmethod
    def from_domain(cls, item: EstadoVehiculo) -> "EstadoVehiculoResponse":
        return cls(
            vehiculo_id=item.vehiculo_id,
            placa=item.placa,
            marca=item.marca,
            modelo=item.modelo,
            anio=item.anio,
            color=item.color,
            cliente_id=item.cliente_id,
            cliente_nombres=item.cliente_nombres,
            cliente_identificacion=item.cliente_identificacion,
            ordenes_count=item.ordenes_count,
            ultima_fecha=item.ultima_fecha,
            total_costo=item.total_costo,
            total_utilidad=item.total_utilidad,
            total=item.total,
            ordenes=[OrdenEstadoResponse.from_domain(orden) for orden in item.ordenes],
        )


class TotalesEstadoResponse(BaseModel):
    vehiculos: int
    ordenes: int
    total_costo: Decimal
    total_utilidad: Decimal
    total: Decimal

    @classmethod
    def from_domain(cls, totales: TotalesEstadoVehiculo) -> "TotalesEstadoResponse":
        return cls(
            vehiculos=totales.vehiculos,
            ordenes=totales.ordenes,
            total_costo=totales.total_costo,
            total_utilidad=totales.total_utilidad,
            total=totales.total,
        )


class EstadoVehiculoDataResponse(BaseModel):
    data: EstadoVehiculoResponse
    message: str = "Historial del vehículo"


class EstadoVehiculoListResponse(BaseModel):
    data: list[EstadoVehiculoResponse]
    total: int
    page: int
    size: int
    pages: int
    totales: TotalesEstadoResponse
    message: str = "Estado de vehículo"


def listar_estado_query(
    page: int,
    size: int,
    placa: str | None,
    marca: str | None,
    modelo: str | None,
    cliente: str | None,
    identificacion: str | None,
    fecha_desde: date | None,
    fecha_hasta: date | None,
) -> ListarEstadoVehiculoQuery:
    return ListarEstadoVehiculoQuery(
        page=page,
        size=size,
        placa=placa,
        marca=marca,
        modelo=modelo,
        cliente=cliente,
        identificacion=identificacion,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )

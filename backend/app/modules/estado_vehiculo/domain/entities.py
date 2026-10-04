from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from app.modules.ordenes_trabajo.domain.entities import EstadoOrden, OrdenTrabajoItem


@dataclass
class OrdenEstadoResumen:
    id: int
    numero: str
    estado: EstadoOrden
    fecha_inicio: datetime
    fecha_entrega: datetime | None
    kilometraje: Decimal | None
    tecnico_nombre: str | None
    total_costo: Decimal
    total_utilidad: Decimal
    total: Decimal
    notas_generales: str | None = None
    notas_tecnicas: str | None = None
    items: list[OrdenTrabajoItem] = field(default_factory=list)


@dataclass
class EstadoVehiculo:
    vehiculo_id: int
    placa: str
    marca: str | None
    modelo: str | None
    anio: int | None
    color: str | None
    cliente_id: int
    cliente_nombres: str
    cliente_identificacion: str | None
    ordenes_count: int
    ultima_fecha: datetime | None
    total_costo: Decimal
    total_utilidad: Decimal
    total: Decimal
    ordenes: list[OrdenEstadoResumen] = field(default_factory=list)


@dataclass
class TotalesEstadoVehiculo:
    vehiculos: int = 0
    ordenes: int = 0
    total_costo: Decimal = Decimal("0")
    total_utilidad: Decimal = Decimal("0")
    total: Decimal = Decimal("0")

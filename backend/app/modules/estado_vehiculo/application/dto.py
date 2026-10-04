from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class ContextoTenant:
    empresa_id: int
    punto_emision_id: int


@dataclass(frozen=True)
class ListarEstadoVehiculoQuery:
    page: int = 1
    size: int = 10
    placa: str | None = None
    marca: str | None = None
    modelo: str | None = None
    cliente: str | None = None
    identificacion: str | None = None
    fecha_desde: date | None = None
    fecha_hasta: date | None = None

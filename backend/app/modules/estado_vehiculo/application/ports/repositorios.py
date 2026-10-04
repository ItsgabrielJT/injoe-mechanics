from typing import Protocol

from app.modules.estado_vehiculo.application.dto import ListarEstadoVehiculoQuery
from app.modules.estado_vehiculo.domain.entities import EstadoVehiculo, TotalesEstadoVehiculo


class EstadoVehiculoRepository(Protocol):
    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarEstadoVehiculoQuery
    ) -> tuple[list[EstadoVehiculo], int, TotalesEstadoVehiculo]: ...

    async def obtener_historial(
        self,
        vehiculo_id: int,
        empresa_id: int,
        punto_emision_id: int,
        query: ListarEstadoVehiculoQuery,
    ) -> EstadoVehiculo | None: ...

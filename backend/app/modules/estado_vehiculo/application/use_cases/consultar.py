from app.modules.estado_vehiculo.application.dto import ContextoTenant, ListarEstadoVehiculoQuery
from app.modules.estado_vehiculo.application.ports.repositorios import EstadoVehiculoRepository
from app.modules.estado_vehiculo.domain.entities import EstadoVehiculo, TotalesEstadoVehiculo
from app.modules.estado_vehiculo.domain.exceptions import HistorialVehiculoNoEncontrado


class ListarEstadoVehiculoUseCase:
    def __init__(self, repository: EstadoVehiculoRepository) -> None:
        self.repository = repository

    async def execute(
        self, query: ListarEstadoVehiculoQuery, tenant: ContextoTenant
    ) -> tuple[list[EstadoVehiculo], int, TotalesEstadoVehiculo]:
        return await self.repository.listar(tenant.empresa_id, tenant.punto_emision_id, query)


class ObtenerHistorialVehiculoUseCase:
    def __init__(self, repository: EstadoVehiculoRepository) -> None:
        self.repository = repository

    async def execute(
        self, vehiculo_id: int, query: ListarEstadoVehiculoQuery, tenant: ContextoTenant
    ) -> EstadoVehiculo:
        historial = await self.repository.obtener_historial(
            vehiculo_id, tenant.empresa_id, tenant.punto_emision_id, query
        )
        if historial is None:
            raise HistorialVehiculoNoEncontrado()
        return historial

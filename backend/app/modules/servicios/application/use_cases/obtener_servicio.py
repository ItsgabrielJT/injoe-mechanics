from app.modules.servicios.application.dto import ContextoTenant
from app.modules.servicios.application.ports.repositorios import ServicioRepository
from app.modules.servicios.domain.entities import Servicio
from app.modules.servicios.domain.exceptions import ServicioNoEncontrado


class ObtenerServicioUseCase:
    def __init__(self, servicio_repository: ServicioRepository) -> None:
        self.servicio_repository = servicio_repository

    async def execute(self, servicio_id: int, tenant: ContextoTenant) -> Servicio:
        servicio = await self.servicio_repository.obtener_por_id(
            servicio_id,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if servicio is None:
            raise ServicioNoEncontrado()
        return servicio

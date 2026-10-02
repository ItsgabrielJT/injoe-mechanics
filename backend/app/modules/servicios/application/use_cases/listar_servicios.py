from app.modules.servicios.application.dto import ContextoTenant, ListarServiciosQuery
from app.modules.servicios.application.ports.repositorios import ServicioRepository
from app.modules.servicios.domain.entities import Servicio


class ListarServiciosUseCase:
    def __init__(self, servicio_repository: ServicioRepository) -> None:
        self.servicio_repository = servicio_repository

    async def execute(
        self,
        query: ListarServiciosQuery,
        tenant: ContextoTenant,
    ) -> tuple[list[Servicio], int]:
        return await self.servicio_repository.listar(
            tenant.empresa_id,
            tenant.punto_emision_id,
            query,
        )

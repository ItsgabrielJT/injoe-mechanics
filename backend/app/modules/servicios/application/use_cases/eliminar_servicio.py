from app.modules.servicios.application.dto import ContextoTenant
from app.modules.servicios.application.ports.repositorios import ServicioRepository
from app.modules.servicios.domain.exceptions import ServicioNoEncontrado


class EliminarServicioUseCase:
    def __init__(self, servicio_repository: ServicioRepository) -> None:
        self.servicio_repository = servicio_repository

    async def execute(self, servicio_id: int, tenant: ContextoTenant) -> None:
        eliminado = await self.servicio_repository.eliminar(
            servicio_id,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if not eliminado:
            raise ServicioNoEncontrado()

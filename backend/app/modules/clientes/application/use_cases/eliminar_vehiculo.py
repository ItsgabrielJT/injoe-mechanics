from app.modules.clientes.application.dto import ContextoTenant
from app.modules.clientes.application.ports.repositorios import VehiculoRepository
from app.modules.clientes.domain.exceptions import VehiculoNoEncontrado


class EliminarVehiculoUseCase:
    def __init__(self, vehiculo_repository: VehiculoRepository) -> None:
        self.vehiculo_repository = vehiculo_repository

    async def execute(self, vehiculo_id: int, tenant: ContextoTenant) -> None:
        eliminado = await self.vehiculo_repository.eliminar(
            vehiculo_id,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if not eliminado:
            raise VehiculoNoEncontrado()

from app.modules.clientes.application.dto import ContextoTenant
from app.modules.clientes.application.ports.repositorios import VehiculoRepository
from app.modules.clientes.domain.entities import Vehiculo
from app.modules.clientes.domain.exceptions import VehiculoNoEncontrado


class ObtenerVehiculoUseCase:
    def __init__(self, vehiculo_repository: VehiculoRepository) -> None:
        self.vehiculo_repository = vehiculo_repository

    async def execute(self, vehiculo_id: int, tenant: ContextoTenant) -> Vehiculo:
        vehiculo = await self.vehiculo_repository.obtener_por_id(
            vehiculo_id,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if vehiculo is None:
            raise VehiculoNoEncontrado()
        return vehiculo

from app.modules.clientes.application.dto import ContextoTenant, ListarVehiculosQuery
from app.modules.clientes.application.ports.repositorios import VehiculoRepository
from app.modules.clientes.domain.entities import Vehiculo


class ListarVehiculosUseCase:
    def __init__(self, vehiculo_repository: VehiculoRepository) -> None:
        self.vehiculo_repository = vehiculo_repository

    async def execute(
        self,
        query: ListarVehiculosQuery,
        tenant: ContextoTenant,
    ) -> tuple[list[Vehiculo], int]:
        return await self.vehiculo_repository.listar(
            tenant.empresa_id,
            tenant.punto_emision_id,
            query,
        )


class ListarVehiculosClienteUseCase:
    def __init__(self, vehiculo_repository: VehiculoRepository) -> None:
        self.vehiculo_repository = vehiculo_repository

    async def execute(
        self,
        cliente_id: int,
        query: ListarVehiculosQuery,
        tenant: ContextoTenant,
    ) -> tuple[list[Vehiculo], int]:
        return await self.vehiculo_repository.listar(
            tenant.empresa_id,
            tenant.punto_emision_id,
            ListarVehiculosQuery(
                page=query.page,
                size=query.size,
                search=query.search,
                cliente_id=cliente_id,
                placa=query.placa,
                marca=query.marca,
                modelo=query.modelo,
                anio=query.anio,
            ),
        )

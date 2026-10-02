from app.modules.clientes.application.dto import ContextoTenant, ListarClientesQuery
from app.modules.clientes.application.ports.repositorios import ClienteRepository
from app.modules.clientes.domain.entities import Cliente


class ListarClientesUseCase:
    def __init__(self, cliente_repository: ClienteRepository) -> None:
        self.cliente_repository = cliente_repository

    async def execute(
        self,
        query: ListarClientesQuery,
        tenant: ContextoTenant,
    ) -> tuple[list[Cliente], int]:
        return await self.cliente_repository.listar(
            tenant.empresa_id,
            tenant.punto_emision_id,
            query,
        )

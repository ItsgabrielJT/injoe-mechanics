from app.modules.clientes.application.dto import ContextoTenant
from app.modules.clientes.application.ports.repositorios import ClienteRepository
from app.modules.clientes.domain.exceptions import ClienteNoEncontrado


class EliminarClienteUseCase:
    def __init__(self, cliente_repository: ClienteRepository) -> None:
        self.cliente_repository = cliente_repository

    async def execute(self, cliente_id: int, tenant: ContextoTenant) -> None:
        eliminado = await self.cliente_repository.eliminar(
            cliente_id,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if not eliminado:
            raise ClienteNoEncontrado()

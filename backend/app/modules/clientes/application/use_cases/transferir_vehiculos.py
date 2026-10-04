from app.modules.clientes.application.dto import ContextoTenant, TransferirVehiculosCommand
from app.modules.clientes.application.ports.repositorios import ClienteRepository, VehiculoRepository
from app.modules.clientes.domain.entities import Vehiculo
from app.modules.clientes.domain.exceptions import ClienteNoEncontrado, TransferenciaInvalida, VehiculoNoEncontrado


class TransferirVehiculosUseCase:
    def __init__(
        self,
        vehiculo_repository: VehiculoRepository,
        cliente_repository: ClienteRepository,
    ) -> None:
        self.vehiculo_repository = vehiculo_repository
        self.cliente_repository = cliente_repository

    async def execute(
        self,
        command: TransferirVehiculosCommand,
        tenant: ContextoTenant,
    ) -> list[Vehiculo]:
        if not command.asignaciones:
            raise TransferenciaInvalida("Selecciona al menos un vehículo para transferir")

        transferidos: list[Vehiculo] = []
        for asignacion in command.asignaciones:
            vehiculo = await self.vehiculo_repository.obtener_por_id(
                asignacion.vehiculo_id,
                tenant.empresa_id,
                tenant.punto_emision_id,
            )
            if vehiculo is None:
                raise VehiculoNoEncontrado(f"El vehículo {asignacion.vehiculo_id} no existe en este punto")

            destino = await self.cliente_repository.obtener_por_id(
                asignacion.cliente_destino_id,
                tenant.empresa_id,
                tenant.punto_emision_id,
            )
            if destino is None or destino.id is None:
                raise ClienteNoEncontrado("El cliente destino no existe en este punto de emisión")

            if vehiculo.cliente_id == destino.id:
                continue

            vehiculo.cliente_id = destino.id
            transferidos.append(await self.vehiculo_repository.guardar(vehiculo))

        if not transferidos:
            raise TransferenciaInvalida("Los vehículos ya pertenecen al cliente seleccionado")

        return transferidos

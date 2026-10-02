from app.modules.clientes.application.dto import ContextoTenant, CrearVehiculoCommand
from app.modules.clientes.application.ports.repositorios import ClienteRepository, VehiculoRepository
from app.modules.clientes.domain.entities import Vehiculo
from app.modules.clientes.domain.exceptions import ClienteNoEncontrado, PlacaDuplicada, PlacaRequerida


class CrearVehiculoUseCase:
    def __init__(
        self,
        vehiculo_repository: VehiculoRepository,
        cliente_repository: ClienteRepository,
    ) -> None:
        self.vehiculo_repository = vehiculo_repository
        self.cliente_repository = cliente_repository

    async def execute(self, command: CrearVehiculoCommand, tenant: ContextoTenant) -> Vehiculo:
        placa = command.placa.strip().upper()
        if not placa:
            raise PlacaRequerida()

        cliente = await self.cliente_repository.obtener_por_id(
            command.cliente_id,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if cliente is None:
            raise ClienteNoEncontrado()

        existente = await self.vehiculo_repository.obtener_por_placa(
            placa,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if existente:
            raise PlacaDuplicada()

        vehiculo = Vehiculo(
            id=None,
            empresa_id=tenant.empresa_id,
            punto_emision_id=tenant.punto_emision_id,
            cliente_id=command.cliente_id,
            placa=placa,
            marca=command.marca.strip() if command.marca else None,
            modelo=command.modelo.strip() if command.modelo else None,
            anio=command.anio,
            tipo=command.tipo,
            color=command.color.strip() if command.color else None,
            combustible=command.combustible,
            cilindrada=command.cilindrada,
            transmision=command.transmision,
            notas=command.notas,
            activo=command.activo,
        )
        return await self.vehiculo_repository.guardar(vehiculo)

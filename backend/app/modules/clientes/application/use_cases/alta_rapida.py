from app.modules.clientes.application.dto import AltaRapidaCommand, ContextoTenant
from app.modules.clientes.application.ports.repositorios import ClienteRepository, VehiculoRepository
from app.modules.clientes.domain.entities import Cliente, TipoCliente, Vehiculo
from app.modules.clientes.domain.exceptions import (
    ClienteNoEncontrado,
    NombresRequeridos,
    PlacaDuplicada,
    PlacaRequerida,
)


class AltaRapidaClienteVehiculoUseCase:
    def __init__(self, cliente_repository: ClienteRepository, vehiculo_repository: VehiculoRepository) -> None:
        self.cliente_repository = cliente_repository
        self.vehiculo_repository = vehiculo_repository

    async def execute(self, command: AltaRapidaCommand, tenant: ContextoTenant) -> tuple[Cliente, Vehiculo]:
        placa = command.placa.strip().upper()
        if not placa:
            raise PlacaRequerida()
        duplicado = await self.vehiculo_repository.obtener_por_placa(placa, tenant.empresa_id, tenant.punto_emision_id)
        if duplicado:
            raise PlacaDuplicada()

        if command.cliente_id:
            cliente = await self.cliente_repository.obtener_por_id(
                command.cliente_id, tenant.empresa_id, tenant.punto_emision_id
            )
            if cliente is None:
                raise ClienteNoEncontrado()
        else:
            nombres = (command.nombres or "").strip()
            if len(nombres) < 2:
                raise NombresRequeridos()
            cliente = await self.cliente_repository.guardar(
                Cliente(
                    id=None,
                    empresa_id=tenant.empresa_id,
                    punto_emision_id=tenant.punto_emision_id,
                    identificacion=None,
                    tipo_cliente=TipoCliente.PERSONA_NATURAL,
                    nombres=nombres,
                    correos=[],
                )
            )

        vehiculo = await self.vehiculo_repository.guardar(
            Vehiculo(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                cliente_id=cliente.id or 0,
                placa=placa,
                cliente_nombres=cliente.nombres,
                cliente_identificacion=cliente.identificacion,
            )
        )
        return cliente, vehiculo

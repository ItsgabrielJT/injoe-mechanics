from app.modules.clientes.application.dto import ActualizarVehiculoCommand, ContextoTenant
from app.modules.clientes.application.ports.repositorios import VehiculoRepository
from app.modules.clientes.domain.entities import Vehiculo
from app.modules.clientes.domain.exceptions import PlacaDuplicada, PlacaRequerida, VehiculoNoEncontrado


class ActualizarVehiculoUseCase:
    def __init__(self, vehiculo_repository: VehiculoRepository) -> None:
        self.vehiculo_repository = vehiculo_repository

    async def execute(self, command: ActualizarVehiculoCommand, tenant: ContextoTenant) -> Vehiculo:
        vehiculo = await self.vehiculo_repository.obtener_por_id(
            command.vehiculo_id,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if vehiculo is None:
            raise VehiculoNoEncontrado()

        if command.placa is not None:
            placa = command.placa.strip().upper()
            if not placa:
                raise PlacaRequerida()
            duplicado = await self.vehiculo_repository.obtener_por_placa(
                placa,
                tenant.empresa_id,
                tenant.punto_emision_id,
            )
            if duplicado and duplicado.id != vehiculo.id:
                raise PlacaDuplicada()
            vehiculo.placa = placa

        if command.marca is not None:
            vehiculo.marca = command.marca.strip() or None
        if command.modelo is not None:
            vehiculo.modelo = command.modelo.strip() or None
        if command.anio is not None:
            vehiculo.anio = command.anio
        if command.tipo is not None:
            vehiculo.tipo = command.tipo
        if command.color is not None:
            vehiculo.color = command.color.strip() or None
        if command.combustible is not None:
            vehiculo.combustible = command.combustible
        if command.cilindrada is not None:
            vehiculo.cilindrada = command.cilindrada
        if command.transmision is not None:
            vehiculo.transmision = command.transmision
        if command.notas is not None:
            vehiculo.notas = command.notas or None
        if command.activo is not None:
            vehiculo.activo = command.activo

        return await self.vehiculo_repository.guardar(vehiculo)

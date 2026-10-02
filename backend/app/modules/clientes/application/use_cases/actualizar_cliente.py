from app.modules.clientes.application.dto import ActualizarClienteCommand, ContextoTenant
from app.modules.clientes.application.ports.repositorios import ClienteRepository
from app.modules.clientes.domain.entities import Cliente, correo_valido, identificacion_valida
from app.modules.clientes.domain.exceptions import (
    ClienteNoEncontrado,
    CorreoRequerido,
    IdentificacionDuplicada,
    IdentificacionInvalida,
    NombresRequeridos,
)


class ActualizarClienteUseCase:
    def __init__(self, cliente_repository: ClienteRepository) -> None:
        self.cliente_repository = cliente_repository

    async def execute(self, command: ActualizarClienteCommand, tenant: ContextoTenant) -> Cliente:
        cliente = await self.cliente_repository.obtener_por_id(
            command.cliente_id,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if cliente is None:
            raise ClienteNoEncontrado()

        if command.identificacion is not None:
            identificacion = command.identificacion.strip()
            if not identificacion_valida(identificacion):
                raise IdentificacionInvalida()
            duplicado = await self.cliente_repository.obtener_por_identificacion(
                identificacion,
                tenant.empresa_id,
                tenant.punto_emision_id,
            )
            if duplicado and duplicado.id != cliente.id:
                raise IdentificacionDuplicada()
            cliente.identificacion = identificacion

        if command.nombres is not None:
            nombres = command.nombres.strip()
            if len(nombres) < 2:
                raise NombresRequeridos()
            cliente.nombres = nombres

        if command.correos is not None:
            correos = [correo.strip() for correo in command.correos if correo.strip()]
            if not correos or not any(correo_valido(correo) for correo in correos):
                raise CorreoRequerido()
            cliente.correos = correos

        if command.tipo_cliente is not None:
            cliente.tipo_cliente = command.tipo_cliente
        if command.razon_social is not None:
            cliente.razon_social = command.razon_social.strip() or None
        if command.fecha_nacimiento is not None:
            cliente.fecha_nacimiento = command.fecha_nacimiento
        if command.provincia is not None:
            cliente.provincia = command.provincia or None
        if command.canton is not None:
            cliente.canton = command.canton or None
        if command.parroquia is not None:
            cliente.parroquia = command.parroquia or None
        if command.direcciones is not None:
            cliente.direcciones = [item.strip() for item in command.direcciones if item.strip()]
        if command.telefonos is not None:
            cliente.telefonos = [item.strip() for item in command.telefonos if item.strip()]
        if command.indice_direccion_principal is not None:
            cliente.indice_direccion_principal = command.indice_direccion_principal
        if command.indice_telefono_principal is not None:
            cliente.indice_telefono_principal = command.indice_telefono_principal
        if command.indice_correo_principal is not None:
            cliente.indice_correo_principal = command.indice_correo_principal
        if command.direccion_fiscal is not None:
            cliente.direccion_fiscal = command.direccion_fiscal or None
        if command.telefono_fiscal is not None:
            cliente.telefono_fiscal = command.telefono_fiscal or None
        if command.correo_fiscal is not None:
            cliente.correo_fiscal = command.correo_fiscal or None
        if command.notas is not None:
            cliente.notas = command.notas or None
        if command.activo is not None:
            cliente.activo = command.activo

        return await self.cliente_repository.guardar(cliente)

from app.modules.clientes.application.dto import ContextoTenant, CrearClienteCommand
from app.modules.clientes.application.ports.repositorios import ClienteRepository
from app.modules.clientes.domain.entities import Cliente, correo_valido, identificacion_valida
from app.modules.clientes.domain.exceptions import CorreoRequerido, IdentificacionDuplicada, IdentificacionInvalida, NombresRequeridos


class CrearClienteUseCase:
    def __init__(self, cliente_repository: ClienteRepository) -> None:
        self.cliente_repository = cliente_repository

    async def execute(self, command: CrearClienteCommand, tenant: ContextoTenant) -> Cliente:
        identificacion = command.identificacion.strip()
        nombres = command.nombres.strip()
        correos = [correo.strip() for correo in command.correos if correo.strip()]

        if not identificacion_valida(identificacion):
            raise IdentificacionInvalida()
        if len(nombres) < 2:
            raise NombresRequeridos()
        if not correos or not any(correo_valido(correo) for correo in correos):
            raise CorreoRequerido()

        existente = await self.cliente_repository.obtener_por_identificacion(
            identificacion,
            tenant.empresa_id,
            tenant.punto_emision_id,
        )
        if existente:
            raise IdentificacionDuplicada()

        cliente = Cliente(
            id=None,
            empresa_id=tenant.empresa_id,
            punto_emision_id=tenant.punto_emision_id,
            identificacion=identificacion,
            tipo_cliente=command.tipo_cliente,
            nombres=nombres,
            razon_social=command.razon_social.strip() if command.razon_social else None,
            fecha_nacimiento=command.fecha_nacimiento,
            provincia=command.provincia,
            canton=command.canton,
            parroquia=command.parroquia,
            direcciones=[item.strip() for item in command.direcciones if item.strip()],
            telefonos=[item.strip() for item in command.telefonos if item.strip()],
            correos=correos,
            indice_direccion_principal=command.indice_direccion_principal,
            indice_telefono_principal=command.indice_telefono_principal,
            indice_correo_principal=command.indice_correo_principal if command.indice_correo_principal is not None else 0,
            direccion_fiscal=command.direccion_fiscal,
            telefono_fiscal=command.telefono_fiscal,
            correo_fiscal=command.correo_fiscal,
            notas=command.notas,
            activo=command.activo,
        )
        return await self.cliente_repository.guardar(cliente)

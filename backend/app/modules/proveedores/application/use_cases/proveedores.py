from app.modules.proveedores.application.dto import (
    ActualizarProveedorCommand,
    ContextoTenant,
    ListarProveedoresQuery,
    CrearProveedorCommand,
)
from app.modules.proveedores.application.ports.repositorios import ProveedorRepository
from app.modules.proveedores.domain.entities import Proveedor, identificacion_valida, nombre_valido
from app.modules.proveedores.domain.exceptions import (
    IdentificacionDuplicada,
    IdentificacionInvalida,
    IdentificacionRequerida,
    NombreRequerido,
    ProveedorNoEncontrado,
    RecursoEnUso,
)


class CrearProveedorUseCase:
    def __init__(self, repository: ProveedorRepository) -> None:
        self.repository = repository

    async def execute(self, command: CrearProveedorCommand, tenant: ContextoTenant) -> Proveedor:
        identificacion = command.identificacion.strip()
        nombres = command.nombres.strip()
        if not identificacion:
            raise IdentificacionRequerida()
        if not identificacion_valida(identificacion):
            raise IdentificacionInvalida()
        if not nombre_valido(nombres):
            raise NombreRequerido()
        existente = await self.repository.obtener_por_identificacion(
            identificacion, tenant.empresa_id, tenant.punto_emision_id
        )
        if existente:
            raise IdentificacionDuplicada()
        return await self.repository.guardar(
            Proveedor(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                identificacion=identificacion,
                nombres=nombres,
                tipo_persona=command.tipo_persona,
                razon_social=command.razon_social.strip() if command.razon_social else None,
                direccion=command.direccion.strip() if command.direccion else None,
                telefono=command.telefono.strip() if command.telefono else None,
                correo=command.correo.strip() if command.correo else None,
                direccion_fiscal=command.direccion_fiscal.strip() if command.direccion_fiscal else None,
                telefono_fiscal=command.telefono_fiscal.strip() if command.telefono_fiscal else None,
                correo_fiscal=command.correo_fiscal.strip() if command.correo_fiscal else None,
                notas=command.notas.strip() if command.notas else None,
                activo=command.activo,
            )
        )


class ActualizarProveedorUseCase:
    def __init__(self, repository: ProveedorRepository) -> None:
        self.repository = repository

    async def execute(self, command: ActualizarProveedorCommand, tenant: ContextoTenant) -> Proveedor:
        proveedor = await self.repository.obtener_por_id(command.proveedor_id, tenant.empresa_id, tenant.punto_emision_id)
        if proveedor is None:
            raise ProveedorNoEncontrado()
        if command.identificacion is not None:
            identificacion = command.identificacion.strip()
            if not identificacion_valida(identificacion):
                raise IdentificacionInvalida()
            duplicado = await self.repository.obtener_por_identificacion(
                identificacion, tenant.empresa_id, tenant.punto_emision_id
            )
            if duplicado and duplicado.id != proveedor.id:
                raise IdentificacionDuplicada()
            proveedor.identificacion = identificacion
        if command.nombres is not None:
            if not nombre_valido(command.nombres):
                raise NombreRequerido()
            proveedor.nombres = command.nombres.strip()
        if command.tipo_persona is not None:
            proveedor.tipo_persona = command.tipo_persona
        if command.razon_social is not None:
            proveedor.razon_social = command.razon_social.strip() or None
        if command.direccion is not None:
            proveedor.direccion = command.direccion.strip() or None
        if command.telefono is not None:
            proveedor.telefono = command.telefono.strip() or None
        if command.correo is not None:
            proveedor.correo = command.correo.strip() or None
        if command.direccion_fiscal is not None:
            proveedor.direccion_fiscal = command.direccion_fiscal.strip() or None
        if command.telefono_fiscal is not None:
            proveedor.telefono_fiscal = command.telefono_fiscal.strip() or None
        if command.correo_fiscal is not None:
            proveedor.correo_fiscal = command.correo_fiscal.strip() or None
        if command.notas is not None:
            proveedor.notas = command.notas.strip() or None
        if command.activo is not None:
            proveedor.activo = command.activo
        return await self.repository.guardar(proveedor)


class ObtenerProveedorUseCase:
    def __init__(self, repository: ProveedorRepository) -> None:
        self.repository = repository

    async def execute(self, proveedor_id: int, tenant: ContextoTenant) -> Proveedor:
        proveedor = await self.repository.obtener_por_id(proveedor_id, tenant.empresa_id, tenant.punto_emision_id)
        if proveedor is None:
            raise ProveedorNoEncontrado()
        return proveedor


class ListarProveedoresUseCase:
    def __init__(self, repository: ProveedorRepository) -> None:
        self.repository = repository

    async def execute(self, query: ListarProveedoresQuery, tenant: ContextoTenant) -> tuple[list[Proveedor], int]:
        return await self.repository.listar(tenant.empresa_id, tenant.punto_emision_id, query)


class EliminarProveedorUseCase:
    def __init__(self, repository: ProveedorRepository) -> None:
        self.repository = repository

    async def execute(self, proveedor_id: int, tenant: ContextoTenant) -> None:
        proveedor = await self.repository.obtener_por_id(proveedor_id, tenant.empresa_id, tenant.punto_emision_id)
        if proveedor is None:
            raise ProveedorNoEncontrado()
        if await self.repository.esta_en_uso(proveedor_id):
            raise RecursoEnUso()
        await self.repository.eliminar(proveedor_id, tenant.empresa_id, tenant.punto_emision_id)


class CambiarEstadoProveedorUseCase:
    def __init__(self, repository: ProveedorRepository) -> None:
        self.repository = repository

    async def execute(self, proveedor_id: int, activo: bool, tenant: ContextoTenant) -> Proveedor:
        proveedor = await self.repository.obtener_por_id(proveedor_id, tenant.empresa_id, tenant.punto_emision_id)
        if proveedor is None:
            raise ProveedorNoEncontrado()
        proveedor.activo = activo
        return await self.repository.guardar(proveedor)

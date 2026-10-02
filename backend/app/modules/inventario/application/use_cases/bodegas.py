from app.modules.inventario.application.dto import (
    ActualizarBodegaCommand,
    ContextoTenant,
    CrearBodegaCommand,
    ListarCatalogoQuery,
)
from app.modules.inventario.application.ports.repositorios import BodegaRepository
from app.modules.inventario.domain.entities import BODEGA_NOMBRE_MAX, UBICACION_MAX, Bodega, nombre_valido
from app.modules.inventario.domain.exceptions import BodegaNoEncontrada, NombreDuplicado, NombreRequerido, RecursoEnUso


class CrearBodegaUseCase:
    def __init__(self, repository: BodegaRepository) -> None:
        self.repository = repository

    async def execute(self, command: CrearBodegaCommand, tenant: ContextoTenant) -> Bodega:
        nombre = command.nombre.strip()
        if not nombre_valido(nombre, 2, BODEGA_NOMBRE_MAX):
            raise NombreRequerido("El nombre de la bodega es obligatorio")
        ubicacion = command.ubicacion.strip() if command.ubicacion else None
        if ubicacion and len(ubicacion) > UBICACION_MAX:
            raise NombreRequerido("La ubicación no puede superar 255 caracteres")
        duplicado = await self.repository.obtener_por_nombre(nombre, tenant.empresa_id, tenant.punto_emision_id)
        if duplicado:
            raise NombreDuplicado("Ya existe una bodega con ese nombre en este punto")
        return await self.repository.guardar(
            Bodega(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                nombre=nombre,
                ubicacion=ubicacion,
                activo=command.activo,
            )
        )


class ActualizarBodegaUseCase:
    def __init__(self, repository: BodegaRepository) -> None:
        self.repository = repository

    async def execute(self, command: ActualizarBodegaCommand, tenant: ContextoTenant) -> Bodega:
        bodega = await self.repository.obtener_por_id(command.bodega_id, tenant.empresa_id, tenant.punto_emision_id)
        if bodega is None:
            raise BodegaNoEncontrada()
        if command.nombre is not None:
            nombre = command.nombre.strip()
            if not nombre_valido(nombre, 2, BODEGA_NOMBRE_MAX):
                raise NombreRequerido("El nombre de la bodega es obligatorio")
            duplicado = await self.repository.obtener_por_nombre(nombre, tenant.empresa_id, tenant.punto_emision_id)
            if duplicado and duplicado.id != bodega.id:
                raise NombreDuplicado("Ya existe una bodega con ese nombre en este punto")
            bodega.nombre = nombre
        if command.ubicacion is not None:
            bodega.ubicacion = command.ubicacion.strip() or None
        if command.activo is not None:
            bodega.activo = command.activo
        return await self.repository.guardar(bodega)


class EliminarBodegaUseCase:
    def __init__(self, repository: BodegaRepository) -> None:
        self.repository = repository

    async def execute(self, bodega_id: int, tenant: ContextoTenant) -> None:
        bodega = await self.repository.obtener_por_id(bodega_id, tenant.empresa_id, tenant.punto_emision_id)
        if bodega is None:
            raise BodegaNoEncontrada()
        if await self.repository.esta_en_uso(bodega_id):
            raise RecursoEnUso("No se puede eliminar la bodega porque tiene stock o movimientos")
        await self.repository.eliminar(bodega_id, tenant.empresa_id, tenant.punto_emision_id)


class ObtenerBodegaUseCase:
    def __init__(self, repository: BodegaRepository) -> None:
        self.repository = repository

    async def execute(self, bodega_id: int, tenant: ContextoTenant) -> Bodega:
        bodega = await self.repository.obtener_por_id(bodega_id, tenant.empresa_id, tenant.punto_emision_id)
        if bodega is None:
            raise BodegaNoEncontrada()
        return bodega


class ListarBodegasUseCase:
    def __init__(self, repository: BodegaRepository) -> None:
        self.repository = repository

    async def execute(self, query: ListarCatalogoQuery, tenant: ContextoTenant) -> tuple[list[Bodega], int]:
        return await self.repository.listar(tenant.empresa_id, tenant.punto_emision_id, query)

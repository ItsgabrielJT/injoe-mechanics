from app.modules.inventario.application.dto import (
    ActualizarCategoriaCommand,
    ContextoTenant,
    CrearCategoriaCommand,
    ListarCatalogoQuery,
)
from app.modules.inventario.application.ports.repositorios import CategoriaProductoRepository
from app.modules.inventario.domain.entities import CATEGORIA_NOMBRE_MAX, CategoriaProducto, descripcion_valida, nombre_valido
from app.modules.inventario.domain.exceptions import (
    CategoriaNoEncontrada,
    DescripcionExcedida,
    NombreDuplicado,
    NombreRequerido,
    RecursoEnUso,
)


class CrearCategoriaUseCase:
    def __init__(self, repository: CategoriaProductoRepository) -> None:
        self.repository = repository

    async def execute(self, command: CrearCategoriaCommand, tenant: ContextoTenant) -> CategoriaProducto:
        nombre = command.nombre.strip()
        if not nombre_valido(nombre, 2, CATEGORIA_NOMBRE_MAX):
            raise NombreRequerido("El nombre de la categoría es obligatorio")
        if not descripcion_valida(command.descripcion):
            raise DescripcionExcedida()
        duplicado = await self.repository.obtener_por_nombre(nombre, tenant.empresa_id, tenant.punto_emision_id)
        if duplicado:
            raise NombreDuplicado("Ya existe una categoría con ese nombre en este punto")
        return await self.repository.guardar(
            CategoriaProducto(
                id=None,
                empresa_id=tenant.empresa_id,
                punto_emision_id=tenant.punto_emision_id,
                nombre=nombre,
                descripcion=command.descripcion.strip() if command.descripcion else None,
                activo=command.activo,
            )
        )


class ActualizarCategoriaUseCase:
    def __init__(self, repository: CategoriaProductoRepository) -> None:
        self.repository = repository

    async def execute(self, command: ActualizarCategoriaCommand, tenant: ContextoTenant) -> CategoriaProducto:
        categoria = await self.repository.obtener_por_id(command.categoria_id, tenant.empresa_id, tenant.punto_emision_id)
        if categoria is None:
            raise CategoriaNoEncontrada()
        if command.nombre is not None:
            nombre = command.nombre.strip()
            if not nombre_valido(nombre, 2, CATEGORIA_NOMBRE_MAX):
                raise NombreRequerido("El nombre de la categoría es obligatorio")
            duplicado = await self.repository.obtener_por_nombre(nombre, tenant.empresa_id, tenant.punto_emision_id)
            if duplicado and duplicado.id != categoria.id:
                raise NombreDuplicado("Ya existe una categoría con ese nombre en este punto")
            categoria.nombre = nombre
        if command.descripcion is not None:
            descripcion = command.descripcion.strip() or None
            if not descripcion_valida(descripcion):
                raise DescripcionExcedida()
            categoria.descripcion = descripcion
        if command.activo is not None:
            categoria.activo = command.activo
        return await self.repository.guardar(categoria)


class EliminarCategoriaUseCase:
    def __init__(self, repository: CategoriaProductoRepository) -> None:
        self.repository = repository

    async def execute(self, categoria_id: int, tenant: ContextoTenant) -> None:
        categoria = await self.repository.obtener_por_id(categoria_id, tenant.empresa_id, tenant.punto_emision_id)
        if categoria is None:
            raise CategoriaNoEncontrada()
        if await self.repository.tiene_productos(categoria_id):
            raise RecursoEnUso("No se puede eliminar la categoría porque tiene productos asociados")
        await self.repository.eliminar(categoria_id, tenant.empresa_id, tenant.punto_emision_id)


class ObtenerCategoriaUseCase:
    def __init__(self, repository: CategoriaProductoRepository) -> None:
        self.repository = repository

    async def execute(self, categoria_id: int, tenant: ContextoTenant) -> CategoriaProducto:
        categoria = await self.repository.obtener_por_id(categoria_id, tenant.empresa_id, tenant.punto_emision_id)
        if categoria is None:
            raise CategoriaNoEncontrada()
        return categoria


class ListarCategoriasUseCase:
    def __init__(self, repository: CategoriaProductoRepository) -> None:
        self.repository = repository

    async def execute(self, query: ListarCatalogoQuery, tenant: ContextoTenant) -> tuple[list[CategoriaProducto], int]:
        return await self.repository.listar(tenant.empresa_id, tenant.punto_emision_id, query)

from decimal import Decimal

from app.modules.inventario.application.ports.repositorios import ProductoRepository
from app.modules.proveedores.application.dto import ContextoTenant, UpsertPrecioCommand
from app.modules.proveedores.application.ports.repositorios import PrecioProveedorRepository, ProveedorRepository
from app.modules.proveedores.domain.entities import PrecioProveedor
from app.modules.proveedores.domain.exceptions import (
    PrecioCompraInvalido,
    ProveedorNoEncontrado,
    RelacionDuplicada,
    RelacionNoEncontrada,
)
from app.modules.inventario.domain.exceptions import ProductoNoEncontrado
from app.modules.servicios.application.ports.repositorios import ServicioRepository
from app.modules.servicios.domain.exceptions import ServicioNoEncontrado


class ListarPreciosProductoUseCase:
    def __init__(self, precio_repository: PrecioProveedorRepository, producto_repository: ProductoRepository) -> None:
        self.precio_repository = precio_repository
        self.producto_repository = producto_repository

    async def execute(self, producto_id: int, tenant: ContextoTenant) -> list[PrecioProveedor]:
        producto = await self.producto_repository.obtener_por_id(producto_id, tenant.empresa_id, tenant.punto_emision_id)
        if producto is None:
            raise ProductoNoEncontrado()
        return await self.precio_repository.listar_producto(producto_id, tenant.empresa_id, tenant.punto_emision_id)


class ListarPreciosServicioUseCase:
    def __init__(self, precio_repository: PrecioProveedorRepository, servicio_repository: ServicioRepository) -> None:
        self.precio_repository = precio_repository
        self.servicio_repository = servicio_repository

    async def execute(self, servicio_id: int, tenant: ContextoTenant) -> list[PrecioProveedor]:
        servicio = await self.servicio_repository.obtener_por_id(servicio_id, tenant.empresa_id, tenant.punto_emision_id)
        if servicio is None:
            raise ServicioNoEncontrado()
        return await self.precio_repository.listar_servicio(servicio_id, tenant.empresa_id, tenant.punto_emision_id)


class UpsertPrecioUseCase:
    def __init__(
        self,
        precio_repository: PrecioProveedorRepository,
        proveedor_repository: ProveedorRepository,
        producto_repository: ProductoRepository,
        servicio_repository: ServicioRepository,
    ) -> None:
        self.precio_repository = precio_repository
        self.proveedor_repository = proveedor_repository
        self.producto_repository = producto_repository
        self.servicio_repository = servicio_repository

    async def execute(self, command: UpsertPrecioCommand, tenant: ContextoTenant) -> PrecioProveedor:
        if Decimal(command.precio_compra) < 0:
            raise PrecioCompraInvalido()
        proveedor = await self.proveedor_repository.obtener_por_id(
            command.proveedor_id, tenant.empresa_id, tenant.punto_emision_id
        )
        if proveedor is None:
            raise ProveedorNoEncontrado()

        existente: PrecioProveedor | None = None
        if command.relacion_id:
            existente = await self.precio_repository.obtener(command.relacion_id)
            if existente is None:
                raise RelacionNoEncontrada()
        elif command.producto_id:
            producto = await self.producto_repository.obtener_por_id(
                command.producto_id, tenant.empresa_id, tenant.punto_emision_id
            )
            if producto is None:
                raise ProductoNoEncontrado()
            existente = await self.precio_repository.obtener_par_producto(command.producto_id, command.proveedor_id)
        elif command.servicio_id:
            servicio = await self.servicio_repository.obtener_por_id(
                command.servicio_id, tenant.empresa_id, tenant.punto_emision_id
            )
            if servicio is None:
                raise ServicioNoEncontrado()
            existente = await self.precio_repository.obtener_par_servicio(command.servicio_id, command.proveedor_id)
        else:
            raise RelacionNoEncontrada("Debes indicar producto o servicio")

        if existente and command.relacion_id is None:
            existente.precio_compra = Decimal(command.precio_compra)
            if command.es_principal:
                existente.es_principal = True
            return await self.precio_repository.guardar(existente)

        if command.relacion_id and existente:
            if command.producto_id and existente.producto_id != command.producto_id:
                raise RelacionNoEncontrada()
            if command.servicio_id and existente.servicio_id != command.servicio_id:
                raise RelacionNoEncontrada()
            par = None
            if command.producto_id:
                par = await self.precio_repository.obtener_par_producto(command.producto_id, command.proveedor_id)
            if command.servicio_id:
                par = await self.precio_repository.obtener_par_servicio(command.servicio_id, command.proveedor_id)
            if par and par.id != existente.id:
                raise RelacionDuplicada()
            existente.proveedor_id = command.proveedor_id
            existente.precio_compra = Decimal(command.precio_compra)
            existente.es_principal = command.es_principal
            return await self.precio_repository.guardar(existente)

        return await self.precio_repository.guardar(
            PrecioProveedor(
                id=None,
                proveedor_id=command.proveedor_id,
                precio_compra=Decimal(command.precio_compra),
                es_principal=command.es_principal,
                producto_id=command.producto_id,
                servicio_id=command.servicio_id,
            )
        )


class EliminarPrecioUseCase:
    def __init__(self, precio_repository: PrecioProveedorRepository) -> None:
        self.precio_repository = precio_repository

    async def execute(self, relacion_id: int, catalogo_id: int, es_producto: bool) -> None:
        existente = await self.precio_repository.obtener(relacion_id)
        if existente is None:
            raise RelacionNoEncontrada()
        if es_producto and existente.producto_id != catalogo_id:
            raise RelacionNoEncontrada()
        if not es_producto and existente.servicio_id != catalogo_id:
            raise RelacionNoEncontrada()
        await self.precio_repository.eliminar(relacion_id)

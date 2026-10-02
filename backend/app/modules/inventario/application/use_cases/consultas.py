from datetime import datetime
from decimal import Decimal

from app.modules.inventario.application.dto import ContextoTenant, ListarMovimientosQuery, ListarReporteProductosQuery
from app.modules.inventario.application.ports.repositorios import MovimientoInventarioRepository, ProductoRepository
from app.modules.inventario.domain.entities import AlertaStock, Existencia, ItemKardex, MovimientoInventario, Producto, TipoMovimiento
from app.modules.inventario.domain.exceptions import ProductoNoEncontrado


class ListarAlertasUseCase:
    def __init__(self, producto_repository: ProductoRepository) -> None:
        self.producto_repository = producto_repository

    async def execute(self, tenant: ContextoTenant) -> list[AlertaStock]:
        return await self.producto_repository.alertas(tenant.empresa_id, tenant.punto_emision_id)


class ListarExistenciasUseCase:
    def __init__(self, producto_repository: ProductoRepository) -> None:
        self.producto_repository = producto_repository

    async def execute(self, producto_id: int, tenant: ContextoTenant) -> list[Existencia]:
        producto = await self.producto_repository.obtener_por_id(producto_id, tenant.empresa_id, tenant.punto_emision_id)
        if producto is None:
            raise ProductoNoEncontrado()
        return await self.producto_repository.existencias(producto_id)


class ListarKardexUseCase:
    def __init__(self, producto_repository: ProductoRepository) -> None:
        self.producto_repository = producto_repository

    async def execute(self, producto_id: int, tenant: ContextoTenant) -> list[ItemKardex]:
        producto = await self.producto_repository.obtener_por_id(producto_id, tenant.empresa_id, tenant.punto_emision_id)
        if producto is None:
            raise ProductoNoEncontrado()
        return await self.producto_repository.kardex(producto_id, tenant.empresa_id, tenant.punto_emision_id)


def _involucra_bodega(item: ItemKardex, bodega_ids: list[int] | None) -> bool:
    if not bodega_ids:
        return True
    if item.bodega_id in bodega_ids:
        return True
    return item.bodega_destino_id is not None and item.bodega_destino_id in bodega_ids


def _en_rango(item: ItemKardex, fecha_desde: datetime | None, fecha_hasta: datetime | None) -> bool:
    if fecha_desde and item.creado_en < fecha_desde:
        return False
    if fecha_hasta and item.creado_en > fecha_hasta:
        return False
    return True


def _aplicar_movimiento(stock_por_bodega: dict[int, Decimal], item: ItemKardex) -> None:
    stock_por_bodega[item.bodega_id] = item.stock_origen_despues
    if item.tipo == TipoMovimiento.TRANSFERENCIA and item.bodega_destino_id is not None and item.stock_destino_despues is not None:
        stock_por_bodega[item.bodega_destino_id] = item.stock_destino_despues


def _nombres_bodega(existencias: list[Existencia], kardex: list[ItemKardex]) -> dict[int, str]:
    nombres: dict[int, str] = {}
    for existencia in existencias:
        if existencia.bodega_nombre:
            nombres[existencia.bodega_id] = existencia.bodega_nombre
    for item in kardex:
        if item.bodega_nombre:
            nombres[item.bodega_id] = item.bodega_nombre
        if item.bodega_destino_id is not None and item.bodega_destino_nombre:
            nombres[item.bodega_destino_id] = item.bodega_destino_nombre
    return nombres


def stock_por_bodega_al_corte(
    producto_id: int,
    kardex: list[ItemKardex],
    existencias: list[Existencia],
    fecha_hasta: datetime | None,
    bodega_ids: list[int] | None,
) -> list[Existencia]:
    if fecha_hasta is None:
        return [item for item in existencias if not bodega_ids or item.bodega_id in bodega_ids]
    stock: dict[int, Decimal] = {}
    cronologico = sorted(kardex, key=lambda item: (item.creado_en, item.movimiento_id))
    for item in cronologico:
        if item.creado_en > fecha_hasta:
            continue
        _aplicar_movimiento(stock, item)
    nombres = _nombres_bodega(existencias, kardex)
    ids = bodega_ids if bodega_ids else sorted({*stock.keys(), *[item.bodega_id for item in existencias]})
    return [
        Existencia(
            producto_id=producto_id,
            bodega_id=bodega_id,
            cantidad=stock.get(bodega_id, Decimal("0")),
            bodega_nombre=nombres.get(bodega_id),
        )
        for bodega_id in ids
    ]


class FilaReporteProducto:
    def __init__(
        self,
        producto: Producto,
        kardex: list[ItemKardex],
        existencias: list[Existencia],
        stock_corte: Decimal,
    ) -> None:
        self.producto = producto
        self.kardex = kardex
        self.existencias = existencias
        self.stock_corte = stock_corte


class ReporteProductosUseCase:
    def __init__(self, producto_repository: ProductoRepository) -> None:
        self.producto_repository = producto_repository

    async def execute(
        self, query: ListarReporteProductosQuery, tenant: ContextoTenant
    ) -> tuple[list[FilaReporteProducto], int]:
        productos, total = await self.producto_repository.reporte(
            tenant.empresa_id, tenant.punto_emision_id, query
        )
        filas: list[FilaReporteProducto] = []
        for producto in productos:
            producto_id = producto.id or 0
            kardex = await self.producto_repository.kardex(producto_id, tenant.empresa_id, tenant.punto_emision_id)
            existencias = await self.producto_repository.existencias(producto_id)
            existencias_corte = stock_por_bodega_al_corte(
                producto_id, kardex, existencias, query.fecha_hasta, query.bodega_ids
            )
            kardex_visible = [
                item
                for item in kardex
                if _involucra_bodega(item, query.bodega_ids) and _en_rango(item, query.fecha_desde, query.fecha_hasta)
            ]
            stock_corte = sum((item.cantidad for item in existencias_corte), Decimal("0"))
            filas.append(FilaReporteProducto(producto, kardex_visible, existencias_corte, stock_corte))
        return filas, total


class ReporteMovimientosUseCase:
    def __init__(self, movimiento_repository: MovimientoInventarioRepository) -> None:
        self.movimiento_repository = movimiento_repository

    async def execute(self, query: ListarMovimientosQuery, tenant: ContextoTenant) -> list[MovimientoInventario]:
        return await self.movimiento_repository.reporte(tenant.empresa_id, tenant.punto_emision_id, query)

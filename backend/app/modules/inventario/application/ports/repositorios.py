from typing import Protocol

from app.modules.inventario.application.dto import (
    ListarCatalogoQuery,
    ListarMovimientosQuery,
    ListarProductosQuery,
    ListarReporteProductosQuery,
)
from app.modules.inventario.domain.entities import (
    AlertaStock,
    Bodega,
    CategoriaProducto,
    Existencia,
    ItemKardex,
    MovimientoInventario,
    Producto,
)


class CategoriaProductoRepository(Protocol):
    async def obtener_por_id(
        self, categoria_id: int, empresa_id: int, punto_emision_id: int
    ) -> CategoriaProducto | None: ...

    async def obtener_por_nombre(
        self, nombre: str, empresa_id: int, punto_emision_id: int
    ) -> CategoriaProducto | None: ...

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarCatalogoQuery
    ) -> tuple[list[CategoriaProducto], int]: ...

    async def guardar(self, categoria: CategoriaProducto) -> CategoriaProducto: ...

    async def eliminar(self, categoria_id: int, empresa_id: int, punto_emision_id: int) -> bool: ...

    async def tiene_productos(self, categoria_id: int) -> bool: ...


class BodegaRepository(Protocol):
    async def obtener_por_id(self, bodega_id: int, empresa_id: int, punto_emision_id: int) -> Bodega | None: ...

    async def obtener_por_nombre(self, nombre: str, empresa_id: int, punto_emision_id: int) -> Bodega | None: ...

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarCatalogoQuery
    ) -> tuple[list[Bodega], int]: ...

    async def guardar(self, bodega: Bodega) -> Bodega: ...

    async def eliminar(self, bodega_id: int, empresa_id: int, punto_emision_id: int) -> bool: ...

    async def esta_en_uso(self, bodega_id: int) -> bool: ...


class ProductoRepository(Protocol):
    async def obtener_por_id(self, producto_id: int, empresa_id: int, punto_emision_id: int) -> Producto | None: ...

    async def obtener_por_codigo(self, codigo: str, empresa_id: int, punto_emision_id: int) -> Producto | None: ...

    async def obtener_por_codigo_barras(
        self, codigo_barras: str, empresa_id: int, punto_emision_id: int
    ) -> Producto | None: ...

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarProductosQuery
    ) -> tuple[list[Producto], int]: ...

    async def guardar(self, producto: Producto) -> Producto: ...

    async def eliminar(self, producto_id: int, empresa_id: int, punto_emision_id: int) -> bool: ...

    async def tiene_movimientos(self, producto_id: int) -> bool: ...

    async def existencias(self, producto_id: int) -> list[Existencia]: ...

    async def kardex(self, producto_id: int, empresa_id: int, punto_emision_id: int) -> list[ItemKardex]: ...

    async def alertas(self, empresa_id: int, punto_emision_id: int) -> list[AlertaStock]: ...

    async def reporte(
        self, empresa_id: int, punto_emision_id: int, query: ListarReporteProductosQuery
    ) -> tuple[list[Producto], int]: ...


class MovimientoInventarioRepository(Protocol):
    async def obtener_por_id(
        self, movimiento_id: int, empresa_id: int, punto_emision_id: int
    ) -> MovimientoInventario | None: ...

    async def obtener_por_codigo(
        self, codigo: str, empresa_id: int, punto_emision_id: int
    ) -> MovimientoInventario | None: ...

    async def listar(
        self, empresa_id: int, punto_emision_id: int, query: ListarMovimientosQuery
    ) -> tuple[list[MovimientoInventario], int]: ...

    async def registrar(self, movimiento: MovimientoInventario) -> MovimientoInventario: ...

    async def reporte(
        self, empresa_id: int, punto_emision_id: int, query: ListarMovimientosQuery
    ) -> list[MovimientoInventario]: ...

    async def listar_por_nota_prefijo(
        self, prefijo: str, empresa_id: int, punto_emision_id: int
    ) -> list[MovimientoInventario]: ...

    async def existe_por_nota(self, prefijo: str, empresa_id: int, punto_emision_id: int) -> bool: ...

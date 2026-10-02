from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.modules.acceso.presentation.api.dependencies import get_payload_autenticado
from app.modules.inventario.application.dto import ContextoTenant
from app.modules.inventario.application.use_cases.bodegas import (
    ActualizarBodegaUseCase,
    CrearBodegaUseCase,
    EliminarBodegaUseCase,
    ListarBodegasUseCase,
    ObtenerBodegaUseCase,
)
from app.modules.inventario.application.use_cases.categorias import (
    ActualizarCategoriaUseCase,
    CrearCategoriaUseCase,
    EliminarCategoriaUseCase,
    ListarCategoriasUseCase,
    ObtenerCategoriaUseCase,
)
from app.modules.inventario.application.use_cases.consultas import (
    ListarAlertasUseCase,
    ListarExistenciasUseCase,
    ListarKardexUseCase,
    ReporteMovimientosUseCase,
    ReporteProductosUseCase,
)
from app.modules.inventario.application.use_cases.movimientos import (
    ListarMovimientosUseCase,
    ObtenerMovimientoUseCase,
    RegistrarMovimientoUseCase,
)
from app.modules.inventario.application.use_cases.productos import (
    ActualizarProductoUseCase,
    CrearProductoUseCase,
    EliminarProductoUseCase,
    ListarProductosUseCase,
    ObtenerProductoUseCase,
)
from app.modules.inventario.infrastructure.persistence.repositories import (
    SqlAlchemyBodegaRepository,
    SqlAlchemyCategoriaRepository,
    SqlAlchemyMovimientoRepository,
    SqlAlchemyProductoRepository,
)
from app.shared.domain.exceptions import SesionSinContexto


def get_tenant(payload: Annotated[dict, Depends(get_payload_autenticado)]) -> ContextoTenant:
    empresa_id = payload.get("empresa_id")
    punto_emision_id = payload.get("punto_emision_id")
    if empresa_id is None or punto_emision_id is None:
        raise SesionSinContexto()
    return ContextoTenant(empresa_id=int(empresa_id), punto_emision_id=int(punto_emision_id))


async def get_categoria_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyCategoriaRepository:
    return SqlAlchemyCategoriaRepository(session)


async def get_bodega_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyBodegaRepository:
    return SqlAlchemyBodegaRepository(session)


async def get_producto_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyProductoRepository:
    return SqlAlchemyProductoRepository(session)


async def get_movimiento_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyMovimientoRepository:
    return SqlAlchemyMovimientoRepository(session)


async def get_crear_categoria_use_case(
    repository: Annotated[SqlAlchemyCategoriaRepository, Depends(get_categoria_repository)],
) -> CrearCategoriaUseCase:
    return CrearCategoriaUseCase(repository)


async def get_actualizar_categoria_use_case(
    repository: Annotated[SqlAlchemyCategoriaRepository, Depends(get_categoria_repository)],
) -> ActualizarCategoriaUseCase:
    return ActualizarCategoriaUseCase(repository)


async def get_eliminar_categoria_use_case(
    repository: Annotated[SqlAlchemyCategoriaRepository, Depends(get_categoria_repository)],
) -> EliminarCategoriaUseCase:
    return EliminarCategoriaUseCase(repository)


async def get_obtener_categoria_use_case(
    repository: Annotated[SqlAlchemyCategoriaRepository, Depends(get_categoria_repository)],
) -> ObtenerCategoriaUseCase:
    return ObtenerCategoriaUseCase(repository)


async def get_listar_categorias_use_case(
    repository: Annotated[SqlAlchemyCategoriaRepository, Depends(get_categoria_repository)],
) -> ListarCategoriasUseCase:
    return ListarCategoriasUseCase(repository)


async def get_crear_bodega_use_case(
    repository: Annotated[SqlAlchemyBodegaRepository, Depends(get_bodega_repository)],
) -> CrearBodegaUseCase:
    return CrearBodegaUseCase(repository)


async def get_actualizar_bodega_use_case(
    repository: Annotated[SqlAlchemyBodegaRepository, Depends(get_bodega_repository)],
) -> ActualizarBodegaUseCase:
    return ActualizarBodegaUseCase(repository)


async def get_eliminar_bodega_use_case(
    repository: Annotated[SqlAlchemyBodegaRepository, Depends(get_bodega_repository)],
) -> EliminarBodegaUseCase:
    return EliminarBodegaUseCase(repository)


async def get_obtener_bodega_use_case(
    repository: Annotated[SqlAlchemyBodegaRepository, Depends(get_bodega_repository)],
) -> ObtenerBodegaUseCase:
    return ObtenerBodegaUseCase(repository)


async def get_listar_bodegas_use_case(
    repository: Annotated[SqlAlchemyBodegaRepository, Depends(get_bodega_repository)],
) -> ListarBodegasUseCase:
    return ListarBodegasUseCase(repository)


async def get_crear_producto_use_case(
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
    categoria_repository: Annotated[SqlAlchemyCategoriaRepository, Depends(get_categoria_repository)],
    bodega_repository: Annotated[SqlAlchemyBodegaRepository, Depends(get_bodega_repository)],
    movimiento_repository: Annotated[SqlAlchemyMovimientoRepository, Depends(get_movimiento_repository)],
) -> CrearProductoUseCase:
    return CrearProductoUseCase(producto_repository, categoria_repository, bodega_repository, movimiento_repository)


async def get_actualizar_producto_use_case(
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
    categoria_repository: Annotated[SqlAlchemyCategoriaRepository, Depends(get_categoria_repository)],
) -> ActualizarProductoUseCase:
    return ActualizarProductoUseCase(producto_repository, categoria_repository)


async def get_eliminar_producto_use_case(
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
) -> EliminarProductoUseCase:
    return EliminarProductoUseCase(producto_repository)


async def get_obtener_producto_use_case(
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
) -> ObtenerProductoUseCase:
    return ObtenerProductoUseCase(producto_repository)


async def get_listar_productos_use_case(
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
) -> ListarProductosUseCase:
    return ListarProductosUseCase(producto_repository)


async def get_listar_alertas_use_case(
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
) -> ListarAlertasUseCase:
    return ListarAlertasUseCase(producto_repository)


async def get_listar_existencias_use_case(
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
) -> ListarExistenciasUseCase:
    return ListarExistenciasUseCase(producto_repository)


async def get_listar_kardex_use_case(
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
) -> ListarKardexUseCase:
    return ListarKardexUseCase(producto_repository)


async def get_reporte_productos_use_case(
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
) -> ReporteProductosUseCase:
    return ReporteProductosUseCase(producto_repository)


async def get_registrar_movimiento_use_case(
    movimiento_repository: Annotated[SqlAlchemyMovimientoRepository, Depends(get_movimiento_repository)],
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
    bodega_repository: Annotated[SqlAlchemyBodegaRepository, Depends(get_bodega_repository)],
) -> RegistrarMovimientoUseCase:
    return RegistrarMovimientoUseCase(movimiento_repository, producto_repository, bodega_repository)


async def get_obtener_movimiento_use_case(
    movimiento_repository: Annotated[SqlAlchemyMovimientoRepository, Depends(get_movimiento_repository)],
) -> ObtenerMovimientoUseCase:
    return ObtenerMovimientoUseCase(movimiento_repository)


async def get_listar_movimientos_use_case(
    movimiento_repository: Annotated[SqlAlchemyMovimientoRepository, Depends(get_movimiento_repository)],
) -> ListarMovimientosUseCase:
    return ListarMovimientosUseCase(movimiento_repository)


async def get_reporte_movimientos_use_case(
    movimiento_repository: Annotated[SqlAlchemyMovimientoRepository, Depends(get_movimiento_repository)],
) -> ReporteMovimientosUseCase:
    return ReporteMovimientosUseCase(movimiento_repository)

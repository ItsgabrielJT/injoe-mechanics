from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.modules.acceso.presentation.api.dependencies import get_payload_autenticado
from app.modules.facturacion.application.dto import ContextoTenant
from app.modules.facturacion.application.use_cases.gestionar_facturas import (
    CancelarFacturaUseCase,
    CrearDesdeOrdenUseCase,
    EliminarFacturaUseCase,
    EnviarSriUseCase,
    EstadisticasFacturaUseCase,
    GuardarFacturaUseCase,
    ListarFacturasUseCase,
    ObtenerFacturaUseCase,
)
from app.modules.facturacion.infrastructure.persistence.repositories import SqlAlchemyFacturaRepository
from app.modules.inventario.infrastructure.persistence.repositories import (
    SqlAlchemyMovimientoRepository,
    SqlAlchemyProductoRepository,
)
from app.modules.ordenes_trabajo.infrastructure.persistence.repositories import SqlAlchemyOrdenTrabajoRepository
from app.shared.domain.exceptions import SesionSinContexto


def get_tenant(payload: Annotated[dict, Depends(get_payload_autenticado)]) -> ContextoTenant:
    empresa_id = payload.get("empresa_id")
    punto_emision_id = payload.get("punto_emision_id")
    usuario_id = payload.get("sub")
    if empresa_id is None or punto_emision_id is None or usuario_id is None:
        raise SesionSinContexto()
    return ContextoTenant(empresa_id=int(empresa_id), punto_emision_id=int(punto_emision_id), usuario_id=int(usuario_id))


async def get_factura_repo(session: Annotated[AsyncSession, Depends(get_db_session)]) -> SqlAlchemyFacturaRepository:
    return SqlAlchemyFacturaRepository(session)


async def get_orden_repo(session: Annotated[AsyncSession, Depends(get_db_session)]) -> SqlAlchemyOrdenTrabajoRepository:
    return SqlAlchemyOrdenTrabajoRepository(session)


async def get_listar(repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)]) -> ListarFacturasUseCase:
    return ListarFacturasUseCase(repo)


async def get_obtener(repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)]) -> ObtenerFacturaUseCase:
    return ObtenerFacturaUseCase(repo)


async def get_guardar(repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)]) -> GuardarFacturaUseCase:
    return GuardarFacturaUseCase(repo)


async def get_eliminar(repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)]) -> EliminarFacturaUseCase:
    return EliminarFacturaUseCase(repo)


async def get_producto_repo(session: Annotated[AsyncSession, Depends(get_db_session)]) -> SqlAlchemyProductoRepository:
    return SqlAlchemyProductoRepository(session)


async def get_movimiento_repo(session: Annotated[AsyncSession, Depends(get_db_session)]) -> SqlAlchemyMovimientoRepository:
    return SqlAlchemyMovimientoRepository(session)


async def get_enviar(
    repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)],
    productos: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repo)],
    movimientos: Annotated[SqlAlchemyMovimientoRepository, Depends(get_movimiento_repo)],
) -> EnviarSriUseCase:
    return EnviarSriUseCase(repo, productos, movimientos)


async def get_cancelar(
    repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)],
    movimientos: Annotated[SqlAlchemyMovimientoRepository, Depends(get_movimiento_repo)],
) -> CancelarFacturaUseCase:
    return CancelarFacturaUseCase(repo, movimientos)


async def get_estadisticas(
    repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)],
) -> EstadisticasFacturaUseCase:
    return EstadisticasFacturaUseCase(repo)


async def get_desde_orden(
    repo: Annotated[SqlAlchemyFacturaRepository, Depends(get_factura_repo)],
    ordenes: Annotated[SqlAlchemyOrdenTrabajoRepository, Depends(get_orden_repo)],
) -> CrearDesdeOrdenUseCase:
    return CrearDesdeOrdenUseCase(repo, ordenes)

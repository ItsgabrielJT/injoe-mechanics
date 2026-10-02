from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.modules.acceso.presentation.api.dependencies import get_payload_autenticado
from app.modules.clientes.infrastructure.persistence.repositories import (
    SqlAlchemyClienteRepository,
    SqlAlchemyVehiculoRepository,
)
from app.modules.identidad.infrastructure.persistence.repositories import SqlAlchemyUsuarioRepository
from app.modules.inventario.infrastructure.persistence.repositories import (
    SqlAlchemyBodegaRepository,
    SqlAlchemyMovimientoRepository,
    SqlAlchemyProductoRepository,
)
from app.modules.ordenes_trabajo.application.dto import ContextoTenant
from app.modules.ordenes_trabajo.application.use_cases.ordenes import (
    CerrarOrdenUseCase,
    EliminarOrdenUseCase,
    GuardarOrdenUseCase,
    ListarOrdenesUseCase,
    ObtenerOrdenUseCase,
)
from app.modules.ordenes_trabajo.infrastructure.persistence.repositories import SqlAlchemyOrdenTrabajoRepository
from app.modules.proveedores.application.use_cases.precios import UpsertPrecioUseCase
from app.modules.proveedores.infrastructure.persistence.repositories import (
    SqlAlchemyPrecioProveedorRepository,
    SqlAlchemyProveedorRepository,
)
from app.modules.servicios.infrastructure.persistence.repositories import SqlAlchemyServicioRepository
from app.shared.domain.exceptions import SesionSinContexto


def get_tenant(payload: Annotated[dict, Depends(get_payload_autenticado)]) -> ContextoTenant:
    empresa_id = payload.get("empresa_id")
    punto_emision_id = payload.get("punto_emision_id")
    if empresa_id is None or punto_emision_id is None:
        raise SesionSinContexto()
    return ContextoTenant(empresa_id=int(empresa_id), punto_emision_id=int(punto_emision_id))


async def get_orden_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyOrdenTrabajoRepository:
    return SqlAlchemyOrdenTrabajoRepository(session)


async def get_guardar_orden_use_case(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> GuardarOrdenUseCase:
    return GuardarOrdenUseCase(
        SqlAlchemyOrdenTrabajoRepository(session),
        SqlAlchemyClienteRepository(session),
        SqlAlchemyVehiculoRepository(session),
        SqlAlchemyUsuarioRepository(session),
        SqlAlchemyProductoRepository(session),
        SqlAlchemyServicioRepository(session),
        SqlAlchemyProveedorRepository(session),
        SqlAlchemyBodegaRepository(session),
        UpsertPrecioUseCase(
            SqlAlchemyPrecioProveedorRepository(session),
            SqlAlchemyProveedorRepository(session),
            SqlAlchemyProductoRepository(session),
            SqlAlchemyServicioRepository(session),
        ),
    )


async def get_obtener_orden_use_case(
    repository: Annotated[SqlAlchemyOrdenTrabajoRepository, Depends(get_orden_repository)],
) -> ObtenerOrdenUseCase:
    return ObtenerOrdenUseCase(repository)


async def get_listar_ordenes_use_case(
    repository: Annotated[SqlAlchemyOrdenTrabajoRepository, Depends(get_orden_repository)],
) -> ListarOrdenesUseCase:
    return ListarOrdenesUseCase(repository)


async def get_eliminar_orden_use_case(
    repository: Annotated[SqlAlchemyOrdenTrabajoRepository, Depends(get_orden_repository)],
) -> EliminarOrdenUseCase:
    return EliminarOrdenUseCase(repository)


async def get_cerrar_orden_use_case(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> CerrarOrdenUseCase:
    return CerrarOrdenUseCase(
        SqlAlchemyOrdenTrabajoRepository(session),
        SqlAlchemyProductoRepository(session),
        SqlAlchemyMovimientoRepository(session),
    )

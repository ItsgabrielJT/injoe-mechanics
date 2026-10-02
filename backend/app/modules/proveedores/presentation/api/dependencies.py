from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.modules.acceso.presentation.api.dependencies import get_payload_autenticado
from app.modules.inventario.infrastructure.persistence.repositories import SqlAlchemyProductoRepository
from app.modules.proveedores.application.dto import ContextoTenant
from app.modules.proveedores.application.use_cases.precios import (
    EliminarPrecioUseCase,
    ListarPreciosProductoUseCase,
    ListarPreciosServicioUseCase,
    UpsertPrecioUseCase,
)
from app.modules.proveedores.application.use_cases.proveedores import (
    ActualizarProveedorUseCase,
    CambiarEstadoProveedorUseCase,
    CrearProveedorUseCase,
    EliminarProveedorUseCase,
    ListarProveedoresUseCase,
    ObtenerProveedorUseCase,
)
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


async def get_proveedor_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyProveedorRepository:
    return SqlAlchemyProveedorRepository(session)


async def get_precio_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyPrecioProveedorRepository:
    return SqlAlchemyPrecioProveedorRepository(session)


async def get_producto_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyProductoRepository:
    return SqlAlchemyProductoRepository(session)


async def get_servicio_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyServicioRepository:
    return SqlAlchemyServicioRepository(session)


async def get_crear_proveedor_use_case(
    repository: Annotated[SqlAlchemyProveedorRepository, Depends(get_proveedor_repository)],
) -> CrearProveedorUseCase:
    return CrearProveedorUseCase(repository)


async def get_actualizar_proveedor_use_case(
    repository: Annotated[SqlAlchemyProveedorRepository, Depends(get_proveedor_repository)],
) -> ActualizarProveedorUseCase:
    return ActualizarProveedorUseCase(repository)


async def get_obtener_proveedor_use_case(
    repository: Annotated[SqlAlchemyProveedorRepository, Depends(get_proveedor_repository)],
) -> ObtenerProveedorUseCase:
    return ObtenerProveedorUseCase(repository)


async def get_listar_proveedores_use_case(
    repository: Annotated[SqlAlchemyProveedorRepository, Depends(get_proveedor_repository)],
) -> ListarProveedoresUseCase:
    return ListarProveedoresUseCase(repository)


async def get_eliminar_proveedor_use_case(
    repository: Annotated[SqlAlchemyProveedorRepository, Depends(get_proveedor_repository)],
) -> EliminarProveedorUseCase:
    return EliminarProveedorUseCase(repository)


async def get_cambiar_estado_proveedor_use_case(
    repository: Annotated[SqlAlchemyProveedorRepository, Depends(get_proveedor_repository)],
) -> CambiarEstadoProveedorUseCase:
    return CambiarEstadoProveedorUseCase(repository)


async def get_listar_precios_producto_use_case(
    precio_repository: Annotated[SqlAlchemyPrecioProveedorRepository, Depends(get_precio_repository)],
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
) -> ListarPreciosProductoUseCase:
    return ListarPreciosProductoUseCase(precio_repository, producto_repository)


async def get_listar_precios_servicio_use_case(
    precio_repository: Annotated[SqlAlchemyPrecioProveedorRepository, Depends(get_precio_repository)],
    servicio_repository: Annotated[SqlAlchemyServicioRepository, Depends(get_servicio_repository)],
) -> ListarPreciosServicioUseCase:
    return ListarPreciosServicioUseCase(precio_repository, servicio_repository)


async def get_upsert_precio_use_case(
    precio_repository: Annotated[SqlAlchemyPrecioProveedorRepository, Depends(get_precio_repository)],
    proveedor_repository: Annotated[SqlAlchemyProveedorRepository, Depends(get_proveedor_repository)],
    producto_repository: Annotated[SqlAlchemyProductoRepository, Depends(get_producto_repository)],
    servicio_repository: Annotated[SqlAlchemyServicioRepository, Depends(get_servicio_repository)],
) -> UpsertPrecioUseCase:
    return UpsertPrecioUseCase(precio_repository, proveedor_repository, producto_repository, servicio_repository)


async def get_eliminar_precio_use_case(
    precio_repository: Annotated[SqlAlchemyPrecioProveedorRepository, Depends(get_precio_repository)],
) -> EliminarPrecioUseCase:
    return EliminarPrecioUseCase(precio_repository)

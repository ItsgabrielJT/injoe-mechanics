from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.modules.acceso.presentation.api.dependencies import get_payload_autenticado
from app.modules.servicios.application.dto import ContextoTenant
from app.modules.servicios.application.use_cases.actualizar_servicio import ActualizarServicioUseCase
from app.modules.servicios.application.use_cases.crear_servicio import CrearServicioUseCase
from app.modules.servicios.application.use_cases.eliminar_servicio import EliminarServicioUseCase
from app.modules.servicios.application.use_cases.listar_servicios import ListarServiciosUseCase
from app.modules.servicios.application.use_cases.obtener_servicio import ObtenerServicioUseCase
from app.modules.servicios.infrastructure.persistence.repositories import SqlAlchemyServicioRepository
from app.shared.domain.exceptions import SesionSinContexto


def get_tenant(payload: Annotated[dict, Depends(get_payload_autenticado)]) -> ContextoTenant:
    empresa_id = payload.get("empresa_id")
    punto_emision_id = payload.get("punto_emision_id")
    if empresa_id is None or punto_emision_id is None:
        raise SesionSinContexto()
    return ContextoTenant(empresa_id=int(empresa_id), punto_emision_id=int(punto_emision_id))


async def get_servicio_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyServicioRepository:
    return SqlAlchemyServicioRepository(session)


async def get_crear_servicio_use_case(
    repository: Annotated[SqlAlchemyServicioRepository, Depends(get_servicio_repository)],
) -> CrearServicioUseCase:
    return CrearServicioUseCase(repository)


async def get_actualizar_servicio_use_case(
    repository: Annotated[SqlAlchemyServicioRepository, Depends(get_servicio_repository)],
) -> ActualizarServicioUseCase:
    return ActualizarServicioUseCase(repository)


async def get_obtener_servicio_use_case(
    repository: Annotated[SqlAlchemyServicioRepository, Depends(get_servicio_repository)],
) -> ObtenerServicioUseCase:
    return ObtenerServicioUseCase(repository)


async def get_listar_servicios_use_case(
    repository: Annotated[SqlAlchemyServicioRepository, Depends(get_servicio_repository)],
) -> ListarServiciosUseCase:
    return ListarServiciosUseCase(repository)


async def get_eliminar_servicio_use_case(
    repository: Annotated[SqlAlchemyServicioRepository, Depends(get_servicio_repository)],
) -> EliminarServicioUseCase:
    return EliminarServicioUseCase(repository)

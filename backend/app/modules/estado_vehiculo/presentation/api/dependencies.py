from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.modules.acceso.presentation.api.dependencies import get_payload_autenticado
from app.modules.estado_vehiculo.application.dto import ContextoTenant
from app.modules.estado_vehiculo.application.use_cases.consultar import (
    ListarEstadoVehiculoUseCase,
    ObtenerHistorialVehiculoUseCase,
)
from app.modules.estado_vehiculo.infrastructure.persistence.repositories import SqlAlchemyEstadoVehiculoRepository
from app.shared.domain.exceptions import SesionSinContexto


def get_tenant(payload: Annotated[dict, Depends(get_payload_autenticado)]) -> ContextoTenant:
    empresa_id = payload.get("empresa_id")
    punto_emision_id = payload.get("punto_emision_id")
    if empresa_id is None or punto_emision_id is None:
        raise SesionSinContexto()
    return ContextoTenant(empresa_id=int(empresa_id), punto_emision_id=int(punto_emision_id))


async def get_listar_estado_use_case(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ListarEstadoVehiculoUseCase:
    return ListarEstadoVehiculoUseCase(SqlAlchemyEstadoVehiculoRepository(session))


async def get_historial_use_case(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ObtenerHistorialVehiculoUseCase:
    return ObtenerHistorialVehiculoUseCase(SqlAlchemyEstadoVehiculoRepository(session))

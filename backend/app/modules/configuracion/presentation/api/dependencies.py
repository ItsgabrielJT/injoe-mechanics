from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.modules.acceso.presentation.api.dependencies import get_payload_autenticado
from app.modules.configuracion.application.dto import ContextoTenant
from app.modules.configuracion.application.use_cases.gestionar_empresa import (
    ActualizarEmpresaUseCase,
    ActualizarSriIdUseCase,
    ObtenerEmpresaUseCase,
)
from app.modules.configuracion.application.use_cases.gestionar_puntos import (
    EliminarPuntoUseCase,
    GuardarPuntoUseCase,
    ListarPuntosUseCase,
)
from app.modules.configuracion.infrastructure.persistence.repositories import (
    SqlAlchemyEmpresaConfigRepository,
    SqlAlchemyPuntoConfigRepository,
)
from app.shared.domain.exceptions import SesionSinContexto


def get_tenant(payload: Annotated[dict, Depends(get_payload_autenticado)]) -> ContextoTenant:
    empresa_id = payload.get("empresa_id")
    punto_emision_id = payload.get("punto_emision_id")
    usuario_id = payload.get("sub")
    if empresa_id is None or punto_emision_id is None or usuario_id is None:
        raise SesionSinContexto()
    return ContextoTenant(empresa_id=int(empresa_id), punto_emision_id=int(punto_emision_id), usuario_id=int(usuario_id))


async def get_empresa_repo(session: Annotated[AsyncSession, Depends(get_db_session)]) -> SqlAlchemyEmpresaConfigRepository:
    return SqlAlchemyEmpresaConfigRepository(session)


async def get_punto_repo(session: Annotated[AsyncSession, Depends(get_db_session)]) -> SqlAlchemyPuntoConfigRepository:
    return SqlAlchemyPuntoConfigRepository(session)


async def get_obtener_empresa(repo: Annotated[SqlAlchemyEmpresaConfigRepository, Depends(get_empresa_repo)]) -> ObtenerEmpresaUseCase:
    return ObtenerEmpresaUseCase(repo)


async def get_actualizar_empresa(repo: Annotated[SqlAlchemyEmpresaConfigRepository, Depends(get_empresa_repo)]) -> ActualizarEmpresaUseCase:
    return ActualizarEmpresaUseCase(repo)


async def get_actualizar_sri_id(repo: Annotated[SqlAlchemyEmpresaConfigRepository, Depends(get_empresa_repo)]) -> ActualizarSriIdUseCase:
    return ActualizarSriIdUseCase(repo)


async def get_listar_puntos(repo: Annotated[SqlAlchemyPuntoConfigRepository, Depends(get_punto_repo)]) -> ListarPuntosUseCase:
    return ListarPuntosUseCase(repo)


async def get_guardar_punto(repo: Annotated[SqlAlchemyPuntoConfigRepository, Depends(get_punto_repo)]) -> GuardarPuntoUseCase:
    return GuardarPuntoUseCase(repo)


async def get_eliminar_punto(repo: Annotated[SqlAlchemyPuntoConfigRepository, Depends(get_punto_repo)]) -> EliminarPuntoUseCase:
    return EliminarPuntoUseCase(repo)

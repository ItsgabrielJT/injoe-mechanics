from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import decodificar_token
from app.modules.acceso.application.use_cases.cambiar_punto import CambiarPuntoUseCase
from app.modules.acceso.application.use_cases.iniciar_sesion import IniciarSesionUseCase
from app.modules.acceso.application.use_cases.obtener_sesion import ObtenerSesionUseCase
from app.modules.acceso.application.use_cases.refrescar_sesion import RefrescarSesionUseCase
from app.modules.acceso.application.use_cases.seleccionar_contexto import SeleccionarContextoUseCase
from app.modules.identidad.infrastructure.persistence.repositories import (
    SqlAlchemyAccesoRepository,
    SqlAlchemyUsuarioRepository,
)
from app.shared.domain.exceptions import TokenInvalido

bearer_scheme = HTTPBearer(auto_error=False)


async def get_usuario_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyUsuarioRepository:
    return SqlAlchemyUsuarioRepository(session)


async def get_acceso_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> SqlAlchemyAccesoRepository:
    return SqlAlchemyAccesoRepository(session)


async def get_iniciar_sesion_use_case(
    usuario_repository: Annotated[SqlAlchemyUsuarioRepository, Depends(get_usuario_repository)],
    acceso_repository: Annotated[SqlAlchemyAccesoRepository, Depends(get_acceso_repository)],
) -> IniciarSesionUseCase:
    return IniciarSesionUseCase(usuario_repository, acceso_repository)


async def get_seleccionar_contexto_use_case(
    usuario_repository: Annotated[SqlAlchemyUsuarioRepository, Depends(get_usuario_repository)],
    acceso_repository: Annotated[SqlAlchemyAccesoRepository, Depends(get_acceso_repository)],
) -> SeleccionarContextoUseCase:
    return SeleccionarContextoUseCase(usuario_repository, acceso_repository)


async def get_cambiar_punto_use_case(
    seleccionar_contexto: Annotated[SeleccionarContextoUseCase, Depends(get_seleccionar_contexto_use_case)],
) -> CambiarPuntoUseCase:
    return CambiarPuntoUseCase(seleccionar_contexto)


async def get_refrescar_sesion_use_case(
    usuario_repository: Annotated[SqlAlchemyUsuarioRepository, Depends(get_usuario_repository)],
    acceso_repository: Annotated[SqlAlchemyAccesoRepository, Depends(get_acceso_repository)],
) -> RefrescarSesionUseCase:
    return RefrescarSesionUseCase(usuario_repository, acceso_repository)


async def get_obtener_sesion_use_case(
    usuario_repository: Annotated[SqlAlchemyUsuarioRepository, Depends(get_usuario_repository)],
    acceso_repository: Annotated[SqlAlchemyAccesoRepository, Depends(get_acceso_repository)],
) -> ObtenerSesionUseCase:
    return ObtenerSesionUseCase(usuario_repository, acceso_repository)


def get_payload_autenticado(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    if credentials is None:
        raise TokenInvalido("Token ausente")
    payload = decodificar_token(credentials.credentials)
    if payload is None or payload.get("type") != "access" or not payload.get("sub"):
        raise TokenInvalido()
    return payload

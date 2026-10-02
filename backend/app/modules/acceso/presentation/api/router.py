from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.modules.acceso.application.dto import IniciarSesionCommand, SeleccionarContextoCommand
from app.modules.acceso.application.use_cases.cambiar_punto import CambiarPuntoUseCase
from app.modules.acceso.application.use_cases.iniciar_sesion import IniciarSesionUseCase
from app.modules.acceso.application.use_cases.obtener_sesion import ObtenerSesionUseCase
from app.modules.acceso.application.use_cases.refrescar_sesion import RefrescarSesionUseCase
from app.modules.acceso.application.use_cases.seleccionar_contexto import SeleccionarContextoUseCase
from app.modules.acceso.presentation.api.dependencies import (
    get_cambiar_punto_use_case,
    get_iniciar_sesion_use_case,
    get_obtener_sesion_use_case,
    get_payload_autenticado,
    get_refrescar_sesion_use_case,
    get_seleccionar_contexto_use_case,
    get_usuario_repository,
)
from app.modules.identidad.infrastructure.persistence.repositories import SqlAlchemyUsuarioRepository
from app.shared.domain.exceptions import SesionSinContexto
from app.modules.acceso.presentation.api.schemas import (
    LoginRequest,
    RefreshRequest,
    SeleccionarContextoRequest,
    SesionResponse,
)

router = APIRouter(prefix="/auth", tags=["autenticación"])


@router.post("/login", response_model=SesionResponse)
async def login(
    request: LoginRequest,
    use_case: Annotated[IniciarSesionUseCase, Depends(get_iniciar_sesion_use_case)],
) -> SesionResponse:
    resultado = await use_case.execute(
        IniciarSesionCommand(
            identificador=request.identificador,
            contrasena=request.contrasena,
        )
    )
    return SesionResponse.desde_resultado(resultado)


@router.post("/seleccionar-contexto", response_model=SesionResponse)
async def seleccionar_contexto(
    request: SeleccionarContextoRequest,
    payload: Annotated[dict, Depends(get_payload_autenticado)],
    use_case: Annotated[SeleccionarContextoUseCase, Depends(get_seleccionar_contexto_use_case)],
) -> SesionResponse:
    resultado = await use_case.execute(
        SeleccionarContextoCommand(
            usuario_id=int(payload["sub"]),
            punto_emision_id=request.punto_emision_id,
        )
    )
    return SesionResponse.desde_resultado(resultado)


@router.post("/cambiar-punto", response_model=SesionResponse)
async def cambiar_punto(
    request: SeleccionarContextoRequest,
    payload: Annotated[dict, Depends(get_payload_autenticado)],
    use_case: Annotated[CambiarPuntoUseCase, Depends(get_cambiar_punto_use_case)],
) -> SesionResponse:
    resultado = await use_case.execute(
        SeleccionarContextoCommand(
            usuario_id=int(payload["sub"]),
            punto_emision_id=request.punto_emision_id,
        )
    )
    return SesionResponse.desde_resultado(resultado)


@router.post("/refresh", response_model=SesionResponse)
async def refresh(
    request: RefreshRequest,
    use_case: Annotated[RefrescarSesionUseCase, Depends(get_refrescar_sesion_use_case)],
) -> SesionResponse:
    resultado = await use_case.execute(request.refresh_token)
    return SesionResponse.desde_resultado(resultado)


@router.get("/me", response_model=SesionResponse)
async def me(
    payload: Annotated[dict, Depends(get_payload_autenticado)],
    use_case: Annotated[ObtenerSesionUseCase, Depends(get_obtener_sesion_use_case)],
) -> SesionResponse:
    resultado = await use_case.execute(
        usuario_id=int(payload["sub"]),
        empresa_id=payload.get("empresa_id"),
        punto_emision_id=payload.get("punto_emision_id"),
    )
    return SesionResponse.desde_resultado(resultado, incluir_tokens=False)


class UsuarioTecnicoResponse(BaseModel):
    id: int
    nombre_completo: str
    correo: str
    roles: list[str]


class UsuariosListResponse(BaseModel):
    data: list[UsuarioTecnicoResponse]
    total: int
    message: str = "Usuarios del punto"


usuarios_router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@usuarios_router.get("/", response_model=UsuariosListResponse)
async def listar_usuarios_punto(
    payload: Annotated[dict, Depends(get_payload_autenticado)],
    repository: Annotated[SqlAlchemyUsuarioRepository, Depends(get_usuario_repository)],
) -> UsuariosListResponse:
    empresa_id = payload.get("empresa_id")
    punto_emision_id = payload.get("punto_emision_id")
    if empresa_id is None or punto_emision_id is None:
        raise SesionSinContexto()
    usuarios = await repository.listar_por_punto(int(empresa_id), int(punto_emision_id))
    return UsuariosListResponse(
        data=[
            UsuarioTecnicoResponse(
                id=usuario.id,
                nombre_completo=usuario.nombre_completo,
                correo=usuario.correo,
                roles=usuario.roles,
            )
            for usuario in usuarios
        ],
        total=len(usuarios),
    )

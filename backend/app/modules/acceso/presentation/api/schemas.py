from pydantic import BaseModel, Field

from app.core.config import settings
from app.modules.acceso.application.dto import ResultadoSesion


class LoginRequest(BaseModel):
    identificador: str = Field(..., min_length=1)
    contrasena: str = Field(..., min_length=1)


class SeleccionarContextoRequest(BaseModel):
    punto_emision_id: int


class RefreshRequest(BaseModel):
    refresh_token: str


class PuntoEmisionResponse(BaseModel):
    id: int
    empresa_id: int
    codigo: str
    punto_emision: str
    nombre: str
    direccion: str


class EmpresaResponse(BaseModel):
    id: int
    nombre: str
    slug: str
    ruc: str
    puntos_emision: list[PuntoEmisionResponse]


class UsuarioResponse(BaseModel):
    id: int
    correo: str
    nombre_usuario: str
    nombre_completo: str
    empresa_id: int
    activo: bool
    verificado: bool
    roles: list[str]


class SesionResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    expira_en: int | None = None
    refresh_expira_en: int | None = None
    usuario: UsuarioResponse
    empresas: list[EmpresaResponse]
    empresa_id: int | None = None
    punto_emision_id: int | None = None
    requiere_seleccion: bool

    @classmethod
    def desde_resultado(cls, resultado: ResultadoSesion, incluir_tokens: bool = True) -> "SesionResponse":
        empresas = [
            EmpresaResponse(
                id=acceso.empresa.id,
                nombre=acceso.empresa.nombre,
                slug=acceso.empresa.slug,
                ruc=acceso.empresa.ruc,
                puntos_emision=[
                    PuntoEmisionResponse(
                        id=punto.id,
                        empresa_id=punto.empresa_id,
                        codigo=punto.codigo,
                        punto_emision=punto.punto_emision,
                        nombre=punto.info or f"{punto.codigo} - {punto.punto_emision}",
                        direccion=punto.direccion,
                    )
                    for punto in acceso.puntos_emision
                ],
            )
            for acceso in resultado.empresas
        ]
        return cls(
            access_token=resultado.access_token if incluir_tokens else None,
            refresh_token=resultado.refresh_token if incluir_tokens else None,
            expira_en=resultado.expira_en if incluir_tokens else None,
            refresh_expira_en=(settings.REFRESH_TOKEN_EXPIRE_HOURS * 3600) if incluir_tokens else None,
            usuario=UsuarioResponse(
                id=resultado.usuario.id,
                correo=resultado.usuario.correo,
                nombre_usuario=resultado.usuario.nombre_usuario,
                nombre_completo=resultado.usuario.nombre_completo,
                empresa_id=resultado.usuario.empresa_id,
                activo=resultado.usuario.activo,
                verificado=resultado.usuario.verificado,
                roles=resultado.usuario.roles,
            ),
            empresas=empresas,
            empresa_id=resultado.empresa_id,
            punto_emision_id=resultado.punto_emision_id,
            requiere_seleccion=resultado.requiere_seleccion,
        )

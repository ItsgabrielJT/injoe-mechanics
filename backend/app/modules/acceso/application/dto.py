from dataclasses import dataclass

from app.modules.identidad.domain.entities import AccesoEmpresa, Usuario


@dataclass(frozen=True)
class IniciarSesionCommand:
    identificador: str
    contrasena: str


@dataclass(frozen=True)
class SeleccionarContextoCommand:
    usuario_id: int
    punto_emision_id: int


@dataclass
class ResultadoSesion:
    access_token: str
    refresh_token: str
    expira_en: int
    usuario: Usuario
    empresas: list[AccesoEmpresa]
    empresa_id: int | None
    punto_emision_id: int | None
    requiere_seleccion: bool

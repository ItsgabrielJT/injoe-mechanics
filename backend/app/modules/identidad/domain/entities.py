from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Empresa:
    id: int
    nombre: str
    slug: str
    ruc: str
    direccion: str
    telefono: str | None
    correo: str | None
    activa: bool
    verificada: bool


@dataclass
class PuntoEmision:
    id: int
    empresa_id: int
    punto_emision: str
    codigo: str
    direccion: str
    info: str | None


@dataclass
class AccesoEmpresa:
    empresa: Empresa
    puntos_emision: list[PuntoEmision] = field(default_factory=list)


@dataclass
class Usuario:
    id: int
    empresa_id: int
    correo: str
    nombre_usuario: str
    nombre_completo: str
    contrasena_hash: str
    activo: bool
    verificado: bool
    roles: list[str] = field(default_factory=list)
    ultimo_acceso: datetime | None = None

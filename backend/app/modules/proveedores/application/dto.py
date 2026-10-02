from dataclasses import dataclass
from decimal import Decimal

from app.modules.proveedores.domain.entities import TipoPersona


@dataclass(frozen=True)
class ContextoTenant:
    empresa_id: int
    punto_emision_id: int


@dataclass(frozen=True)
class CrearProveedorCommand:
    identificacion: str
    nombres: str
    tipo_persona: TipoPersona = TipoPersona.PERSONA_NATURAL
    razon_social: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    correo: str | None = None
    direccion_fiscal: str | None = None
    telefono_fiscal: str | None = None
    correo_fiscal: str | None = None
    notas: str | None = None
    activo: bool = True


@dataclass(frozen=True)
class ActualizarProveedorCommand:
    proveedor_id: int
    identificacion: str | None = None
    nombres: str | None = None
    tipo_persona: TipoPersona | None = None
    razon_social: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    correo: str | None = None
    direccion_fiscal: str | None = None
    telefono_fiscal: str | None = None
    correo_fiscal: str | None = None
    notas: str | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class ListarProveedoresQuery:
    page: int = 1
    size: int = 10
    search: str | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class UpsertPrecioCommand:
    proveedor_id: int
    precio_compra: Decimal
    es_principal: bool = False
    producto_id: int | None = None
    servicio_id: int | None = None
    relacion_id: int | None = None

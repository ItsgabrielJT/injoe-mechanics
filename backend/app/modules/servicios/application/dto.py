from dataclasses import dataclass
from decimal import Decimal

from app.modules.servicios.domain.entities import CategoriaServicio, TipoImpuesto


@dataclass(frozen=True)
class ContextoTenant:
    empresa_id: int
    punto_emision_id: int


@dataclass(frozen=True)
class CrearServicioCommand:
    nombre: str
    precio_venta: Decimal
    tipo_impuesto: TipoImpuesto
    codigo: str | None = None
    descripcion: str | None = None
    categoria: CategoriaServicio | None = None
    aplica_iva: bool = True
    peso: Decimal | None = None
    activo: bool = True


@dataclass(frozen=True)
class ActualizarServicioCommand:
    servicio_id: int
    nombre: str | None = None
    precio_venta: Decimal | None = None
    tipo_impuesto: TipoImpuesto | None = None
    codigo: str | None = None
    descripcion: str | None = None
    categoria: CategoriaServicio | None = None
    aplica_iva: bool | None = None
    peso: Decimal | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class ListarServiciosQuery:
    page: int = 1
    size: int = 10
    search: str | None = None
    categoria: CategoriaServicio | None = None
    activo: bool | None = None

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.modules.servicios.application.dto import (
    ActualizarServicioCommand,
    CrearServicioCommand,
    ListarServiciosQuery,
)
from app.modules.servicios.domain.entities import CategoriaServicio, Servicio, TipoImpuesto


class ServicioCreateRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=255)
    precio_venta: Decimal = Field(..., gt=0, le=Decimal("99999999.99"))
    tipo_impuesto: TipoImpuesto
    codigo: str | None = Field(None, max_length=20)
    descripcion: str | None = Field(None, max_length=500)
    categoria: CategoriaServicio | None = None
    aplica_iva: bool = True
    peso: Decimal | None = Field(None, ge=0)
    activo: bool = True

    @field_validator("codigo", "descripcion", mode="before")
    @classmethod
    def vacio_a_nulo(cls, valor: object) -> object:
        if isinstance(valor, str) and not valor.strip():
            return None
        return valor

    def to_command(self) -> CrearServicioCommand:
        return CrearServicioCommand(**self.model_dump())


class ServicioUpdateRequest(BaseModel):
    nombre: str | None = Field(None, min_length=2, max_length=255)
    precio_venta: Decimal | None = Field(None, gt=0, le=Decimal("99999999.99"))
    tipo_impuesto: TipoImpuesto | None = None
    codigo: str | None = Field(None, max_length=20)
    descripcion: str | None = Field(None, max_length=500)
    categoria: CategoriaServicio | None = None
    aplica_iva: bool | None = None
    peso: Decimal | None = Field(None, ge=0)
    activo: bool | None = None

    def to_command(self, servicio_id: int) -> ActualizarServicioCommand:
        return ActualizarServicioCommand(servicio_id=servicio_id, **self.model_dump())


class ServicioResponse(BaseModel):
    id: int
    empresa_id: int
    punto_emision_id: int
    codigo: str
    nombre: str
    descripcion: str | None = None
    categoria: CategoriaServicio | None = None
    precio_venta: Decimal
    aplica_iva: bool
    tipo_impuesto: TipoImpuesto
    peso: Decimal | None = None
    activo: bool
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

    @classmethod
    def from_domain(cls, servicio: Servicio) -> "ServicioResponse":
        return cls(
            id=servicio.id or 0,
            empresa_id=servicio.empresa_id,
            punto_emision_id=servicio.punto_emision_id,
            codigo=servicio.codigo,
            nombre=servicio.nombre,
            descripcion=servicio.descripcion,
            categoria=servicio.categoria,
            precio_venta=servicio.precio_venta,
            aplica_iva=servicio.aplica_iva,
            tipo_impuesto=servicio.tipo_impuesto,
            peso=servicio.peso,
            activo=servicio.activo,
            creado_en=servicio.creado_en,
            actualizado_en=servicio.actualizado_en,
        )


class ServicioListResponse(BaseModel):
    data: list[ServicioResponse]
    total: int
    page: int
    size: int
    pages: int
    message: str = "Lista de servicios obtenida"


class ServicioDataResponse(BaseModel):
    data: ServicioResponse
    message: str


def listar_servicios_query(
    page: int,
    size: int,
    search: str | None,
    categoria: CategoriaServicio | None,
    activo: bool | None,
) -> ListarServiciosQuery:
    return ListarServiciosQuery(
        page=page,
        size=size,
        search=search,
        categoria=categoria,
        activo=activo,
    )

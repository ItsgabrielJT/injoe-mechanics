from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.modules.proveedores.application.dto import (
    ActualizarProveedorCommand,
    CrearProveedorCommand,
    ListarProveedoresQuery,
    UpsertPrecioCommand,
)
from app.modules.proveedores.domain.entities import PrecioProveedor, Proveedor, TipoPersona


class ProveedorCreateRequest(BaseModel):
    identificacion: str = Field(..., min_length=10, max_length=13)
    nombres: str = Field(..., min_length=2, max_length=255)
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

    def to_command(self) -> CrearProveedorCommand:
        return CrearProveedorCommand(**self.model_dump())


class ProveedorUpdateRequest(BaseModel):
    identificacion: str | None = Field(None, min_length=10, max_length=13)
    nombres: str | None = Field(None, min_length=2, max_length=255)
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

    def to_command(self, proveedor_id: int) -> ActualizarProveedorCommand:
        return ActualizarProveedorCommand(proveedor_id=proveedor_id, **self.model_dump())


class ProveedorResponse(BaseModel):
    id: int
    empresa_id: int
    punto_emision_id: int
    identificacion: str
    nombres: str
    tipo_persona: TipoPersona
    razon_social: str | None = None
    direccion: str | None = None
    telefono: str | None = None
    correo: str | None = None
    direccion_fiscal: str | None = None
    telefono_fiscal: str | None = None
    correo_fiscal: str | None = None
    notas: str | None = None
    activo: bool
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

    @classmethod
    def from_domain(cls, proveedor: Proveedor) -> "ProveedorResponse":
        return cls(
            id=proveedor.id or 0,
            empresa_id=proveedor.empresa_id,
            punto_emision_id=proveedor.punto_emision_id,
            identificacion=proveedor.identificacion,
            nombres=proveedor.nombres,
            tipo_persona=proveedor.tipo_persona,
            razon_social=proveedor.razon_social,
            direccion=proveedor.direccion,
            telefono=proveedor.telefono,
            correo=proveedor.correo,
            direccion_fiscal=proveedor.direccion_fiscal,
            telefono_fiscal=proveedor.telefono_fiscal,
            correo_fiscal=proveedor.correo_fiscal,
            notas=proveedor.notas,
            activo=proveedor.activo,
            creado_en=proveedor.creado_en,
            actualizado_en=proveedor.actualizado_en,
        )


class ProveedorDataResponse(BaseModel):
    data: ProveedorResponse
    message: str


class ProveedorListResponse(BaseModel):
    data: list[ProveedorResponse]
    total: int
    page: int
    size: int
    pages: int
    message: str = "Proveedores"


class PrecioProveedorRequest(BaseModel):
    proveedor_id: int
    precio_compra: Decimal = Field(..., ge=0)
    es_principal: bool = False

    def to_command(self, producto_id: int | None = None, servicio_id: int | None = None, relacion_id: int | None = None) -> UpsertPrecioCommand:
        return UpsertPrecioCommand(
            proveedor_id=self.proveedor_id,
            precio_compra=self.precio_compra,
            es_principal=self.es_principal,
            producto_id=producto_id,
            servicio_id=servicio_id,
            relacion_id=relacion_id,
        )


class PrecioProveedorResponse(BaseModel):
    id: int
    proveedor_id: int
    precio_compra: Decimal
    es_principal: bool
    proveedor_nombres: str | None = None
    proveedor_identificacion: str | None = None
    producto_id: int | None = None
    servicio_id: int | None = None

    @classmethod
    def from_domain(cls, precio: PrecioProveedor) -> "PrecioProveedorResponse":
        return cls(
            id=precio.id or 0,
            proveedor_id=precio.proveedor_id,
            precio_compra=precio.precio_compra,
            es_principal=precio.es_principal,
            proveedor_nombres=precio.proveedor_nombres,
            proveedor_identificacion=precio.proveedor_identificacion,
            producto_id=precio.producto_id,
            servicio_id=precio.servicio_id,
        )


class PrecioProveedorDataResponse(BaseModel):
    data: PrecioProveedorResponse
    message: str


class PrecioProveedorListResponse(BaseModel):
    data: list[PrecioProveedorResponse]
    total: int
    message: str = "Precios de compra"


def listar_proveedores_query(page: int, size: int, search: str | None, activo: bool | None) -> ListarProveedoresQuery:
    return ListarProveedoresQuery(page=page, size=size, search=search, activo=activo)

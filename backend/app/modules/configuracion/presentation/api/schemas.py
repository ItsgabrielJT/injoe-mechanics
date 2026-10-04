from pydantic import BaseModel, Field

from app.modules.configuracion.application.dto import ActualizarEmpresaCommand, GuardarPuntoCommand
from app.modules.configuracion.domain.entities import EmpresaConfig, PuntoEmisionConfig


class EmpresaUpdateRequest(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=255)
    ruc: str = Field(..., min_length=13, max_length=13)
    direccion: str = Field(..., min_length=3)
    telefono: str | None = None
    correo: str | None = None
    entorno_sri: str = "1"

    def to_command(self) -> ActualizarEmpresaCommand:
        return ActualizarEmpresaCommand(**self.model_dump())


class SriIdRequest(BaseModel):
    sri_id: int = Field(..., ge=1)


class PuntoRequest(BaseModel):
    punto_emision: str = Field(..., min_length=1, max_length=20)
    codigo: str = Field(..., min_length=1, max_length=20)
    direccion: str = Field(..., min_length=3, max_length=255)
    info: str | None = None
    factura_seq: int = 0
    nota_credito_seq: int = 0
    nota_debito_seq: int = 0
    retencion_seq: int = 0
    liquidacion_compra_seq: int = 0
    guia_remision_seq: int = 0

    def to_command(self, punto_id: int | None = None) -> GuardarPuntoCommand:
        return GuardarPuntoCommand(punto_id=punto_id, **self.model_dump())


class EmpresaResponse(BaseModel):
    id: int
    nombre: str
    slug: str
    ruc: str
    direccion: str
    telefono: str | None = None
    correo: str | None = None
    sri_id: int | None = None
    entorno_sri: str
    moneda: str
    idioma: str
    zona_horaria: str
    ruta_logo: str | None = None

    @classmethod
    def from_domain(cls, empresa: EmpresaConfig) -> "EmpresaResponse":
        return cls(**empresa.__dict__)


class PuntoResponse(BaseModel):
    id: int
    empresa_id: int
    punto_emision: str
    codigo: str
    direccion: str
    info: str | None = None
    factura_seq: int
    nota_credito_seq: int
    nota_debito_seq: int
    retencion_seq: int
    liquidacion_compra_seq: int
    guia_remision_seq: int

    @classmethod
    def from_domain(cls, punto: PuntoEmisionConfig) -> "PuntoResponse":
        return cls(
            id=punto.id or 0,
            empresa_id=punto.empresa_id,
            punto_emision=punto.punto_emision,
            codigo=punto.codigo,
            direccion=punto.direccion,
            info=punto.info,
            factura_seq=punto.factura_seq,
            nota_credito_seq=punto.nota_credito_seq,
            nota_debito_seq=punto.nota_debito_seq,
            retencion_seq=punto.retencion_seq,
            liquidacion_compra_seq=punto.liquidacion_compra_seq,
            guia_remision_seq=punto.guia_remision_seq,
        )


class EmpresaDataResponse(BaseModel):
    data: EmpresaResponse
    message: str


class PuntoDataResponse(BaseModel):
    data: PuntoResponse
    message: str


class PuntoListResponse(BaseModel):
    data: list[PuntoResponse]
    message: str = "Puntos de emisión"

from dataclasses import dataclass


@dataclass(frozen=True)
class ContextoTenant:
    empresa_id: int
    punto_emision_id: int
    usuario_id: int


@dataclass(frozen=True)
class ActualizarEmpresaCommand:
    nombre: str
    ruc: str
    direccion: str
    telefono: str | None = None
    correo: str | None = None
    entorno_sri: str = "1"


@dataclass(frozen=True)
class ActualizarSriIdCommand:
    sri_id: int


@dataclass(frozen=True)
class GuardarPuntoCommand:
    punto_id: int | None
    punto_emision: str
    codigo: str
    direccion: str
    info: str | None = None
    factura_seq: int = 0
    nota_credito_seq: int = 0
    nota_debito_seq: int = 0
    retencion_seq: int = 0
    liquidacion_compra_seq: int = 0
    guia_remision_seq: int = 0

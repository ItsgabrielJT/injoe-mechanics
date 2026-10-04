from dataclasses import dataclass
from datetime import datetime


@dataclass
class EmpresaConfig:
    id: int
    nombre: str
    slug: str
    ruc: str
    direccion: str
    telefono: str | None
    correo: str | None
    sri_id: int | None
    entorno_sri: str
    moneda: str
    idioma: str
    zona_horaria: str
    ruta_logo: str | None = None


@dataclass
class PuntoEmisionConfig:
    id: int | None
    empresa_id: int
    punto_emision: str
    codigo: str
    direccion: str
    info: str | None
    factura_seq: int
    nota_credito_seq: int
    nota_debito_seq: int
    retencion_seq: int
    liquidacion_compra_seq: int
    guia_remision_seq: int
    creado_en: datetime | None = None

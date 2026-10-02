from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class TipoCliente(str, Enum):
    PERSONA_NATURAL = "PERSONA_NATURAL"
    PERSONA_JURIDICA = "PERSONA_JURIDICA"


class TipoVehiculo(str, Enum):
    SEDAN = "sedan"
    SUV = "suv"
    TRUCK = "truck"
    HATCHBACK = "hatchback"
    COUPE = "coupe"
    CONVERTIBLE = "convertible"
    VAN = "van"
    MOTORCYCLE = "motorcycle"
    OTHER = "other"


class TipoCombustible(str, Enum):
    GASOLINE = "gasoline"
    DIESEL = "diesel"
    ELECTRIC = "electric"
    HYBRID = "hybrid"
    CNG = "cng"
    LPG = "lpg"
    OTHER = "other"


class TipoTransmision(str, Enum):
    MANUAL = "manual"
    AUTOMATIC = "automatic"
    CVT = "cvt"
    SEMI_AUTOMATIC = "semi_automatic"


def identificacion_valida(valor: str) -> bool:
    limpia = valor.strip()
    return limpia.isdigit() and len(limpia) in (10, 13)


def correo_valido(valor: str) -> bool:
    texto = valor.strip()
    return "@" in texto and "." in texto.split("@")[-1] and len(texto) >= 5


@dataclass
class Cliente:
    id: int | None
    empresa_id: int
    punto_emision_id: int
    identificacion: str
    tipo_cliente: TipoCliente
    nombres: str
    razon_social: str | None = None
    fecha_nacimiento: date | None = None
    provincia: str | None = None
    canton: str | None = None
    parroquia: str | None = None
    direcciones: list[str] = field(default_factory=list)
    telefonos: list[str] = field(default_factory=list)
    correos: list[str] = field(default_factory=list)
    indice_direccion_principal: int | None = None
    indice_telefono_principal: int | None = None
    indice_correo_principal: int | None = None
    direccion_fiscal: str | None = None
    telefono_fiscal: str | None = None
    correo_fiscal: str | None = None
    notas: str | None = None
    activo: bool = True
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None
    total_vehiculos: int = 0
    placas: list[str] = field(default_factory=list)

    @property
    def correo_principal(self) -> str | None:
        if not self.correos:
            return None
        idx = self.indice_correo_principal if self.indice_correo_principal is not None else 0
        if 0 <= idx < len(self.correos):
            return self.correos[idx]
        return self.correos[0]


@dataclass
class Vehiculo:
    id: int | None
    empresa_id: int
    punto_emision_id: int
    cliente_id: int
    placa: str
    marca: str | None = None
    modelo: str | None = None
    anio: int | None = None
    tipo: TipoVehiculo | None = None
    color: str | None = None
    combustible: TipoCombustible | None = None
    cilindrada: Decimal | None = None
    transmision: TipoTransmision | None = None
    notas: str | None = None
    activo: bool = True
    creado_en: datetime | None = None
    actualizado_en: datetime | None = None

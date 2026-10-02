from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from app.modules.clientes.domain.entities import TipoCliente, TipoCombustible, TipoTransmision, TipoVehiculo


@dataclass(frozen=True)
class ContextoTenant:
    empresa_id: int
    punto_emision_id: int


@dataclass(frozen=True)
class CrearClienteCommand:
    identificacion: str
    nombres: str
    correos: list[str]
    tipo_cliente: TipoCliente = TipoCliente.PERSONA_NATURAL
    razon_social: str | None = None
    fecha_nacimiento: date | None = None
    provincia: str | None = None
    canton: str | None = None
    parroquia: str | None = None
    direcciones: list[str] = field(default_factory=list)
    telefonos: list[str] = field(default_factory=list)
    indice_direccion_principal: int | None = None
    indice_telefono_principal: int | None = None
    indice_correo_principal: int | None = None
    direccion_fiscal: str | None = None
    telefono_fiscal: str | None = None
    correo_fiscal: str | None = None
    notas: str | None = None
    activo: bool = True


@dataclass(frozen=True)
class ActualizarClienteCommand:
    cliente_id: int
    identificacion: str | None = None
    nombres: str | None = None
    correos: list[str] | None = None
    tipo_cliente: TipoCliente | None = None
    razon_social: str | None = None
    fecha_nacimiento: date | None = None
    provincia: str | None = None
    canton: str | None = None
    parroquia: str | None = None
    direcciones: list[str] | None = None
    telefonos: list[str] | None = None
    indice_direccion_principal: int | None = None
    indice_telefono_principal: int | None = None
    indice_correo_principal: int | None = None
    direccion_fiscal: str | None = None
    telefono_fiscal: str | None = None
    correo_fiscal: str | None = None
    notas: str | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class ListarClientesQuery:
    page: int = 1
    size: int = 10
    search: str | None = None
    tipo_cliente: TipoCliente | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class CrearVehiculoCommand:
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


@dataclass(frozen=True)
class ActualizarVehiculoCommand:
    vehiculo_id: int
    placa: str | None = None
    marca: str | None = None
    modelo: str | None = None
    anio: int | None = None
    tipo: TipoVehiculo | None = None
    color: str | None = None
    combustible: TipoCombustible | None = None
    cilindrada: Decimal | None = None
    transmision: TipoTransmision | None = None
    notas: str | None = None
    activo: bool | None = None


@dataclass(frozen=True)
class ListarVehiculosQuery:
    page: int = 1
    size: int = 10
    search: str | None = None
    cliente_id: int | None = None


@dataclass(frozen=True)
class AltaRapidaCommand:
    placa: str
    nombres: str | None = None
    cliente_id: int | None = None

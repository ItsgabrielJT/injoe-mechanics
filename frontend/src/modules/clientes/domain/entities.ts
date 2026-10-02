export type TipoCliente = "PERSONA_NATURAL" | "PERSONA_JURIDICA";
export type TipoVehiculo =
  | "sedan"
  | "suv"
  | "truck"
  | "hatchback"
  | "coupe"
  | "convertible"
  | "van"
  | "motorcycle"
  | "other";
export type TipoCombustible = "gasoline" | "diesel" | "electric" | "hybrid" | "cng" | "lpg" | "other";
export type TipoTransmision = "manual" | "automatic" | "cvt" | "semi_automatic";

export interface Cliente {
  id: number;
  empresaId: number;
  puntoEmisionId: number;
  identificacion: string;
  tipoCliente: TipoCliente;
  nombres: string;
  razonSocial: string | null;
  fechaNacimiento: string | null;
  provincia: string | null;
  canton: string | null;
  parroquia: string | null;
  direcciones: string[];
  telefonos: string[];
  correos: string[];
  indiceDireccionPrincipal: number | null;
  indiceTelefonoPrincipal: number | null;
  indiceCorreoPrincipal: number | null;
  direccionFiscal: string | null;
  telefonoFiscal: string | null;
  correoFiscal: string | null;
  notas: string | null;
  activo: boolean;
  totalVehiculos: number;
  placas: string[];
  correoPrincipal: string | null;
}

export interface Vehiculo {
  id: number;
  empresaId: number;
  puntoEmisionId: number;
  clienteId: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  tipo: TipoVehiculo | null;
  color: string | null;
  combustible: TipoCombustible | null;
  cilindrada: number | null;
  transmision: TipoTransmision | null;
  notas: string | null;
  activo: boolean;
}

export interface ClienteInput {
  identificacion: string;
  nombres: string;
  correos: string[];
  tipo_cliente: TipoCliente;
  razon_social?: string | null;
  fecha_nacimiento?: string | null;
  provincia?: string | null;
  canton?: string | null;
  parroquia?: string | null;
  direcciones: string[];
  telefonos: string[];
  indice_direccion_principal?: number | null;
  indice_telefono_principal?: number | null;
  indice_correo_principal?: number | null;
  direccion_fiscal?: string | null;
  telefono_fiscal?: string | null;
  correo_fiscal?: string | null;
  notas?: string | null;
  activo: boolean;
}

export interface VehiculoInput {
  cliente_id: number;
  placa: string;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  tipo?: TipoVehiculo | null;
  color?: string | null;
  combustible?: TipoCombustible | null;
  cilindrada?: number | null;
  transmision?: TipoTransmision | null;
  notas?: string | null;
  activo?: boolean;
}

export const TIPOS_VEHICULO: { value: TipoVehiculo; label: string }[] = [
  { value: "sedan", label: "Sedán" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Camioneta" },
  { value: "hatchback", label: "Hatchback" },
  { value: "coupe", label: "Coupé" },
  { value: "convertible", label: "Convertible" },
  { value: "van", label: "Van" },
  { value: "motorcycle", label: "Motocicleta" },
  { value: "other", label: "Otro" },
];

export const TIPOS_COMBUSTIBLE: { value: TipoCombustible; label: string }[] = [
  { value: "gasoline", label: "Gasolina" },
  { value: "diesel", label: "Diésel" },
  { value: "electric", label: "Eléctrico" },
  { value: "hybrid", label: "Híbrido" },
  { value: "cng", label: "GNC" },
  { value: "lpg", label: "GLP" },
  { value: "other", label: "Otro" },
];

export const TIPOS_TRANSMISION: { value: TipoTransmision; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automática" },
  { value: "cvt", label: "CVT" },
  { value: "semi_automatic", label: "Semiautomática" },
];

export type TipoPersona = "PERSONA_NATURAL" | "PERSONA_JURIDICA";

export interface Proveedor {
  id: number;
  identificacion: string;
  nombres: string;
  tipoPersona: TipoPersona;
  razonSocial: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  direccionFiscal: string | null;
  telefonoFiscal: string | null;
  correoFiscal: string | null;
  notas: string | null;
  activo: boolean;
}

export interface PrecioProveedor {
  id: number;
  proveedorId: number;
  precioCompra: number;
  esPrincipal: boolean;
  proveedorNombres: string | null;
  proveedorIdentificacion: string | null;
  productoId: number | null;
  servicioId: number | null;
}

export interface ProveedorInput {
  identificacion: string;
  nombres: string;
  tipo_persona?: TipoPersona;
  razon_social?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion_fiscal?: string | null;
  telefono_fiscal?: string | null;
  correo_fiscal?: string | null;
  notas?: string | null;
  activo?: boolean;
}

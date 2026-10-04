import type { ItemOrden } from "@/modules/ordenes-trabajo/domain/entities";

export type EstadoOrdenResumen = "EN_PROCESO" | "CERRADA";

export interface OrdenEstado {
  id: number;
  numero: string;
  estado: EstadoOrdenResumen;
  fechaInicio: string;
  fechaEntrega: string | null;
  kilometraje: number | null;
  tecnicoNombre: string | null;
  totalCosto: number;
  totalUtilidad: number;
  total: number;
  notasGenerales: string | null;
  notasTecnicas: string | null;
  items: ItemOrden[];
}

export interface EstadoVehiculo {
  vehiculoId: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  clienteId: number;
  clienteNombres: string;
  clienteIdentificacion: string | null;
  ordenesCount: number;
  ultimaFecha: string | null;
  totalCosto: number;
  totalUtilidad: number;
  total: number;
  ordenes: OrdenEstado[];
}

export interface TotalesEstadoVehiculo {
  vehiculos: number;
  ordenes: number;
  totalCosto: number;
  totalUtilidad: number;
  total: number;
}

export interface FiltrosEstadoVehiculo {
  placa?: string;
  marca?: string;
  modelo?: string;
  cliente?: string;
  identificacion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export const VACIO_TOTALES: TotalesEstadoVehiculo = {
  vehiculos: 0,
  ordenes: 0,
  totalCosto: 0,
  totalUtilidad: 0,
  total: 0,
};

export function fechaCorta(valor?: string | null): string {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "short",
    timeStyle: "short",
  }).format(fecha);
}

export function fechaCortaDia(valor?: string | null): string {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "short",
  }).format(fecha);
}

"use client";

import { Input } from "@/shared/components/ui/input";

export type TipoPeriodo = "todos" | "mes" | "trimestre" | "semestre" | "anio" | "fechas";

export interface Periodo {
  tipo: TipoPeriodo;
  anio: number;
  mes: number;
  trimestre: number;
  semestre: number;
  desde: string;
  hasta: string;
}

const TIPOS: { id: TipoPeriodo; label: string }[] = [
  { id: "todos", label: "Todo el periodo" },
  { id: "mes", label: "Mes" },
  { id: "trimestre", label: "Trimestre" },
  { id: "semestre", label: "Semestre" },
  { id: "anio", label: "Año" },
  { id: "fechas", label: "Fechas" },
];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CLASE_SELECT = "flex h-10 rounded-md border px-3 text-sm bg-background";

function isoLocal(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rangoMeses(anio: number, mesInicio: number, cantidad: number) {
  return {
    fecha_desde: isoLocal(new Date(anio, mesInicio, 1)),
    fecha_hasta: isoLocal(new Date(anio, mesInicio + cantidad, 0)),
  };
}

export function periodoInicial(): Periodo {
  const hoy = new Date();
  const mes = hoy.getMonth();
  return {
    tipo: "todos",
    anio: hoy.getFullYear(),
    mes,
    trimestre: Math.floor(mes / 3) + 1,
    semestre: mes < 6 ? 1 : 2,
    desde: "",
    hasta: "",
  };
}

export function rangoPeriodo(p: Periodo): { fecha_desde?: string; fecha_hasta?: string } {
  if (p.tipo === "mes") return rangoMeses(p.anio, p.mes, 1);
  if (p.tipo === "trimestre") return rangoMeses(p.anio, (p.trimestre - 1) * 3, 3);
  if (p.tipo === "semestre") return rangoMeses(p.anio, (p.semestre - 1) * 6, 6);
  if (p.tipo === "anio") return rangoMeses(p.anio, 0, 12);
  if (p.tipo === "fechas") return { fecha_desde: p.desde || undefined, fecha_hasta: p.hasta || undefined };
  return {};
}

export function etiquetaPeriodo(p: Periodo): string {
  if (p.tipo === "mes") return `Periodo: ${MESES[p.mes]} ${p.anio}`;
  if (p.tipo === "trimestre") return `Periodo: T${p.trimestre} ${p.anio}`;
  if (p.tipo === "semestre") return `Periodo: ${p.semestre === 1 ? "1er" : "2do"} semestre ${p.anio}`;
  if (p.tipo === "anio") return `Periodo: año ${p.anio}`;
  if (p.tipo === "fechas") {
    if (p.desde && p.hasta) return `Periodo: del ${p.desde} al ${p.hasta}`;
    if (p.desde) return `Periodo: desde ${p.desde}`;
    if (p.hasta) return `Periodo: hasta ${p.hasta}`;
  }
  return "";
}

interface Props {
  valor: Periodo;
  onChange: (valor: Periodo) => void;
}

export function FiltroPeriodo({ valor, onChange }: Props) {
  const anioActual = new Date().getFullYear();
  const anios = Array.from({ length: 6 }, (_, i) => anioActual - i);
  const cambiar = (parcial: Partial<Periodo>) => onChange({ ...valor, ...parcial });

  return (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label="Tipo de periodo"
        className={`${CLASE_SELECT} sm:w-40`}
        value={valor.tipo}
        onChange={(e) => cambiar({ tipo: e.target.value as TipoPeriodo })}
      >
        {TIPOS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      {valor.tipo === "mes" && (
        <select aria-label="Mes" className={`${CLASE_SELECT} sm:w-36`} value={valor.mes} onChange={(e) => cambiar({ mes: Number(e.target.value) })}>
          {MESES.map((nombre, i) => <option key={nombre} value={i}>{nombre}</option>)}
        </select>
      )}
      {valor.tipo === "trimestre" && (
        <select aria-label="Trimestre" className={`${CLASE_SELECT} sm:w-44`} value={valor.trimestre} onChange={(e) => cambiar({ trimestre: Number(e.target.value) })}>
          <option value={1}>T1 (ene - mar)</option>
          <option value={2}>T2 (abr - jun)</option>
          <option value={3}>T3 (jul - sep)</option>
          <option value={4}>T4 (oct - dic)</option>
        </select>
      )}
      {valor.tipo === "semestre" && (
        <select aria-label="Semestre" className={`${CLASE_SELECT} sm:w-48`} value={valor.semestre} onChange={(e) => cambiar({ semestre: Number(e.target.value) })}>
          <option value={1}>1er semestre (ene - jun)</option>
          <option value={2}>2do semestre (jul - dic)</option>
        </select>
      )}
      {["mes", "trimestre", "semestre", "anio"].includes(valor.tipo) && (
        <select aria-label="Año" className={`${CLASE_SELECT} sm:w-28`} value={valor.anio} onChange={(e) => cambiar({ anio: Number(e.target.value) })}>
          {anios.map((anio) => <option key={anio} value={anio}>{anio}</option>)}
        </select>
      )}
      {valor.tipo === "fechas" && (
        <>
          <Input aria-label="Desde" type="date" className="sm:w-40" value={valor.desde} max={valor.hasta || undefined} onChange={(e) => cambiar({ desde: e.target.value })} />
          <Input aria-label="Hasta" type="date" className="sm:w-40" value={valor.hasta} min={valor.desde || undefined} onChange={(e) => cambiar({ hasta: e.target.value })} />
        </>
      )}
    </div>
  );
}

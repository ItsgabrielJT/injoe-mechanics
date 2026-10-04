"use client";

import { useEffect, useMemo, useState } from "react";
import { type EstadisticasFactura } from "@/modules/facturacion/domain/entities";
import { ChipEstado } from "@/modules/facturacion/presentation/components/chip-estado";
import { obtenerEstadisticas } from "@/modules/facturacion/infrastructure/facturacion-api";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";
import { cn } from "@/shared/lib/utils";

type Preset = "hoy" | "mes" | "trimestre" | "semestre" | "anual" | "fechas";

function isoLocal(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function rangoPreset(preset: Preset, desde = "", hasta = ""): { from: string; to: string } {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  if (preset === "hoy") return { from: isoLocal(hoy), to: isoLocal(hoy) };
  if (preset === "mes") return { from: isoLocal(new Date(y, m, 1)), to: isoLocal(new Date(y, m + 1, 0)) };
  if (preset === "trimestre") {
    const q = Math.floor(m / 3) * 3;
    return { from: isoLocal(new Date(y, q, 1)), to: isoLocal(new Date(y, q + 3, 0)) };
  }
  if (preset === "semestre") {
    const s = m < 6 ? 0 : 6;
    return { from: isoLocal(new Date(y, s, 1)), to: isoLocal(new Date(y, s + 6, 0)) };
  }
  if (preset === "anual") return { from: `${y}-01-01`, to: `${y}-12-31` };
  return { from: desde, to: hasta };
}

function dinero(valor: number): string {
  return `$${valor.toFixed(2)}`;
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "mes", label: "Mes" },
  { id: "trimestre", label: "Trimestre" },
  { id: "semestre", label: "Semestre" },
  { id: "anual", label: "Año" },
  { id: "fechas", label: "Fechas" },
];

interface Props {
  token: string;
}

export function FacturacionEstadisticas({ token }: Props) {
  const [preset, setPreset] = useState<Preset>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [data, setData] = useState<EstadisticasFactura | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rango = useMemo(() => rangoPreset(preset, desde, hasta), [preset, desde, hasta]);

  useEffect(() => {
    if (!token || !rango.from || !rango.to) return;
    let cancelado = false;
    setCargando(true);
    void obtenerEstadisticas(token, { fecha_desde: rango.from, fecha_hasta: rango.to })
      .then((resp) => {
        if (!cancelado) setData(resp);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof ApiError ? err.message : "No se pudieron cargar las estadísticas");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, rango.from, rango.to]);

  const maxTotal = Math.max(1, ...(data?.porEstado.map((fila) => fila.total) ?? [1]));

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-sm font-medium">Rango</p>
          <div className="flex flex-wrap gap-1 rounded-lg border p-1">
            {PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreset(item.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  preset === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Fechas de emisión</p>
          <div className="flex gap-3">
            <Input type="date" value={preset === "fechas" ? desde : rango.from} disabled={preset !== "fechas"} onChange={(e) => setDesde(e.target.value)} />
            <Input type="date" value={preset === "fechas" ? hasta : rango.to} disabled={preset !== "fechas"} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total general (facturas)</p>
          <p className="mt-1 text-2xl font-bold">{data?.totales.cantidad ?? 0}</p>
          <p className="text-xs text-muted-foreground">{rango.from} → {rango.to}</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Subtotal general</p>
          <p className="mt-1 text-2xl font-bold">{dinero(data?.totales.subtotal ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Suma de subtotales</p>
        </article>
        <article className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total general</p>
          <p className="mt-1 text-2xl font-bold text-primary">{dinero(data?.totales.total ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Suma de totales</p>
        </article>
      </div>

      <section className="rounded-2xl border bg-card p-4">
        <h3 className="text-base font-semibold">Totales por tipo de impuesto</h3>
        <p className="mb-4 text-sm text-muted-foreground">Desglose agregado por tasa de IVA (0%, 5%, 15%)</p>
        <div className="grid gap-4 md:grid-cols-3">
          {([0, 5, 15] as const).map((tasa) => {
            const fila = data?.porImpuesto.find((item) => item.tasa === tasa);
            return (
              <article key={tasa} className="rounded-xl border p-4 text-sm">
                <p className="mb-2 font-medium text-muted-foreground">IVA {tasa}%</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{dinero(fila?.subtotal ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span className="tabular-nums">{dinero(fila?.iva ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="tabular-nums font-medium">{dinero(fila?.total ?? 0)}</span></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h3 className="text-base font-semibold">Total por estado</h3>
        <p className="mb-4 text-sm text-muted-foreground">Conteo, subtotal e IVA agrupados por estado</p>
        {cargando && <p className="text-sm text-muted-foreground">Cargando reporte...</p>}
        <div className="space-y-3">
          {data?.porEstado.map((fila) => (
            <div key={fila.estado} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 font-medium"><ChipEstado estado={fila.estado} /> {fila.cantidad}</span>
                <span className="tabular-nums">{dinero(fila.total)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${(fila.total / maxTotal) * 100}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                Subtotal {dinero(fila.subtotal)} · IVA 15% {dinero(fila.iva15)} · IVA 5% {dinero(fila.iva5)} · IVA 0% {dinero(fila.iva0)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

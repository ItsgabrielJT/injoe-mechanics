"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { z } from "zod";
import type { Bodega, Producto, TipoMovimiento } from "@/modules/inventario/domain/entities";
import { BuscadorSelect } from "@/modules/inventario/presentation/components/buscador-select";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

const schema = z.object({
  tipo: z.enum(["INGRESO", "SALIDA", "TRANSFERENCIA"]),
  bodega_id: z.number({ invalid_type_error: "Selecciona la bodega" }).min(1, "Selecciona la bodega"),
  bodega_destino_id: z.number().nullable(),
  nota: z.string().max(255),
  observacion: z.string().max(500),
}).superRefine((values, ctx) => {
  if (values.tipo === "TRANSFERENCIA") {
    if (!values.bodega_destino_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona la bodega destino", path: ["bodega_destino_id"] });
    } else if (values.bodega_destino_id === values.bodega_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La bodega destino debe ser distinta", path: ["bodega_destino_id"] });
    }
  }
});

export interface LineaForm {
  producto_id: number;
  cantidad: number;
}

export interface MovimientoFormValues {
  tipo: TipoMovimiento;
  bodega_id: number;
  bodega_destino_id: number | null;
  nota: string;
  observacion: string;
  items: LineaForm[];
}

interface Props {
  abierto: boolean;
  cargando?: boolean;
  bodegas: Bodega[];
  productos: Producto[];
  onClose: () => void;
  onSubmit: (values: MovimientoFormValues) => Promise<void>;
}

export function MovimientoFormDrawer({ abierto, cargando, bodegas, productos, onClose, onSubmit }: Props) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: "INGRESO", bodega_id: 0, bodega_destino_id: null, nota: "", observacion: "" },
  });
  const [items, setItems] = useState<LineaForm[]>([]);
  const [productoSel, setProductoSel] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const tipo = form.watch("tipo");

  useEffect(() => {
    if (abierto) {
      form.reset({ tipo: "INGRESO", bodega_id: 0, bodega_destino_id: null, nota: "", observacion: "" });
      setItems([]);
    }
  }, [abierto, form]);

  if (!abierto) return null;

  const opcionesProducto = productos.map((item) => ({
    id: item.id,
    label: `${item.codigo} · ${item.nombre}`,
    extra: item.codigoBarras ? `Barras ${item.codigoBarras}` : `Stock ${item.stockTotal}`,
  }));

  function agregar() {
    if (!productoSel) return;
    const qty = Number(cantidad);
    if (!qty || qty <= 0) return;
    setItems((actuales) => {
      const existente = actuales.find((item) => item.producto_id === productoSel);
      if (existente) {
        return actuales.map((item) => item.producto_id === productoSel ? { ...item, cantidad: item.cantidad + qty } : item);
      }
      return [...actuales, { producto_id: productoSel, cantidad: qty }];
    });
    setProductoSel(null);
    setCantidad("1");
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <aside className="absolute inset-y-0 right-0 w-full sm:max-w-xl bg-card shadow-elegant overflow-y-auto">
          <div className="sticky top-0 border-b bg-card flex items-start justify-between px-6 py-4">
            <h2 className="text-lg font-semibold">Nuevo movimiento</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <form
            className="p-6 space-y-5"
            onSubmit={form.handleSubmit(async (values) => {
              if (items.length === 0) return;
              await onSubmit({ ...values, tipo: values.tipo as TipoMovimiento, items });
            })}
          >
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background" {...form.register("tipo")}>
                <option value="INGRESO">Ingreso</option>
                <option value="SALIDA">Salida</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Bodega {tipo === "TRANSFERENCIA" ? "origen" : ""} *</Label>
              <Controller
                control={form.control}
                name="bodega_id"
                render={({ field }) => (
                  <BuscadorSelect
                    opciones={bodegas.filter((item) => item.activo).map((item) => ({ id: item.id, label: item.nombre }))}
                    valor={field.value || null}
                    onChange={(id) => field.onChange(id ?? 0)}
                    placeholder="Buscar bodega"
                  />
                )}
              />
              {form.formState.errors.bodega_id && <p className="text-xs text-destructive">{form.formState.errors.bodega_id.message}</p>}
            </div>
            {tipo === "TRANSFERENCIA" && (
              <div className="space-y-2">
                <Label>Bodega destino *</Label>
                <Controller
                  control={form.control}
                  name="bodega_destino_id"
                  render={({ field }) => (
                    <BuscadorSelect
                      opciones={bodegas.filter((item) => item.activo).map((item) => ({ id: item.id, label: item.nombre }))}
                      valor={field.value}
                      onChange={field.onChange}
                      placeholder="Buscar bodega destino"
                    />
                  )}
                />
                {form.formState.errors.bodega_destino_id && <p className="text-xs text-destructive">{form.formState.errors.bodega_destino_id.message}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Nota</Label>
              <Input maxLength={255} {...form.register("nota")} />
            </div>
            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-sm font-medium">Productos (busca por código, nombre o barras)</p>
              <BuscadorSelect opciones={opcionesProducto} valor={productoSel} onChange={setProductoSel} placeholder="Buscar producto" />
              <div className="flex gap-2">
                <Input type="number" min="0.01" step="0.01" value={cantidad} onChange={(event) => setCantidad(event.target.value)} />
                <Button type="button" variant="outline" onClick={agregar}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
              </div>
              {items.length === 0 && <p className="text-xs text-destructive">Agrega al menos un producto</p>}
              <ul className="space-y-2">
                {items.map((item) => {
                  const producto = productos.find((p) => p.id === item.producto_id);
                  return (
                    <li key={item.producto_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{producto?.codigo} · {producto?.nombre} × {item.cantidad}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setItems((actuales) => actuales.filter((linea) => linea.producto_id !== item.producto_id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={cargando || items.length === 0}>{cargando ? "Guardando..." : "Registrar"}</Button>
            </div>
          </form>
        </aside>
      </div>
    </Portal>
  );
}

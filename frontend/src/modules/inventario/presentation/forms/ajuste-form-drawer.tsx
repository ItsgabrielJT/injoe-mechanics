"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { z } from "zod";
import type { Bodega, Producto, TipoAjuste } from "@/modules/inventario/domain/entities";
import { BuscadorSelect } from "@/modules/inventario/presentation/components/buscador-select";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

const schema = z.object({
  bodega_id: z.number({ invalid_type_error: "Selecciona la bodega" }).min(1, "Selecciona la bodega"),
  tipo_ajuste: z.enum(["INGRESO", "EGRESO"]),
  nota: z.string().max(255),
});

export interface AjusteFormValues {
  bodega_id: number;
  tipo_ajuste: TipoAjuste;
  nota: string;
  items: { producto_id: number; cantidad: number }[];
}

interface Props {
  abierto: boolean;
  cargando?: boolean;
  bodegas: Bodega[];
  productos: Producto[];
  onClose: () => void;
  onSubmit: (values: AjusteFormValues) => Promise<void>;
}

export function AjusteFormDrawer({ abierto, cargando, bodegas, productos, onClose, onSubmit }: Props) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { bodega_id: 0, tipo_ajuste: "INGRESO", nota: "" },
  });
  const [items, setItems] = useState<{ producto_id: number; cantidad: number }[]>([]);
  const [productoSel, setProductoSel] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState("1");

  useEffect(() => {
    if (abierto) {
      form.reset({ bodega_id: 0, tipo_ajuste: "INGRESO", nota: "" });
      setItems([]);
    }
  }, [abierto, form]);

  if (!abierto) return null;

  function agregar() {
    if (!productoSel) return;
    const qty = Number(cantidad);
    if (!qty || qty <= 0) return;
    setItems((actuales) => {
      if (actuales.some((item) => item.producto_id === productoSel)) {
        return actuales.map((item) => item.producto_id === productoSel ? { ...item, cantidad: qty } : item);
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
            <div>
              <h2 className="text-lg font-semibold">Ajuste de inventario</h2>
              <p className="text-sm text-muted-foreground">Ingreso suma la cantidad. Egreso la resta.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <form className="p-6 space-y-5" onSubmit={form.handleSubmit(async (values) => {
            if (items.length === 0) return;
            await onSubmit({ ...values, items });
          })}>
            <div className="space-y-2">
              <Label>Bodega *</Label>
              <Controller control={form.control} name="bodega_id" render={({ field }) => (
                <BuscadorSelect
                  opciones={bodegas.filter((item) => item.activo).map((item) => ({ id: item.id, label: item.nombre }))}
                  valor={field.value || null}
                  onChange={(id) => field.onChange(id ?? 0)}
                  placeholder="Buscar bodega"
                />
              )} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de ajuste *</Label>
              <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background" {...form.register("tipo_ajuste")}>
                <option value="INGRESO">Ingreso (suma)</option>
                <option value="EGRESO">Egreso (resta)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Razón</Label>
              <Input maxLength={255} {...form.register("nota")} />
            </div>
            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-sm font-medium">Productos</p>
              <BuscadorSelect
                opciones={productos.map((item) => ({ id: item.id, label: `${item.codigo} · ${item.nombre}`, extra: item.codigoBarras ?? undefined }))}
                valor={productoSel}
                onChange={setProductoSel}
                placeholder="Buscar producto"
              />
              <div className="flex gap-2">
                <Input type="number" min="0.01" step="0.01" value={cantidad} onChange={(event) => setCantidad(event.target.value)} />
                <Button type="button" variant="outline" onClick={agregar}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
              </div>
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
              <Button type="submit" disabled={cargando || items.length === 0}>{cargando ? "Guardando..." : "Registrar ajuste"}</Button>
            </div>
          </form>
        </aside>
      </div>
    </Portal>
  );
}

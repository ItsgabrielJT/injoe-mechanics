"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Wand2, X } from "lucide-react";
import { z } from "zod";
import {
  CATEGORIAS_SERVICIO,
  TIPOS_IMPUESTO,
  generarCodigoServicio,
  type CategoriaServicio,
  type Servicio,
  type TipoImpuesto,
} from "@/modules/servicios/domain/entities";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

const DESCRIPCION_MAX = 500;

const schema = z.object({
  codigo: z.string().max(20, "El código no puede superar 20 caracteres"),
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre del servicio es obligatorio")
    .max(255, "El nombre no puede superar 255 caracteres"),
  descripcion: z.string().max(DESCRIPCION_MAX, `La descripción no puede superar ${DESCRIPCION_MAX} caracteres`),
  categoria: z.string(),
  precio_venta: z.coerce
    .number({ invalid_type_error: "El precio de venta es obligatorio" })
    .gt(0, "El precio de venta debe ser mayor a 0")
    .lte(99999999.99, "El precio supera el máximo permitido"),
  aplica_iva: z.boolean(),
  tipo_impuesto: z
    .string()
    .min(1, "El tipo de impuesto es obligatorio")
    .refine(
      (valor): valor is "0" | "5" | "15" | "no_objeto" | "exento_iva" =>
        ["0", "5", "15", "no_objeto", "exento_iva"].includes(valor),
      "Selecciona un tipo de impuesto válido",
    ),
  peso: z.preprocess((valor) => {
    if (valor === "" || valor === undefined || valor === null) {
      return undefined;
    }
    const numero = Number(valor);
    return Number.isNaN(numero) ? valor : numero;
  }, z.number({ invalid_type_error: "El peso debe ser un número" }).min(0, "El peso no puede ser negativo").optional()),
  activo: z.boolean(),
});

export type ServicioFormValues = z.output<typeof schema>;
type ServicioFormInput = z.input<typeof schema>;

interface ServicioFormDrawerProps {
  abierto: boolean;
  cargando?: boolean;
  servicio?: Servicio | null;
  onClose: () => void;
  onSubmit: (values: ServicioFormValues) => Promise<void>;
}

function valoresIniciales(servicio?: Servicio | null): ServicioFormInput {
  return {
    codigo: servicio?.codigo ?? generarCodigoServicio(),
    nombre: servicio?.nombre ?? "",
    descripcion: servicio?.descripcion ?? "",
    categoria: servicio?.categoria ?? "",
    precio_venta: servicio?.precioVenta ?? ("" as unknown as number),
    aplica_iva: servicio?.aplicaIva ?? true,
    tipo_impuesto: (servicio?.tipoImpuesto ?? "") as TipoImpuesto,
    peso: servicio?.peso ?? undefined,
    activo: servicio?.activo ?? true,
  };
}

function recolectarMensajes(error: unknown): string[] {
  const mensajes: string[] = [];
  const visitar = (nodo: unknown) => {
    if (!nodo || typeof nodo !== "object") {
      return;
    }
    const rec = nodo as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.trim()) {
      mensajes.push(rec.message);
    }
    for (const [clave, valor] of Object.entries(rec)) {
      if (clave === "ref" || clave === "type" || clave === "types") {
        continue;
      }
      visitar(valor);
    }
  };
  visitar(error);
  return [...new Set(mensajes)];
}

export function ServicioFormDrawer({ abierto, cargando, servicio, onClose, onSubmit }: ServicioFormDrawerProps) {
  const form = useForm<ServicioFormInput, unknown, ServicioFormValues>({
    resolver: zodResolver(schema),
    defaultValues: valoresIniciales(servicio),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const mensajesError = recolectarMensajes(form.formState.errors);
  const descripcion = form.watch("descripcion") ?? "";

  useEffect(() => {
    if (abierto) {
      form.reset(valoresIniciales(servicio));
    }
  }, [abierto, servicio, form]);

  useEffect(() => {
    if (!abierto) {
      return;
    }
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [abierto]);

  if (!abierto) {
    return null;
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <aside className="absolute inset-y-0 right-0 w-full sm:max-w-xl bg-card shadow-elegant overflow-y-auto">
          <div className="sticky top-0 z-10 border-b bg-card">
            <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold">{servicio ? "Editar servicio" : "Nuevo servicio"}</h2>
                <p className="text-sm text-muted-foreground">Solo nombre, precio de venta y tipo de impuesto son obligatorios</p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {form.formState.isSubmitted && mensajesError.length > 0 && (
              <div
                id="servicio-form-errores"
                className="mx-4 sm:mx-6 mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                <p className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  No se pudo guardar. Revisa estos campos:
                </p>
                <ul className="mt-2 list-disc space-y-0.5 pl-6">
                  {mensajesError.map((mensaje) => (
                    <li key={mensaje}>{mensaje}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <form
            className="p-4 sm:p-6 space-y-8"
            onSubmit={form.handleSubmit(onSubmit, () => {
              requestAnimationFrame(() => {
                document.getElementById("servicio-form-errores")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              });
            })}
          >
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Información principal</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nombre del servicio *</Label>
                  <Input
                    className={cn(form.formState.errors.nombre && "border-destructive focus-visible:ring-destructive")}
                    maxLength={255}
                    placeholder="Cambio de aceite"
                    {...form.register("nombre")}
                  />
                  {form.formState.errors.nombre && (
                    <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Código</Label>
                  <div className="flex gap-2">
                    <Input
                      className={cn(form.formState.errors.codigo && "border-destructive focus-visible:ring-destructive")}
                      maxLength={20}
                      placeholder="LRCT-00212"
                      {...form.register("codigo")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => form.setValue("codigo", generarCodigoServicio(), { shouldValidate: true })}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      Generar
                    </Button>
                  </div>
                  {form.formState.errors.codigo && (
                    <p className="text-xs text-destructive">{form.formState.errors.codigo.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background"
                    {...form.register("categoria")}
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORIAS_SERVICIO.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de impuesto *</Label>
                  <select
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background",
                      form.formState.errors.tipo_impuesto && "border-destructive focus-visible:ring-destructive",
                    )}
                    {...form.register("tipo_impuesto")}
                  >
                    <option value="">Selecciona</option>
                    {TIPOS_IMPUESTO.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.tipo_impuesto && (
                    <p className="text-xs text-destructive">{form.formState.errors.tipo_impuesto.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>Descripción</Label>
                    <span className="text-xs text-muted-foreground">{descripcion.length}/{DESCRIPCION_MAX}</span>
                  </div>
                  <textarea
                    className={cn(
                      "min-h-24 w-full rounded-md border border-input px-3 py-2 text-sm",
                      form.formState.errors.descripcion && "border-destructive focus-visible:ring-destructive",
                    )}
                    maxLength={DESCRIPCION_MAX}
                    {...form.register("descripcion")}
                  />
                  {form.formState.errors.descripcion && (
                    <p className="text-xs text-destructive">{form.formState.errors.descripcion.message}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Precio</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Precio de venta (USD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={cn(form.formState.errors.precio_venta && "border-destructive focus-visible:ring-destructive")}
                    placeholder="0.00"
                    {...form.register("precio_venta")}
                  />
                  {form.formState.errors.precio_venta && (
                    <p className="text-xs text-destructive">{form.formState.errors.precio_venta.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Peso</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className={cn(form.formState.errors.peso && "border-destructive focus-visible:ring-destructive")}
                    placeholder="Opcional"
                    {...form.register("peso")}
                  />
                  {form.formState.errors.peso && (
                    <p className="text-xs text-destructive">{form.formState.errors.peso.message}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Impuesto y estado</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...form.register("aplica_iva")} />
                Aplica IVA
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...form.register("activo")} />
                Servicio activo
              </label>
            </section>

            <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 border-t bg-card py-4">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={cargando}>
                {cargando ? "Guardando..." : "Guardar servicio"}
              </Button>
            </div>
          </form>
        </aside>
      </div>
    </Portal>
  );
}

export function aCategoria(valor: string): CategoriaServicio | null {
  return (CATEGORIAS_SERVICIO.find((item) => item.value === valor)?.value ?? null);
}

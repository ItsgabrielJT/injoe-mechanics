"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, X } from "lucide-react";
import { z } from "zod";
import {
  TIPOS_IMPUESTO,
  formatoPrecio,
  precioVentaFinal,
  type Bodega,
  type CategoriaProducto,
  type Producto,
  type TipoImpuesto,
} from "@/modules/inventario/domain/entities";
import { BuscadorSelect } from "@/modules/inventario/presentation/components/buscador-select";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

const schema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio").max(20, "Máximo 20 caracteres"),
  codigo_barras: z.string().max(64).refine((valor) => !valor || /^[A-Za-z0-9_-]+$/.test(valor), "El código de barras debe ser alfanumérico"),
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(255),
  descripcion: z.string().max(500),
  categoria_id: z.number({ invalid_type_error: "Selecciona una categoría" }).min(1, "Selecciona una categoría"),
  precio_base: z.coerce.number({ invalid_type_error: "El precio de venta es obligatorio" }).gt(0, "El precio debe ser mayor a 0"),
  incluye_iva: z.boolean(),
  aplica_iva: z.boolean(),
  tipo_impuesto: z.string().min(1, "El tipo de impuesto es obligatorio"),
  stock_minimo: z.coerce.number().min(0).default(0),
  stock_maximo: z.preprocess((valor) => (valor === "" || valor === null ? undefined : valor), z.coerce.number().min(0).optional()),
  unidad_medida: z.string().max(20),
  peso: z.preprocess((valor) => (valor === "" || valor === null ? undefined : valor), z.coerce.number().min(0).optional()),
  activo: z.boolean(),
  aplica_inventario: z.boolean(),
  registrar_stock: z.boolean(),
  bodega_id: z.number().nullable(),
  cantidad_inicial: z.coerce.number().min(0).optional(),
}).superRefine((values, ctx) => {
  if (values.aplica_inventario && values.registrar_stock) {
    if (!values.bodega_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona una bodega", path: ["bodega_id"] });
    }
    if (!values.cantidad_inicial || values.cantidad_inicial <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La cantidad inicial debe ser mayor a 0", path: ["cantidad_inicial"] });
    }
  }
});

export type ProductoFormValues = z.output<typeof schema>;
type ProductoFormInput = z.input<typeof schema>;

interface Props {
  abierto: boolean;
  cargando?: boolean;
  producto?: Producto | null;
  categorias: CategoriaProducto[];
  bodegas: Bodega[];
  onClose: () => void;
  onSubmit: (values: ProductoFormValues) => Promise<void>;
}

export function ProductoFormDrawer({ abierto, cargando, producto, categorias, bodegas, onClose, onSubmit }: Props) {
  const form = useForm<ProductoFormInput, unknown, ProductoFormValues>({
    resolver: zodResolver(schema),
    defaultValues: valoresIniciales(producto),
  });
  const incluyeIva = form.watch("incluye_iva");
  const aplicaIva = form.watch("aplica_iva");
  const tipoImpuesto = form.watch("tipo_impuesto") as TipoImpuesto;
  const precioBase = Number(form.watch("precio_base") || 0);
  const registrarStock = form.watch("registrar_stock");
  const precioFinal = useMemo(
    () => precioVentaFinal(precioBase || 0, incluyeIva, tipoImpuesto || "15", aplicaIva),
    [aplicaIva, incluyeIva, precioBase, tipoImpuesto],
  );

  useEffect(() => {
    if (abierto) {
      form.reset(valoresIniciales(producto));
    }
  }, [abierto, producto, form]);

  if (!abierto) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <aside className="absolute inset-y-0 right-0 w-full sm:max-w-xl bg-card shadow-elegant overflow-y-auto">
          <div className="sticky top-0 z-10 border-b bg-card flex items-start justify-between gap-3 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">{producto ? "Editar producto" : "Nuevo producto"}</h2>
              <p className="text-sm text-muted-foreground">Código, nombre, precio, impuesto y categoría son obligatorios</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <form className="p-6 space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
            {form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Revisa los campos</p>
                <ul className="mt-2 list-disc pl-6">
                  {Object.values(form.formState.errors).map((error) => (
                    <li key={error.message}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {categorias.length === 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
                Primero crea una categoría en la pestaña Categorías.
              </div>
            )}

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Identificación</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input maxLength={20} {...form.register("codigo")} className={cn(form.formState.errors.codigo && "border-destructive")} />
                  {form.formState.errors.codigo && <p className="text-xs text-destructive">{form.formState.errors.codigo.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Código de barras</Label>
                  <Input maxLength={64} {...form.register("codigo_barras")} className={cn(form.formState.errors.codigo_barras && "border-destructive")} />
                  {form.formState.errors.codigo_barras && <p className="text-xs text-destructive">{form.formState.errors.codigo_barras.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nombre del producto *</Label>
                  <Input maxLength={255} {...form.register("nombre")} className={cn(form.formState.errors.nombre && "border-destructive")} />
                  {form.formState.errors.nombre && <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Categoría *</Label>
                  <Controller
                    control={form.control}
                    name="categoria_id"
                    render={({ field }) => (
                      <BuscadorSelect
                        opciones={categorias.filter((item) => item.activo || item.id === producto?.categoriaId).map((item) => ({ id: item.id, label: item.nombre }))}
                        valor={field.value || null}
                        onChange={(id) => field.onChange(id ?? 0)}
                        placeholder="Buscar categoría"
                        error={Boolean(form.formState.errors.categoria_id)}
                      />
                    )}
                  />
                  {form.formState.errors.categoria_id && <p className="text-xs text-destructive">{form.formState.errors.categoria_id.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Descripción</Label>
                  <textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm" maxLength={500} {...form.register("descripcion")} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Precio e impuesto</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Precio *</Label>
                  <Input type="number" step="0.01" min="0.01" {...form.register("precio_base")} className={cn(form.formState.errors.precio_base && "border-destructive")} />
                  {form.formState.errors.precio_base && <p className="text-xs text-destructive">{form.formState.errors.precio_base.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Tipo de impuesto *</Label>
                  <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background" {...form.register("tipo_impuesto")}>
                    <option value="">Selecciona</option>
                    {TIPOS_IMPUESTO.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...form.register("aplica_iva")} /> Aplica IVA
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...form.register("incluye_iva")} /> El precio ya incluye IVA
              </label>
              <p className="text-sm text-muted-foreground">
                Precio de venta que se guardará: <strong className="text-foreground">{formatoPrecio(precioFinal || 0)}</strong>
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Inventario</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...form.register("aplica_inventario")} /> Aplica inventario
              </label>
              {!form.watch("aplica_inventario") && (
                <p className="text-sm text-muted-foreground">Este producto no moverá stock ni generará errores de inventario.</p>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Stock mín.</Label>
                  <Input type="number" min="0" step="0.01" {...form.register("stock_minimo")} />
                </div>
                <div className="space-y-2">
                  <Label>Stock máx.</Label>
                  <Input type="number" min="0" step="0.01" {...form.register("stock_maximo")} />
                </div>
                <div className="space-y-2">
                  <Label>Unidad</Label>
                  <Input maxLength={20} {...form.register("unidad_medida")} />
                </div>
                <div className="space-y-2">
                  <Label>Peso</Label>
                  <Input type="number" min="0" step="0.01" {...form.register("peso")} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...form.register("activo")} /> Producto activo
              </label>
            </section>

            {!producto && form.watch("aplica_inventario") && (
              <section className="space-y-4 rounded-lg border p-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="h-4 w-4" {...form.register("registrar_stock")} /> Registrar inventario inicial
                </label>
                {registrarStock && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Bodega *</Label>
                      <Controller
                        control={form.control}
                        name="bodega_id"
                        render={({ field }) => (
                          <BuscadorSelect
                            opciones={bodegas.filter((item) => item.activo).map((item) => ({ id: item.id, label: item.nombre, extra: item.ubicacion ?? undefined }))}
                            valor={field.value}
                            onChange={field.onChange}
                            placeholder="Buscar bodega"
                            error={Boolean(form.formState.errors.bodega_id)}
                          />
                        )}
                      />
                      {form.formState.errors.bodega_id && <p className="text-xs text-destructive">{form.formState.errors.bodega_id.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Cantidad inicial *</Label>
                      <Input type="number" min="0.01" step="0.01" {...form.register("cantidad_inicial")} />
                      {form.formState.errors.cantidad_inicial && <p className="text-xs text-destructive">{form.formState.errors.cantidad_inicial.message}</p>}
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={cargando || categorias.length === 0}>{cargando ? "Guardando..." : "Guardar producto"}</Button>
            </div>
          </form>
        </aside>
      </div>
    </Portal>
  );
}

function valoresIniciales(producto?: Producto | null): ProductoFormInput {
  return {
    codigo: producto?.codigo ?? "",
    codigo_barras: producto?.codigoBarras ?? "",
    nombre: producto?.nombre ?? "",
    descripcion: producto?.descripcion ?? "",
    categoria_id: producto?.categoriaId ?? ("" as unknown as number),
    precio_base: producto?.precioVenta ?? ("" as unknown as number),
    incluye_iva: true,
    aplica_iva: producto?.aplicaIva ?? true,
    tipo_impuesto: producto?.tipoImpuesto ?? "",
    stock_minimo: producto?.stockMinimo ?? 0,
    stock_maximo: producto?.stockMaximo ?? undefined,
    unidad_medida: producto?.unidadMedida ?? "UN",
    peso: producto?.peso ?? undefined,
    activo: producto?.activo ?? true,
    aplica_inventario: producto?.aplicaInventario ?? true,
    registrar_stock: false,
    bodega_id: null,
    cantidad_inicial: undefined,
  };
}

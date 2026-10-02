"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, X } from "lucide-react";
import { z } from "zod";
import type { CategoriaProducto } from "@/modules/inventario/domain/entities";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

const schema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(120, "Máximo 120 caracteres"),
  descripcion: z.string().max(500, "Máximo 500 caracteres"),
  activo: z.boolean(),
});

export type CategoriaFormValues = z.infer<typeof schema>;

interface Props {
  abierto: boolean;
  cargando?: boolean;
  categoria?: CategoriaProducto | null;
  onClose: () => void;
  onSubmit: (values: CategoriaFormValues) => Promise<void>;
}

export function CategoriaFormDrawer({ abierto, cargando, categoria, onClose, onSubmit }: Props) {
  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: categoria?.nombre ?? "", descripcion: categoria?.descripcion ?? "", activo: categoria?.activo ?? true },
  });

  useEffect(() => {
    if (abierto) {
      form.reset({
        nombre: categoria?.nombre ?? "",
        descripcion: categoria?.descripcion ?? "",
        activo: categoria?.activo ?? true,
      });
    }
  }, [abierto, categoria, form]);

  if (!abierto) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <aside className="absolute inset-y-0 right-0 w-full sm:max-w-lg bg-card shadow-elegant overflow-y-auto">
          <div className="sticky top-0 z-10 border-b bg-card flex items-start justify-between gap-3 px-6 py-4">
            <h2 className="text-lg font-semibold">{categoria ? "Editar categoría" : "Nueva categoría"}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <form className="p-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" /> Revisa los campos obligatorios
              </div>
            )}
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input maxLength={120} {...form.register("nombre")} className={cn(form.formState.errors.nombre && "border-destructive")} />
              {form.formState.errors.nombre && <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <textarea className="min-h-24 w-full rounded-md border border-input px-3 py-2 text-sm" maxLength={500} {...form.register("descripcion")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...form.register("activo")} /> Categoría activa
            </label>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={cargando}>{cargando ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </aside>
      </div>
    </Portal>
  );
}

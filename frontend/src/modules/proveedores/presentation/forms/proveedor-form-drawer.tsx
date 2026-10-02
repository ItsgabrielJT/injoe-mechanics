"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, X } from "lucide-react";
import { z } from "zod";
import type { Proveedor, TipoPersona } from "@/modules/proveedores/domain/entities";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

const schema = z.object({
  identificacion: z.string().regex(/^\d{10}$|^\d{13}$/, "RUC (13) o cédula (10) dígitos"),
  nombres: z.string().trim().min(2, "El nombre es obligatorio").max(255),
  tipo_persona: z.enum(["PERSONA_NATURAL", "PERSONA_JURIDICA"]),
  razon_social: z.string().max(255),
  direccion: z.string(),
  telefono: z.string(),
  correo: z.string(),
  direccion_fiscal: z.string(),
  telefono_fiscal: z.string(),
  correo_fiscal: z.string(),
  notas: z.string(),
  activo: z.boolean(),
});

export type ProveedorFormValues = z.infer<typeof schema>;

interface Props {
  abierto: boolean;
  cargando?: boolean;
  proveedor?: Proveedor | null;
  onClose: () => void;
  onSubmit: (values: ProveedorFormValues) => Promise<void>;
}

export function ProveedorFormDrawer({ abierto, cargando, proveedor, onClose, onSubmit }: Props) {
  const form = useForm<ProveedorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: valores(proveedor),
  });

  useEffect(() => {
    if (abierto) form.reset(valores(proveedor));
  }, [abierto, proveedor, form]);

  if (!abierto) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <aside className="absolute inset-y-0 right-0 w-full sm:max-w-xl bg-card shadow-elegant overflow-y-auto">
          <div className="sticky top-0 z-10 border-b bg-card flex items-start justify-between gap-3 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">{proveedor ? "Editar proveedor" : "Nuevo proveedor"}</h2>
              <p className="text-sm text-muted-foreground">Solo son obligatorios el RUC/cédula y el nombre</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <form className="p-6 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Revisa los campos</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="RUC / Cédula *" error={form.formState.errors.identificacion?.message}>
                <Input maxLength={13} {...form.register("identificacion")} />
              </Campo>
              <Campo label="Nombre *" error={form.formState.errors.nombres?.message}>
                <Input maxLength={255} {...form.register("nombres")} />
              </Campo>
              <Campo label="Tipo">
                <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background" {...form.register("tipo_persona")}>
                  <option value="PERSONA_NATURAL">Persona natural</option>
                  <option value="PERSONA_JURIDICA">Persona jurídica</option>
                </select>
              </Campo>
              <Campo label="Razón social">
                <Input {...form.register("razon_social")} />
              </Campo>
              <Campo label="Teléfono">
                <Input {...form.register("telefono")} />
              </Campo>
              <Campo label="Correo">
                <Input type="email" {...form.register("correo")} />
              </Campo>
              <div className="space-y-2 sm:col-span-2">
                <Label>Dirección</Label>
                <Input {...form.register("direccion")} />
              </div>
              <Campo label="Teléfono fiscal">
                <Input {...form.register("telefono_fiscal")} />
              </Campo>
              <Campo label="Correo fiscal">
                <Input {...form.register("correo_fiscal")} />
              </Campo>
              <div className="space-y-2 sm:col-span-2">
                <Label>Dirección fiscal</Label>
                <Input {...form.register("direccion_fiscal")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notas</Label>
                <textarea className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm" {...form.register("notas")} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="h-4 w-4" {...form.register("activo")} /> Activo
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={cargando}>{cargando ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </aside>
      </div>
    </Portal>
  );
}

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={cn(error && "[&_input]:border-destructive")}>{children}</div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function valores(proveedor?: Proveedor | null): ProveedorFormValues {
  return {
    identificacion: proveedor?.identificacion ?? "",
    nombres: proveedor?.nombres ?? "",
    tipo_persona: (proveedor?.tipoPersona ?? "PERSONA_NATURAL") as TipoPersona,
    razon_social: proveedor?.razonSocial ?? "",
    direccion: proveedor?.direccion ?? "",
    telefono: proveedor?.telefono ?? "",
    correo: proveedor?.correo ?? "",
    direccion_fiscal: proveedor?.direccionFiscal ?? "",
    telefono_fiscal: proveedor?.telefonoFiscal ?? "",
    correo_fiscal: proveedor?.correoFiscal ?? "",
    notas: proveedor?.notas ?? "",
    activo: proveedor?.activo ?? true,
  };
}

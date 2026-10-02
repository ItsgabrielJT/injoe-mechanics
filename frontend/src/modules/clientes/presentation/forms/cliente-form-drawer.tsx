"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Mail, MapPin, Phone, Plus, Star, Trash2, X } from "lucide-react";
import { z } from "zod";
import type { Cliente } from "@/modules/clientes/domain/entities";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

const schema = z.object({
  identificacion: z
    .string()
    .refine((valor) => !valor || valor.length === 10 || valor.length === 13, "La cédula debe tener 10 dígitos o el RUC 13"),
  nombres: z.string().min(2, "Los nombres son obligatorios"),
  tipo_cliente: z.enum(["PERSONA_NATURAL", "PERSONA_JURIDICA"]),
  razon_social: z.string().optional(),
  fecha_nacimiento: z.string().optional(),
  provincia: z.string().optional(),
  canton: z.string().optional(),
  parroquia: z.string().optional(),
  correos: z
    .array(
      z.object({
        value: z
          .string()
          .trim()
          .refine((valor) => !valor || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor), "Ingresa un correo válido"),
      }),
    )
    .min(1, "Debe registrar al menos un correo"),
  telefonos: z.array(z.object({ value: z.string() })),
  direcciones: z.array(z.object({ value: z.string() })),
  indice_correo_principal: z.number(),
  indice_telefono_principal: z.number(),
  indice_direccion_principal: z.number(),
  direccion_fiscal: z.string().optional(),
  telefono_fiscal: z.string().optional(),
  correo_fiscal: z.string().optional(),
  notas: z.string().optional(),
  activo: z.boolean(),
  ficha_incompleta: z.boolean(),
}).superRefine((values, ctx) => {
  if (!values.ficha_incompleta) {
    if (!values.identificacion || (values.identificacion.length !== 10 && values.identificacion.length !== 13)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La cédula debe tener 10 dígitos o el RUC 13", path: ["identificacion"] });
    }
    const correos = values.correos.map((item) => item.value.trim()).filter(Boolean);
    if (correos.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Debe registrar al menos un correo", path: ["correos"] });
    }
  }
});

export type ClienteFormValues = z.infer<typeof schema>;

interface ClienteFormDrawerProps {
  abierto: boolean;
  cargando?: boolean;
  cliente?: Cliente | null;
  onClose: () => void;
  onSubmit: (values: ClienteFormValues) => Promise<void>;
}

function valoresIniciales(cliente?: Cliente | null): ClienteFormValues {
  return {
    identificacion: cliente?.identificacion ?? "",
    nombres: cliente?.nombres ?? "",
    tipo_cliente: cliente?.tipoCliente ?? "PERSONA_NATURAL",
    razon_social: cliente?.razonSocial ?? "",
    fecha_nacimiento: cliente?.fechaNacimiento ?? "",
    provincia: cliente?.provincia ?? "",
    canton: cliente?.canton ?? "",
    parroquia: cliente?.parroquia ?? "",
    correos: (cliente?.correos.length ? cliente.correos : [""]).map((value) => ({ value })),
    telefonos: (cliente?.telefonos.length ? cliente.telefonos : [""]).map((value) => ({ value })),
    direcciones: (cliente?.direcciones.length ? cliente.direcciones : [""]).map((value) => ({ value })),
    indice_correo_principal: cliente?.indiceCorreoPrincipal ?? 0,
    indice_telefono_principal: cliente?.indiceTelefonoPrincipal ?? 0,
    indice_direccion_principal: cliente?.indiceDireccionPrincipal ?? 0,
    direccion_fiscal: cliente?.direccionFiscal ?? "",
    telefono_fiscal: cliente?.telefonoFiscal ?? "",
    correo_fiscal: cliente?.correoFiscal ?? "",
    notas: cliente?.notas ?? "",
    activo: cliente?.activo ?? true,
    ficha_incompleta: Boolean(cliente && !cliente.identificacion),
  };
}

function textoError(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const nodo = error as { message?: unknown; root?: { message?: unknown } };
  if (typeof nodo.message === "string" && nodo.message.trim()) {
    return nodo.message;
  }
  if (typeof nodo.root?.message === "string" && nodo.root.message.trim()) {
    return nodo.root.message;
  }
  return undefined;
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

function ListaContactos({
  titulo,
  icono,
  fields,
  onAdd,
  onRemove,
  registerName,
  register,
  errores,
  principal,
  onPrincipal,
}: {
  titulo: string;
  icono: React.ReactNode;
  fields: { id: string }[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  registerName: "correos" | "telefonos" | "direcciones";
  register: ReturnType<typeof useForm<ClienteFormValues>>["register"];
  errores?: unknown;
  principal: number;
  onPrincipal: (index: number) => void;
}) {
  const errorLista = textoError(errores);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">{icono}{titulo}</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Agregar
        </Button>
      </div>
      {errorLista && <p className="text-xs text-destructive">{errorLista}</p>}
      {fields.map((field, index) => {
        const errorItem = textoError((errores as { [key: number]: { value?: unknown } } | undefined)?.[index]?.value);
        return (
          <div key={field.id} className="space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <Input
                className={cn("min-w-0 flex-1", errorItem && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={Boolean(errorItem)}
                {...register(`${registerName}.${index}.value`)}
                placeholder={titulo}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => onPrincipal(index)} title="Marcar principal">
                <Star className={`h-4 w-4 ${principal === index ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </Button>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            {errorItem && <p className="text-xs text-destructive">{errorItem}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function ClienteFormDrawer({ abierto, cargando, cliente, onClose, onSubmit }: ClienteFormDrawerProps) {
  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: valoresIniciales(cliente),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const correos = useFieldArray({ control: form.control, name: "correos" });
  const telefonos = useFieldArray({ control: form.control, name: "telefonos" });
  const direcciones = useFieldArray({ control: form.control, name: "direcciones" });
  const mensajesError = recolectarMensajes(form.formState.errors);

  useEffect(() => {
    if (abierto) {
      form.reset(valoresIniciales(cliente));
    }
  }, [abierto, cliente, form]);

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
                <h2 className="text-lg sm:text-xl font-semibold">{cliente ? "Editar cliente" : "Nuevo cliente"}</h2>
                <p className="text-sm text-muted-foreground">Solo cédula, nombres y un correo son obligatorios</p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {form.formState.isSubmitted && mensajesError.length > 0 && (
              <div
                id="cliente-form-errores"
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
                document.getElementById("cliente-form-errores")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              });
            })}
          >
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Identidad</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{cliente && !cliente.identificacion ? "Cédula / RUC" : "Cédula / RUC *"}</Label>
                  <Input
                    className={cn(form.formState.errors.identificacion && "border-destructive focus-visible:ring-destructive")}
                    {...form.register("identificacion")}
                    maxLength={13}
                  />
                  {form.formState.errors.identificacion && (
                    <p className="text-xs text-destructive">{form.formState.errors.identificacion.message}</p>
                  )}
                  {cliente && !cliente.identificacion && (
                    <p className="text-xs text-muted-foreground">Ficha creada desde una orden. Completa cédula y correo cuando los tengas; puedes guardar solo el nombre.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input px-3 text-sm"
                    {...form.register("tipo_cliente")}
                  >
                    <option value="PERSONA_NATURAL">Persona natural</option>
                    <option value="PERSONA_JURIDICA">Persona jurídica</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nombres *</Label>
                  <Input
                    className={cn(form.formState.errors.nombres && "border-destructive focus-visible:ring-destructive")}
                    {...form.register("nombres")}
                  />
                  {form.formState.errors.nombres && (
                    <p className="text-xs text-destructive">{form.formState.errors.nombres.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Razón social</Label>
                  <Input {...form.register("razon_social")} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de nacimiento</Label>
                  <Input type="date" {...form.register("fecha_nacimiento")} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Ubicación</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Provincia</Label>
                  <Input {...form.register("provincia")} />
                </div>
                <div className="space-y-2">
                  <Label>Cantón</Label>
                  <Input {...form.register("canton")} />
                </div>
                <div className="space-y-2">
                  <Label>Parroquia</Label>
                  <Input {...form.register("parroquia")} />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Contactos</h3>
              <ListaContactos
                titulo="Correos *"
                icono={<Mail className="h-4 w-4 text-primary" />}
                fields={correos.fields}
                onAdd={() => correos.append({ value: "" })}
                onRemove={correos.remove}
                registerName="correos"
                register={form.register}
                errores={form.formState.errors.correos}
                principal={form.watch("indice_correo_principal")}
                onPrincipal={(index) => form.setValue("indice_correo_principal", index)}
              />
              <ListaContactos
                titulo="Teléfonos"
                icono={<Phone className="h-4 w-4 text-primary" />}
                fields={telefonos.fields}
                onAdd={() => telefonos.append({ value: "" })}
                onRemove={telefonos.remove}
                registerName="telefonos"
                register={form.register}
                errores={form.formState.errors.telefonos}
                principal={form.watch("indice_telefono_principal")}
                onPrincipal={(index) => form.setValue("indice_telefono_principal", index)}
              />
              <ListaContactos
                titulo="Direcciones"
                icono={<MapPin className="h-4 w-4 text-primary" />}
                fields={direcciones.fields}
                onAdd={() => direcciones.append({ value: "" })}
                onRemove={direcciones.remove}
                registerName="direcciones"
                register={form.register}
                errores={form.formState.errors.direcciones}
                principal={form.watch("indice_direccion_principal")}
                onPrincipal={(index) => form.setValue("indice_direccion_principal", index)}
              />
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Datos fiscales y notas</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Dirección fiscal</Label>
                  <Input {...form.register("direccion_fiscal")} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono fiscal</Label>
                  <Input {...form.register("telefono_fiscal")} />
                </div>
                <div className="space-y-2">
                  <Label>Correo fiscal</Label>
                  <Input {...form.register("correo_fiscal")} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notas</Label>
                  <textarea
                    className="min-h-24 w-full rounded-md border border-input px-3 py-2 text-sm"
                    {...form.register("notas")}
                  />
                </div>
              </div>
            </section>

            <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 border-t bg-card py-4">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={cargando}>
                {cargando ? "Guardando..." : "Guardar cliente"}
              </Button>
            </div>
          </form>
        </aside>
      </div>
    </Portal>
  );
}

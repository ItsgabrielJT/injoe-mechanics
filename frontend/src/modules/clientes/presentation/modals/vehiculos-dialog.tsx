"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Car, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Vehiculo, VehiculoInput } from "@/modules/clientes/domain/entities";
import { TIPOS_COMBUSTIBLE, TIPOS_TRANSMISION, TIPOS_VEHICULO } from "@/modules/clientes/domain/entities";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface VehiculosDialogProps {
  abierto: boolean;
  clienteNombre: string;
  vehiculos: Vehiculo[];
  cargando?: boolean;
  onClose: () => void;
  onCrear: (input: Omit<VehiculoInput, "cliente_id">) => Promise<void>;
  onActualizar: (id: number, input: Omit<VehiculoInput, "cliente_id">) => Promise<void>;
  onEliminar: (id: number) => Promise<void>;
}

interface FormVehiculo {
  placa: string;
  marca: string;
  modelo: string;
  anio: string;
  tipo: string;
  color: string;
  combustible: string;
  cilindrada: string;
  transmision: string;
  notas: string;
}

const vacio: FormVehiculo = {
  placa: "",
  marca: "",
  modelo: "",
  anio: "",
  tipo: "",
  color: "",
  combustible: "",
  cilindrada: "",
  transmision: "",
  notas: "",
};

function aInput(values: FormVehiculo): Omit<VehiculoInput, "cliente_id"> {
  return {
    placa: values.placa,
    marca: values.marca || null,
    modelo: values.modelo || null,
    anio: values.anio ? Number(values.anio) : null,
    tipo: (values.tipo || null) as VehiculoInput["tipo"],
    color: values.color || null,
    combustible: (values.combustible || null) as VehiculoInput["combustible"],
    cilindrada: values.cilindrada ? Number(values.cilindrada) : null,
    transmision: (values.transmision || null) as VehiculoInput["transmision"],
    notas: values.notas || null,
  };
}

export function VehiculosDialog({
  abierto,
  clienteNombre,
  vehiculos,
  cargando,
  onClose,
  onCrear,
  onActualizar,
  onEliminar,
}: VehiculosDialogProps) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Vehiculo | null>(null);
  const [vehiculoAEliminar, setVehiculoAEliminar] = useState<Vehiculo | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormVehiculo>({ defaultValues: vacio });

  useEffect(() => {
    if (abierto) {
      setMostrarForm(false);
      setEditando(null);
      setError(null);
      form.reset(vacio);
    }
  }, [abierto, form]);

  if (!abierto) {
    return null;
  }

  async function guardar(values: FormVehiculo) {
    setError(null);
    if (!values.placa.trim()) {
      setError("La placa es obligatoria");
      return;
    }
    try {
      const payload = aInput(values);
      if (editando) {
        await onActualizar(editando.id, payload);
      } else {
        await onCrear(payload);
      }
      setMostrarForm(false);
      setEditando(null);
      form.reset(vacio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el vehículo");
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl bg-card shadow-elegant overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b px-4 sm:px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Car className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">Vehículos de {clienteNombre}</span>
            </h2>
            <p className="text-sm text-muted-foreground">Solo la placa es obligatoria</p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex justify-stretch sm:justify-end">
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                setEditando(null);
                form.reset(vacio);
                setMostrarForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Registrar vehículo
            </Button>
          </div>
          {vehiculos.length === 0 && !mostrarForm && (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              Este cliente aún no tiene vehículos
            </div>
          )}
          <div className="grid gap-3">
            {vehiculos.map((vehiculo) => (
              <div key={vehiculo.id} className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-3 min-w-0">
                <div>
                  <p className="font-semibold text-lg tracking-wide">{vehiculo.placa}</p>
                  <p className="text-sm text-muted-foreground">
                    {[vehiculo.marca, vehiculo.modelo, vehiculo.anio, vehiculo.color].filter(Boolean).join(" · ") || "Sin más datos"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditando(vehiculo);
                      form.reset({
                        placa: vehiculo.placa,
                        marca: vehiculo.marca ?? "",
                        modelo: vehiculo.modelo ?? "",
                        anio: vehiculo.anio ? String(vehiculo.anio) : "",
                        tipo: vehiculo.tipo ?? "",
                        color: vehiculo.color ?? "",
                        combustible: vehiculo.combustible ?? "",
                        cilindrada: vehiculo.cilindrada ? String(vehiculo.cilindrada) : "",
                        transmision: vehiculo.transmision ?? "",
                        notas: vehiculo.notas ?? "",
                      });
                      setMostrarForm(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setVehiculoAEliminar(vehiculo)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {mostrarForm && (
            <form className="rounded-xl border p-4 space-y-4 bg-background" onSubmit={form.handleSubmit(guardar)}>
              <p className="font-medium">{editando ? "Editar vehículo" : "Nuevo vehículo"}</p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Placa *</Label>
                  <Input {...form.register("placa")} className="uppercase" />
                </div>
                <div className="space-y-1">
                  <Label>Marca</Label>
                  <Input {...form.register("marca")} />
                </div>
                <div className="space-y-1">
                  <Label>Modelo</Label>
                  <Input {...form.register("modelo")} />
                </div>
                <div className="space-y-1">
                  <Label>Año</Label>
                  <Input type="number" {...form.register("anio")} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm" {...form.register("tipo")}>
                    <option value="">Sin especificar</option>
                    {TIPOS_VEHICULO.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Color</Label>
                  <Input {...form.register("color")} />
                </div>
                <div className="space-y-1">
                  <Label>Combustible</Label>
                  <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm" {...form.register("combustible")}>
                    <option value="">Sin especificar</option>
                    {TIPOS_COMBUSTIBLE.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Transmisión</Label>
                  <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm" {...form.register("transmision")}>
                    <option value="">Sin especificar</option>
                    {TIPOS_TRANSMISION.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Cilindrada</Label>
                  <Input type="number" step="0.01" {...form.register("cilindrada")} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Notas</Label>
                  <Input {...form.register("notas")} />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setMostrarForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={cargando}>
                  {cargando ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(vehiculoAEliminar)}
        title="Eliminar vehículo"
        description={`Se quitará este vehículo de ${clienteNombre}. Esta acción no se puede deshacer.`}
        confirmText="Eliminar vehículo"
        loading={eliminando}
        details={
          vehiculoAEliminar
            ? [
                { label: "Cliente", value: clienteNombre },
                { label: "Placa", value: vehiculoAEliminar.placa },
                { label: "Marca", value: vehiculoAEliminar.marca },
                { label: "Modelo", value: vehiculoAEliminar.modelo },
                { label: "Año", value: vehiculoAEliminar.anio },
                { label: "Color", value: vehiculoAEliminar.color },
                {
                  label: "Tipo",
                  value: TIPOS_VEHICULO.find((item) => item.value === vehiculoAEliminar.tipo)?.label,
                },
              ]
            : []
        }
        onClose={() => setVehiculoAEliminar(null)}
        onConfirm={async () => {
          if (!vehiculoAEliminar) {
            return;
          }
          setEliminando(true);
          try {
            await onEliminar(vehiculoAEliminar.id);
            setVehiculoAEliminar(null);
          } finally {
            setEliminando(false);
          }
        }}
      />
    </div>
    </Portal>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { ArrowRightLeft, Car, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Cliente, Vehiculo, VehiculoInput } from "@/modules/clientes/domain/entities";
import { TIPOS_COMBUSTIBLE, TIPOS_TRANSMISION, TIPOS_VEHICULO } from "@/modules/clientes/domain/entities";
import {
  actualizarVehiculo,
  crearVehiculo,
  eliminarVehiculo,
  listarClientes,
  listarVehiculosCliente,
  transferirVehiculos,
} from "@/modules/clientes/infrastructure/clientes-api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { listarTodasLasPaginas } from "@/shared/lib/listar-todas-las-paginas";
import { ApiError } from "@/shared/infrastructure/http/http-error";

const MIN_BUSQUEDA = 3;

interface VehiculosDialogProps {
  abierto: boolean;
  token: string;
  clienteId: number | null;
  clienteNombre: string;
  onClose: () => void;
  onCambio: () => Promise<void>;
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

function SelectorCliente({
  token,
  excluirId,
  value,
  onChange,
  placeholder = "Buscar cliente por nombre o cédula (mín. 3)",
}: {
  token: string;
  excluirId?: number | null;
  value: Cliente | null;
  onChange: (cliente: Cliente | null) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(value ? `${value.nombres} · ${value.identificacion ?? ""}` : "");
  const [opciones, setOpciones] = useState<Cliente[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (value) {
      setTexto(`${value.nombres} · ${value.identificacion ?? "Sin cédula"}`);
    }
  }, [value]);

  useEffect(() => {
    if (!abierto || value) {
      setOpciones([]);
      setCargando(false);
      return;
    }
    const termino = texto.trim();
    if (termino.length < MIN_BUSQUEDA) {
      setOpciones([]);
      setCargando(false);
      return;
    }
    let cancelado = false;
    const timer = setTimeout(async () => {
      setCargando(true);
      try {
        const hallados = await listarTodasLasPaginas((page, size) =>
          listarClientes(token, { page, size, search: termino }),
        );
        if (!cancelado) {
          setOpciones(hallados.filter((cliente) => cliente.id !== excluirId));
        }
      } catch {
        if (!cancelado) setOpciones([]);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, 250);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [abierto, excluirId, texto, token, value]);

  const pendienteMinimo = !value && texto.trim().length < MIN_BUSQUEDA;

  return (
    <div className="relative">
      <Input
        value={texto}
        placeholder={placeholder}
        onFocus={() => setAbierto(true)}
        onChange={(event) => {
          setTexto(event.target.value);
          onChange(null);
          setAbierto(true);
        }}
      />
      {abierto && !value && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-card shadow-elegant max-h-56 overflow-y-auto">
          {pendienteMinimo ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Escribe al menos {MIN_BUSQUEDA} caracteres</p>
          ) : cargando ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Buscando...</p>
          ) : opciones.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias</p>
          ) : (
            opciones.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10"
                onClick={() => {
                  onChange(cliente);
                  setTexto(`${cliente.nombres} · ${cliente.identificacion ?? "Sin cédula"}`);
                  setAbierto(false);
                }}
              >
                <span className="font-medium">{cliente.nombres}</span>
                <span className="block text-xs text-muted-foreground">{cliente.identificacion ?? "Sin cédula"}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function VehiculosDialog({
  abierto,
  token,
  clienteId,
  clienteNombre,
  onClose,
  onCambio,
}: VehiculosDialogProps) {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filtros, setFiltros] = useState({ placa: "", marca: "", modelo: "", anio: "" });
  const [debounced, setDebounced] = useState(filtros);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<Vehiculo | null>(null);
  const [vehiculoAEliminar, setVehiculoAEliminar] = useState<Vehiculo | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });
  const [seleccionados, setSeleccionados] = useState<Record<number, Vehiculo>>({});
  const [panelTransfer, setPanelTransfer] = useState(false);
  const [modoTransfer, setModoTransfer] = useState<"unico" | "por_vehiculo">("unico");
  const [destinoUnico, setDestinoUnico] = useState<Cliente | null>(null);
  const [destinos, setDestinos] = useState<Record<number, Cliente | null>>({});
  const [confirmandoTransfer, setConfirmandoTransfer] = useState(false);
  const [transferiendo, setTransferiendo] = useState(false);
  const form = useForm<FormVehiculo>({ defaultValues: vacio });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filtros), 350);
    return () => clearTimeout(timer);
  }, [filtros]);

  const cargar = useCallback(async () => {
    if (!token || !clienteId) {
      return;
    }
    setCargandoLista(true);
    try {
      const respuesta = await listarVehiculosCliente(token, clienteId, {
        page: page + 1,
        size: pageSize,
        placa: debounced.placa || undefined,
        marca: debounced.marca || undefined,
        modelo: debounced.modelo || undefined,
        anio: debounced.anio.length === 4 ? debounced.anio : undefined,
      });
      setVehiculos(respuesta.data);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los vehículos");
    } finally {
      setCargandoLista(false);
    }
  }, [clienteId, debounced, page, pageSize, token]);

  useEffect(() => {
    if (abierto) {
      setMostrarForm(false);
      setEditando(null);
      setError(null);
      setExito(null);
      setPanelTransfer(false);
      setSeleccion({ type: "include", ids: new Set() });
      setSeleccionados({});
      setDestinoUnico(null);
      setDestinos({});
      setFiltros({ placa: "", marca: "", modelo: "", anio: "" });
      setPage(0);
      form.reset(vacio);
    }
  }, [abierto, clienteId, form]);

  useEffect(() => {
    if (abierto && clienteId) {
      void cargar();
    }
  }, [abierto, cargar, clienteId]);

  useEffect(() => {
    setPage(0);
  }, [debounced]);

  const idsSeleccionados = useMemo(
    () => [...seleccion.ids].map((id) => Number(id)),
    [seleccion],
  );
  const vehiculosElegidos = idsSeleccionados.map((id) => seleccionados[id]).filter(Boolean);

  function abrirEdicion(vehiculo: Vehiculo) {
    setEditando(vehiculo);
    setPanelTransfer(false);
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
  }

  useEffect(() => {
    if (!mostrarForm) {
      return;
    }
    const timer = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const placa = formRef.current?.querySelector<HTMLInputElement>('input[name="placa"]');
      placa?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [mostrarForm, editando]);

  async function guardar(values: FormVehiculo) {
    if (!clienteId) {
      return;
    }
    setError(null);
    if (!values.placa.trim()) {
      setError("La placa es obligatoria");
      return;
    }
    setGuardando(true);
    try {
      const payload = aInput(values);
      if (editando) {
        await actualizarVehiculo(token, editando.id, payload);
        setExito("Vehículo actualizado");
      } else {
        await crearVehiculo(token, { ...payload, cliente_id: clienteId });
        setExito("Vehículo registrado");
      }
      setMostrarForm(false);
      setEditando(null);
      form.reset(vacio);
      await cargar();
      await onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el vehículo");
    } finally {
      setGuardando(false);
    }
  }

  function asignacionesPendientes() {
    if (modoTransfer === "unico") {
      if (!destinoUnico) {
        return [];
      }
      return vehiculosElegidos.map((vehiculo) => ({
        vehiculo,
        destino: destinoUnico,
      }));
    }
    return vehiculosElegidos
      .map((vehiculo) => ({ vehiculo, destino: destinos[vehiculo.id] ?? null }))
      .filter((item): item is { vehiculo: Vehiculo; destino: Cliente } => Boolean(item.destino));
  }

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "placa", headerName: "Placa", flex: 1, minWidth: 110 },
      { field: "marca", headerName: "Marca", flex: 1, minWidth: 110 },
      { field: "modelo", headerName: "Modelo", flex: 1, minWidth: 110 },
      { field: "anio", headerName: "Año", width: 90 },
      { field: "color", headerName: "Color", minWidth: 100 },
      {
        field: "acciones",
        headerName: "Acciones",
        width: 140,
        filterable: false,
        sortable: false,
        renderCell: (params) => {
          const vehiculo = params.row as Vehiculo;
          return (
            <div className="flex gap-0.5">
              <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicion(vehiculo)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Transferir"
                onClick={() => {
                  setSeleccion({ type: "include", ids: new Set([vehiculo.id]) });
                  setSeleccionados({ [vehiculo.id]: vehiculo });
                  setPanelTransfer(true);
                  setModoTransfer("unico");
                }}
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Eliminar" onClick={() => setVehiculoAEliminar(vehiculo)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  if (!abierto || !clienteId) {
    return null;
  }

  const pendientes = asignacionesPendientes();

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl bg-card shadow-elegant overflow-hidden flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b px-4 sm:px-6 py-4">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <Car className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">Vehículos de {clienteNombre}</span>
              </h2>
              <p className="text-sm text-muted-foreground">Busca, pagina y transfiere a otros clientes</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder="Placa"
                value={filtros.placa}
                onChange={(event) => setFiltros((prev) => ({ ...prev, placa: event.target.value }))}
              />
              <Input
                placeholder="Marca"
                value={filtros.marca}
                onChange={(event) => setFiltros((prev) => ({ ...prev, marca: event.target.value }))}
              />
              <Input
                placeholder="Modelo"
                value={filtros.modelo}
                onChange={(event) => setFiltros((prev) => ({ ...prev, modelo: event.target.value }))}
              />
              <Input
                placeholder="Año"
                type="number"
                value={filtros.anio}
                onChange={(event) => setFiltros((prev) => ({ ...prev, anio: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={idsSeleccionados.length === 0}
                onClick={() => {
                  setMostrarForm(false);
                  setPanelTransfer(true);
                  setModoTransfer(idsSeleccionados.length > 1 ? "unico" : "unico");
                }}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferir {idsSeleccionados.length || ""}
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setEditando(null);
                  setPanelTransfer(false);
                  form.reset(vacio);
                  setMostrarForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Registrar vehículo
              </Button>
            </div>

            {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">{exito}</div>}

            {mostrarForm && (
              <form
                ref={formRef}
                className="scroll-mt-3 rounded-xl border p-4 space-y-4 bg-background"
                onSubmit={form.handleSubmit(guardar)}
              >
                <p className="font-medium">{editando ? "Editar vehículo" : "Nuevo vehículo"}</p>
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
                  <Button type="submit" className="w-full sm:w-auto" disabled={guardando}>
                    {guardando ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            )}

            <MuiDataTable
              rows={vehiculos}
              columns={columns}
              loading={cargandoLista}
              page={page}
              pageSize={pageSize}
              rowCount={total}
              paginationMode="server"
              filterMode="client"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              checkboxSelection
              rowSelectionModel={seleccion}
              onRowSelectionModelChange={(model) => {
                setSeleccion(model);
                const ids = new Set([...model.ids].map(Number));
                setSeleccionados((prev) => {
                  const siguiente = { ...prev };
                  for (const vehiculo of vehiculos) {
                    if (ids.has(vehiculo.id)) {
                      siguiente[vehiculo.id] = vehiculo;
                    } else {
                      delete siguiente[vehiculo.id];
                    }
                  }
                  return siguiente;
                });
              }}
              showToolbar
              showAllOption={false}
              className="h-[min(46dvh,420px)] lg:h-[min(46dvh,420px)]"
              storageKey="mecanicos.vehiculos.cliente.columnas"
            />

            {panelTransfer && (
              <div className="rounded-xl border p-4 space-y-4 bg-background">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Transferir {vehiculosElegidos.length} vehículo(s)</p>
                  <Button variant="ghost" size="sm" onClick={() => setPanelTransfer(false)}>Cerrar</Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant={modoTransfer === "unico" ? "default" : "outline"}
                    className="w-full sm:w-auto"
                    onClick={() => setModoTransfer("unico")}
                  >
                    Todos al mismo cliente
                  </Button>
                  <Button
                    type="button"
                    variant={modoTransfer === "por_vehiculo" ? "default" : "outline"}
                    className="w-full sm:w-auto"
                    onClick={() => setModoTransfer("por_vehiculo")}
                  >
                    Un cliente por vehículo
                  </Button>
                </div>

                {modoTransfer === "unico" ? (
                  <div className="space-y-2">
                    <Label>Cliente destino</Label>
                    <SelectorCliente token={token} excluirId={clienteId} value={destinoUnico} onChange={setDestinoUnico} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehiculosElegidos.map((vehiculo) => (
                      <div key={vehiculo.id} className="grid gap-2 sm:grid-cols-[8rem_1fr] items-center">
                        <p className="font-semibold tracking-wide">{vehiculo.placa}</p>
                        <SelectorCliente
                          token={token}
                          excluirId={clienteId}
                          value={destinos[vehiculo.id] ?? null}
                          onChange={(cliente) => setDestinos((prev) => ({ ...prev, [vehiculo.id]: cliente }))}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button disabled={pendientes.length === 0} onClick={() => setConfirmandoTransfer(true)}>
                    Revisar transferencia
                  </Button>
                </div>
              </div>
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
              await eliminarVehiculo(token, vehiculoAEliminar.id);
              setVehiculoAEliminar(null);
              await cargar();
              await onCambio();
            } finally {
              setEliminando(false);
            }
          }}
        />

        <ConfirmDialog
          open={confirmandoTransfer}
          title="Confirmar transferencia"
          description="Los vehículos pasarán al cliente destino y desaparecerán de esta ficha."
          confirmText="Transferir ahora"
          variant="default"
          loading={transferiendo}
          details={pendientes.map((item) => ({
            label: item.vehiculo.placa,
            value: `${clienteNombre} → ${item.destino.nombres}`,
          }))}
          onClose={() => setConfirmandoTransfer(false)}
          onConfirm={async () => {
            setTransferiendo(true);
            setError(null);
            try {
              await transferirVehiculos(
                token,
                pendientes.map((item) => ({
                  vehiculo_id: item.vehiculo.id,
                  cliente_destino_id: item.destino.id,
                })),
              );
              setConfirmandoTransfer(false);
              setPanelTransfer(false);
              setSeleccion({ type: "include", ids: new Set() });
              setSeleccionados({});
              setDestinoUnico(null);
              setDestinos({});
              setExito("Transferencia realizada");
              await cargar();
              await onCambio();
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo transferir");
              setConfirmandoTransfer(false);
            } finally {
              setTransferiendo(false);
            }
          }}
        />
      </div>
    </Portal>
  );
}

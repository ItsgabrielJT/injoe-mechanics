"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { Car, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import type { Cliente, ClienteInput } from "@/modules/clientes/domain/entities";
import {
  actualizarCliente,
  crearCliente,
  eliminarCliente,
  listarClientes,
} from "@/modules/clientes/infrastructure/clientes-api";
import { ClienteFormDrawer, type ClienteFormValues } from "@/modules/clientes/presentation/forms/cliente-form-drawer";
import { VehiculosDialog } from "@/modules/clientes/presentation/modals/vehiculos-dialog";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { MuiDataTable } from "@/shared/components/MuiDataTable";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ApiError } from "@/shared/infrastructure/http/http-error";

function aInput(values: ClienteFormValues): ClienteInput {
  return {
    identificacion: values.identificacion.trim() || null,
    nombres: values.nombres,
    correos: values.correos.map((item) => item.value).filter((valor) => valor.trim()),
    tipo_cliente: values.tipo_cliente,
    razon_social: values.razon_social || null,
    fecha_nacimiento: values.fecha_nacimiento || null,
    provincia: values.provincia || null,
    canton: values.canton || null,
    parroquia: values.parroquia || null,
    direcciones: values.direcciones.map((item) => item.value).filter((valor) => valor.trim()),
    telefonos: values.telefonos.map((item) => item.value).filter((valor) => valor.trim()),
    indice_correo_principal: values.indice_correo_principal,
    indice_telefono_principal: values.indice_telefono_principal,
    indice_direccion_principal: values.indice_direccion_principal,
    direccion_fiscal: values.direccion_fiscal || null,
    telefono_fiscal: values.telefono_fiscal || null,
    correo_fiscal: values.correo_fiscal || null,
    notas: values.notas || null,
    activo: values.activo,
  };
}

export function ClientesPage() {
  const { sesion, puntoActivo } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [clienteEdicion, setClienteEdicion] = useState<Cliente | null>(null);
  const [vehiculosAbierto, setVehiculosAbierto] = useState(false);
  const [clienteVehiculos, setClienteVehiculos] = useState<Cliente | null>(null);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const cargar = useCallback(async () => {
    if (!token) {
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarClientes(token, {
        page: page + 1,
        size: pageSize,
        search: debounced || undefined,
      });
      setClientes(respuesta.data);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los clientes");
    } finally {
      setCargando(false);
    }
  }, [debounced, page, pageSize, token]);

  useEffect(() => {
    void cargar();
  }, [cargar, puntoActivo?.id]);

  useEffect(() => {
    setPage(0);
  }, [debounced]);

  async function guardarCliente(values: ClienteFormValues) {
    setGuardando(true);
    setError(null);
    try {
      const body = aInput(values);
      if (clienteEdicion) {
        await actualizarCliente(token, clienteEdicion.id, body);
        setExito("Cliente actualizado");
      } else {
        await crearCliente(token, body);
        setExito("Cliente registrado");
      }
      setDrawerAbierto(false);
      setClienteEdicion(null);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el cliente");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminarCliente() {
    if (!clienteAEliminar) {
      return;
    }
    setEliminando(true);
    setError(null);
    try {
      await eliminarCliente(token, clienteAEliminar.id);
      setExito("Cliente eliminado");
      setClienteAEliminar(null);
      if (clienteVehiculos?.id === clienteAEliminar.id) {
        setVehiculosAbierto(false);
      }
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el cliente");
    } finally {
      setEliminando(false);
    }
  }

  async function abrirVehiculos(cliente: Cliente) {
    setClienteVehiculos(cliente);
    setVehiculosAbierto(true);
  }

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "identificacion", headerName: "Cédula / RUC", flex: 1, minWidth: 120, valueGetter: (_v, row) => row.identificacion || "Pendiente" },
      { field: "nombres", headerName: "Nombres", flex: 1.4, minWidth: 150 },
      { field: "correoPrincipal", headerName: "Correo", flex: 1.2, minWidth: 160 },
      { field: "telefonos", headerName: "Teléfono", flex: 1, minWidth: 120, valueGetter: (_value, row) => row.telefonos?.[0] ?? "" },
      {
        field: "tipoCliente",
        headerName: "Tipo",
        minWidth: 120,
        valueGetter: (value) => (value === "PERSONA_JURIDICA" ? "Jurídica" : "Natural"),
      },
      {
        field: "vehiculos",
        headerName: "Vehículos",
        minWidth: 150,
        filterable: false,
        sortable: false,
        renderCell: (params) => {
          const cliente = params.row as Cliente;
          return (
            <button
              type="button"
              onClick={() => void abrirVehiculos(cliente)}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary hover:bg-primary/20"
            >
              <Car className="h-4 w-4" />
              {cliente.totalVehiculos} {cliente.placas.slice(0, 2).join(", ")}
            </button>
          );
        },
      },
      {
        field: "activo",
        headerName: "Estado",
        minWidth: 110,
        valueGetter: (value) => (value ? "Activo" : "Inactivo"),
      },
      {
        field: "acciones",
        headerName: "Acciones",
        minWidth: 132,
        filterable: false,
        sortable: false,
        renderCell: (params) => {
          const cliente = params.row as Cliente;
          return (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => { setClienteEdicion(cliente); setDrawerAbierto(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void abrirVehiculos(cliente)}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setClienteAEliminar(cliente)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        },
      },
    ],
    [token],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4 sm:space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
            Clientes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona fichas, contactos múltiples y vehículos del punto activo
          </p>
        </div>
        <Button
          className="w-full sm:w-auto shrink-0"
          onClick={() => {
            setClienteEdicion(null);
            setDrawerAbierto(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cliente
        </Button>
      </div>

      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombres, correo o cédula"
          className="pl-10 w-full"
        />
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{exito}</div>}

      <MuiDataTable
        rows={clientes}
        columns={columns}
        loading={cargando}
        page={page}
        pageSize={pageSize}
        rowCount={total}
        paginationMode="server"
        filterMode="client"
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        storageKey="mecanicos.clientes.columnas"
        showToolbar
        mobileHiddenFields={["correoPrincipal", "telefonos", "tipoCliente", "activo"]}
      />

      <ClienteFormDrawer
        abierto={drawerAbierto}
        cliente={clienteEdicion}
        cargando={guardando}
        onClose={() => setDrawerAbierto(false)}
        onSubmit={guardarCliente}
      />

      <VehiculosDialog
        abierto={vehiculosAbierto}
        token={token}
        clienteId={clienteVehiculos?.id ?? null}
        clienteNombre={clienteVehiculos?.nombres ?? ""}
        onClose={() => setVehiculosAbierto(false)}
        onCambio={async () => {
          await cargar();
        }}
      />

      <ConfirmDialog
        open={Boolean(clienteAEliminar)}
        title="Eliminar cliente"
        description="Esta acción no se puede deshacer. También se eliminarán los vehículos asociados."
        confirmText="Eliminar cliente"
        loading={eliminando}
        details={
          clienteAEliminar
            ? [
                { label: "Nombres", value: clienteAEliminar.nombres },
                { label: "Cédula / RUC", value: clienteAEliminar.identificacion },
                { label: "Correo", value: clienteAEliminar.correoPrincipal },
                { label: "Teléfono", value: clienteAEliminar.telefonos[0] },
                {
                  label: "Tipo",
                  value: clienteAEliminar.tipoCliente === "PERSONA_JURIDICA" ? "Persona jurídica" : "Persona natural",
                },
                {
                  label: "Vehículos",
                  value:
                    clienteAEliminar.totalVehiculos > 0
                      ? `${clienteAEliminar.totalVehiculos} (${clienteAEliminar.placas.join(", ")})`
                      : "Ninguno",
                },
              ]
            : []
        }
        onClose={() => setClienteAEliminar(null)}
        onConfirm={confirmarEliminarCliente}
      />
    </div>
  );
}

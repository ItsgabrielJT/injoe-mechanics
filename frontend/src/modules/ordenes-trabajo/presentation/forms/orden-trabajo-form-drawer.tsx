"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Car, ChevronDown, Package, Plus, Trash2, Wrench, X } from "lucide-react";
import type { Cliente, Vehiculo } from "@/modules/clientes/domain/entities";
import { altaRapidaClienteVehiculo, listarClientes, listarVehiculos } from "@/modules/clientes/infrastructure/clientes-api";
import {
  TIPOS_IMPUESTO,
  formatoPrecio,
  precioVentaFinal,
  type Bodega,
  type CategoriaProducto,
  type Existencia,
  type Producto,
  type TipoImpuesto,
} from "@/modules/inventario/domain/entities";
import { crearCategoria, crearProducto, listarExistencias, listarProductos } from "@/modules/inventario/infrastructure/inventario-api";
import { BuscadorSelect, type OpcionBuscador } from "@/modules/inventario/presentation/components/buscador-select";
import type { PrecioProveedor, Proveedor } from "@/modules/proveedores/domain/entities";
import { listarPreciosProducto, listarPreciosServicio, listarProveedores } from "@/modules/proveedores/infrastructure/proveedores-api";
import type { Servicio } from "@/modules/servicios/domain/entities";
import { crearServicio, listarServicios } from "@/modules/servicios/infrastructure/servicios-api";
import { listarTodasLasPaginas } from "@/modules/ordenes-trabajo/presentation/forms/listar-todas-las-paginas";
import {
  ahoraEcuadorIso,
  type ItemOrdenInput,
  type OrdenInput,
  type OrdenTrabajo,
  type Tecnico,
} from "@/modules/ordenes-trabajo/domain/entities";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ApiError } from "@/shared/infrastructure/http/http-error";
import { cn } from "@/shared/lib/utils";

interface LineaDraft {
  key: string;
  tipo: "producto" | "servicio";
  productoId: number | null;
  servicioId: number | null;
  proveedorId: number | null;
  proveedorNombre: string | null;
  bodegaId: number | null;
  descripcion: string;
  codigo: string | null;
  cantidad: string;
  precioBase: string;
  incluyeIva: boolean;
  precioCompra: string;
  aplicaIva: boolean;
  tipoImpuesto: TipoImpuesto;
  aplicaInventario: boolean;
}

interface Props {
  abierto: boolean;
  cargando?: boolean;
  token: string;
  orden?: OrdenTrabajo | null;
  tecnicos: Tecnico[];
  bodegas: Bodega[];
  categorias: CategoriaProducto[];
  onCatalogoChange: () => Promise<void>;
  onClose: () => void;
  onSubmit: (body: OrdenInput) => Promise<void>;
}

function nuevaKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function primeraBodegaId(bodegas: Bodega[]): number | null {
  const primera = [...bodegas].sort((a, b) => a.id - b.id)[0];
  return primera?.id ?? null;
}

function lineaVacia(tipo: "producto" | "servicio", bodegaId: number | null = null): LineaDraft {
  return {
    key: nuevaKey(),
    tipo,
    productoId: null,
    servicioId: null,
    proveedorId: null,
    proveedorNombre: null,
    bodegaId: tipo === "producto" ? bodegaId : null,
    descripcion: "",
    codigo: null,
    cantidad: "1",
    precioBase: "",
    incluyeIva: true,
    precioCompra: "",
    aplicaIva: true,
    tipoImpuesto: "15",
    aplicaInventario: tipo === "producto",
  };
}

function totalesLinea(linea: LineaDraft) {
  const ventaUnit = precioVentaFinal(numero(linea.precioBase), linea.incluyeIva, linea.tipoImpuesto, linea.aplicaIva);
  const venta = ventaUnit * numero(linea.cantidad);
  const costo = numero(linea.precioCompra) * numero(linea.cantidad);
  return { ventaUnit, venta, costo, utilidad: venta - costo };
}

function isoALocal(iso?: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

function localAIso(valor: string): string | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

function codigoProducto() {
  return `PRD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function numero(valor: string | number | null | undefined): number {
  if (valor === "" || valor == null) return 0;
  const parsed = Number(valor);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function textoNumero(valor: number | string | null | undefined): string {
  if (valor === "" || valor == null) return "";
  const parsed = Number(valor);
  if (Number.isNaN(parsed) || parsed === 0) return "";
  return String(valor);
}

function clavePrecios(tipo: "producto" | "servicio", id: number): string {
  return `${tipo}:${id}`;
}

const MIN_BUSQUEDA = 3;

function costoRegistrado(precios: PrecioProveedor[], proveedorId: number | null): string {
  if (!proveedorId) return "";
  const hallado = precios.find((item) => item.proveedorId === proveedorId);
  return hallado ? textoNumero(hallado.precioCompra) : "";
}

function InputImporte({
  value,
  onChange,
  placeholder = "0.00",
  className,
}: {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={(event) => {
        const siguiente = event.target.value.replace(",", ".").replace(/[^0-9.]/g, "");
        const partes = siguiente.split(".");
        const normalizado = partes.length > 2 ? `${partes[0]}.${partes.slice(1).join("")}` : siguiente;
        onChange(normalizado);
      }}
    />
  );
}

export function OrdenTrabajoFormDrawer({
  abierto,
  cargando,
  token,
  orden,
  tecnicos,
  bodegas,
  categorias,
  onCatalogoChange,
  onClose,
  onSubmit,
}: Props) {
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [vehiculoId, setVehiculoId] = useState<number | null>(null);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [vehiculoSel, setVehiculoSel] = useState<Vehiculo | null>(null);
  const [tecnicoId, setTecnicoId] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [notasGenerales, setNotasGenerales] = useState("");
  const [notasTecnicas, setNotasTecnicas] = useState("");
  const [lineas, setLineas] = useState<LineaDraft[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Vehiculo[]>([]);
  const [clientesHallados, setClientesHallados] = useState<Cliente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [altaNombre, setAltaNombre] = useState("");
  const [altaPlaca, setAltaPlaca] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existencias, setExistencias] = useState<Record<number, Existencia[]>>({});
  const [altaProducto, setAltaProducto] = useState(false);
  const [altaServicio, setAltaServicio] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", precio: "", aplicaIva: true, tipo: "15" as TipoImpuesto, aplicaInventario: true });
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: "", precio: "", aplicaIva: true, tipo: "15" as TipoImpuesto });
  const [creando, setCreando] = useState(false);
  const [lineaActiva, setLineaActiva] = useState<string | null>(null);
  const [resetBuscador, setResetBuscador] = useState(0);
  const ultimoTextoBusqueda = useRef("");
  const [preciosPorClave, setPreciosPorClave] = useState<Record<string, PrecioProveedor[]>>({});
  const preciosRef = useRef<Record<string, PrecioProveedor[]>>({});
  const productosCache = useRef<Map<number, Producto>>(new Map());
  const serviciosCache = useRef<Map<number, Servicio>>(new Map());
  const proveedoresCache = useRef<Map<number, Proveedor>>(new Map());

  const ordenId = orden?.id ?? null;

  useEffect(() => {
    if (!abierto) return;
    productosCache.current.clear();
    serviciosCache.current.clear();
    proveedoresCache.current.clear();
    setError(null);
    setBusqueda("");
    setResultados([]);
    setClientesHallados([]);
    setAltaNombre("");
    setAltaPlaca("");
    setAltaProducto(false);
    setAltaServicio(false);
    setLineaActiva(null);
    setPreciosPorClave({});
    preciosRef.current = {};
    if (orden) {
      setClienteId(orden.clienteId);
      setVehiculoId(orden.vehiculoId);
      setClienteSel({
        id: orden.clienteId,
        empresaId: 0,
        puntoEmisionId: 0,
        identificacion: orden.clienteIdentificacion,
        tipoCliente: "PERSONA_NATURAL",
        nombres: orden.clienteNombres ?? "",
        razonSocial: null,
        fechaNacimiento: null,
        provincia: null,
        canton: null,
        parroquia: null,
        direcciones: [],
        telefonos: [],
        correos: [],
        indiceDireccionPrincipal: null,
        indiceTelefonoPrincipal: null,
        indiceCorreoPrincipal: null,
        direccionFiscal: null,
        telefonoFiscal: null,
        correoFiscal: null,
        notas: null,
        activo: true,
        totalVehiculos: 1,
        placas: [orden.vehiculoPlaca ?? ""],
        correoPrincipal: null,
      });
      setVehiculoSel({
        id: orden.vehiculoId,
        empresaId: 0,
        puntoEmisionId: 0,
        clienteId: orden.clienteId,
        placa: orden.vehiculoPlaca ?? "",
        marca: orden.vehiculoMarca,
        modelo: orden.vehiculoModelo,
        anio: null,
        tipo: null,
        color: null,
        combustible: null,
        cilindrada: null,
        transmision: null,
        notas: null,
        activo: true,
        clienteNombres: orden.clienteNombres,
        clienteIdentificacion: orden.clienteIdentificacion,
      });
      setTecnicoId(orden.tecnicoId);
      setFechaInicio(isoALocal(orden.fechaInicio));
      setFechaEntrega(isoALocal(orden.fechaEntrega));
      setKilometraje(orden.kilometraje != null ? String(orden.kilometraje) : "");
      setNotasGenerales(orden.notasGenerales ?? "");
      setNotasTecnicas(orden.notasTecnicas ?? "");
      const cargadas = orden.items.map((item) => ({
        key: nuevaKey(),
        tipo: (item.productoId ? "producto" : "servicio") as LineaDraft["tipo"],
        productoId: item.productoId,
        servicioId: item.servicioId,
        proveedorId: item.proveedorId,
        proveedorNombre: item.proveedorNombres,
        bodegaId: item.bodegaId,
        descripcion: item.descripcion,
        codigo: item.codigo,
        cantidad: textoNumero(item.cantidad) || "1",
        precioBase: textoNumero(item.precioVenta),
        incluyeIva: true,
        precioCompra: textoNumero(item.precioCompra),
        aplicaIva: item.aplicaIva,
        tipoImpuesto: item.tipoImpuesto,
        aplicaInventario: Boolean(item.productoId),
      }));
      setLineas(cargadas);
      setLineaActiva(cargadas[0]?.key ?? null);
    } else {
      setClienteId(null);
      setVehiculoId(null);
      setClienteSel(null);
      setVehiculoSel(null);
      setTecnicoId(tecnicos[0]?.id ?? null);
      setFechaInicio(isoALocal(ahoraEcuadorIso()));
      setFechaEntrega("");
      setKilometraje("");
      setNotasGenerales("");
      setNotasTecnicas("");
      setLineas([]);
    }
  }, [abierto, ordenId]);

  useEffect(() => {
    if (abierto && !tecnicoId && tecnicos[0]) {
      setTecnicoId(tecnicos[0].id);
    }
    if (abierto && !fechaInicio) {
      setFechaInicio(isoALocal(ahoraEcuadorIso()));
    }
  }, [abierto, fechaInicio, tecnicoId, tecnicos]);

  useEffect(() => {
    if (!abierto) return;
    const termino = busqueda.trim();
    if (termino.length < MIN_BUSQUEDA) {
      setResultados([]);
      setClientesHallados([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const [vehiculos, clientes] = await Promise.all([
          listarTodasLasPaginas((page, size) => listarVehiculos(token, { page, size, search: termino })),
          listarTodasLasPaginas((page, size) => listarClientes(token, { page, size, search: termino })),
        ]);
        setResultados(vehiculos);
        if (vehiculos.length === 1) {
          seleccionarVehiculo(vehiculos[0]);
          setClientesHallados([]);
        } else if (vehiculos.length === 0) {
          setClientesHallados(clientes);
        } else {
          setClientesHallados([]);
        }
      } catch {
        setResultados([]);
        setClientesHallados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [abierto, busqueda, token]);

  function seleccionarVehiculo(vehiculo: Vehiculo) {
    setVehiculoSel(vehiculo);
    setVehiculoId(vehiculo.id);
    setClienteId(vehiculo.clienteId);
    setClienteSel({
      id: vehiculo.clienteId,
      empresaId: vehiculo.empresaId,
      puntoEmisionId: vehiculo.puntoEmisionId,
      identificacion: vehiculo.clienteIdentificacion ?? null,
      tipoCliente: "PERSONA_NATURAL",
      nombres: vehiculo.clienteNombres ?? "",
      razonSocial: null,
      fechaNacimiento: null,
      provincia: null,
      canton: null,
      parroquia: null,
      direcciones: [],
      telefonos: [],
      correos: [],
      indiceDireccionPrincipal: null,
      indiceTelefonoPrincipal: null,
      indiceCorreoPrincipal: null,
      direccionFiscal: null,
      telefonoFiscal: null,
      correoFiscal: null,
      notas: null,
      activo: true,
      totalVehiculos: 1,
      placas: [vehiculo.placa],
      correoPrincipal: null,
    });
    setBusqueda("");
    setResultados([]);
    setClientesHallados([]);
  }

  function seleccionarCliente(cliente: Cliente) {
    setClienteSel(cliente);
    setClienteId(cliente.id);
    setVehiculoSel(null);
    setVehiculoId(null);
    setAltaNombre(cliente.nombres);
    setBusqueda("");
    setResultados([]);
    setClientesHallados([]);
  }

  async function crearAltaRapida() {
    setError(null);
    setCreando(true);
    try {
      const body = clienteId
        ? { cliente_id: clienteId, placa: altaPlaca.trim().toUpperCase() }
        : { nombres: altaNombre.trim(), placa: altaPlaca.trim().toUpperCase() };
      const creado = await altaRapidaClienteVehiculo(token, body);
      seleccionarVehiculo({
        ...creado.vehiculo,
        clienteNombres: creado.cliente.nombres,
        clienteIdentificacion: creado.cliente.identificacion,
      });
      setAltaNombre("");
      setAltaPlaca("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el cliente y el vehículo");
    } finally {
      setCreando(false);
    }
  }

  function actualizarLinea(key: string, cambios: Partial<LineaDraft>) {
    setLineas((actuales) => actuales.map((linea) => (linea.key === key ? { ...linea, ...cambios } : linea)));
  }

  function guardarPrecios(clave: string, precios: PrecioProveedor[]) {
    preciosRef.current[clave] = precios;
    setPreciosPorClave({ ...preciosRef.current });
  }

  async function obtenerPrecios(tipo: "producto" | "servicio", id: number): Promise<PrecioProveedor[]> {
    const clave = clavePrecios(tipo, id);
    if (preciosRef.current[clave]) return preciosRef.current[clave];
    const precios = tipo === "producto" ? await listarPreciosProducto(token, id) : await listarPreciosServicio(token, id);
    guardarPrecios(clave, precios);
    return precios;
  }

  function aplicarCostoProveedor(linea: LineaDraft, precios: PrecioProveedor[], proveedorId: number | null) {
    const nombre = proveedorId
      ? proveedoresCache.current.get(proveedorId)?.nombres
        ?? precios.find((item) => item.proveedorId === proveedorId)?.proveedorNombres
        ?? null
      : null;
    actualizarLinea(linea.key, { proveedorId, proveedorNombre: nombre, precioCompra: costoRegistrado(precios, proveedorId) });
  }

  async function elegirProveedor(linea: LineaDraft, proveedorId: number | null) {
    const catalogoId = linea.tipo === "producto" ? linea.productoId : linea.servicioId;
    if (!catalogoId || !proveedorId) {
      actualizarLinea(linea.key, { proveedorId, proveedorNombre: null, precioCompra: proveedorId ? linea.precioCompra : "" });
      return;
    }
    const precios = await obtenerPrecios(linea.tipo, catalogoId);
    aplicarCostoProveedor(linea, precios, proveedorId);
  }

  async function elegirProducto(linea: LineaDraft, productoId: number | null) {
    if (!productoId) {
      actualizarLinea(linea.key, { productoId: null, descripcion: "", codigo: null, aplicaInventario: true, proveedorId: null, proveedorNombre: null, precioCompra: "" });
      return;
    }
    const producto = productosCache.current.get(productoId);
    if (!producto) return;
    actualizarLinea(linea.key, {
      productoId,
      servicioId: null,
      descripcion: producto.nombre,
      codigo: producto.codigo,
      precioBase: textoNumero(producto.precioVenta),
      incluyeIva: true,
      aplicaIva: producto.aplicaIva,
      tipoImpuesto: producto.tipoImpuesto,
      aplicaInventario: producto.aplicaInventario,
      bodegaId: producto.aplicaInventario ? linea.bodegaId ?? primeraBodegaId(bodegas) : null,
      proveedorId: null,
      proveedorNombre: null,
      precioCompra: "",
    });
    if (producto.aplicaInventario && !existencias[producto.id]) {
      const stock = await listarExistencias(token, producto.id);
      setExistencias((actual) => ({ ...actual, [producto.id]: stock }));
    }
    const precios = await obtenerPrecios("producto", producto.id);
    const principal = precios.find((item) => item.esPrincipal) ?? precios[0];
    if (principal) {
      aplicarCostoProveedor({ ...linea, productoId, tipo: "producto" }, precios, principal.proveedorId);
    }
  }

  async function elegirServicio(linea: LineaDraft, servicioId: number | null) {
    if (!servicioId) {
      actualizarLinea(linea.key, { servicioId: null, descripcion: "", codigo: null, proveedorId: null, proveedorNombre: null, precioCompra: "" });
      return;
    }
    const servicio = serviciosCache.current.get(servicioId);
    if (!servicio) return;
    actualizarLinea(linea.key, {
      servicioId,
      productoId: null,
      descripcion: servicio.nombre,
      codigo: servicio.codigo,
      precioBase: textoNumero(servicio.precioVenta),
      incluyeIva: true,
      aplicaIva: servicio.aplicaIva,
      tipoImpuesto: servicio.tipoImpuesto,
      aplicaInventario: false,
      bodegaId: null,
      proveedorId: null,
      proveedorNombre: null,
      precioCompra: "",
    });
    const precios = await obtenerPrecios("servicio", servicio.id);
    const principal = precios.find((item) => item.esPrincipal) ?? precios[0];
    if (principal) {
      aplicarCostoProveedor({ ...linea, servicioId, tipo: "servicio" }, precios, principal.proveedorId);
    }
  }

  async function buscarProductos(texto: string): Promise<OpcionBuscador[]> {
    const termino = texto.trim();
    if (termino.length < MIN_BUSQUEDA) return [];
    const hallados = await listarTodasLasPaginas((page, size) =>
      listarProductos(token, { page, size, search: termino, activo: true }),
    );
    hallados.forEach((item) => productosCache.current.set(item.id, item));
    return hallados.map((item) => ({
      id: item.id,
      label: `${item.codigo} · ${item.nombre}`,
      extra: formatoPrecio(item.precioVenta),
    }));
  }

  async function buscarServicios(texto: string): Promise<OpcionBuscador[]> {
    const termino = texto.trim();
    if (termino.length < MIN_BUSQUEDA) return [];
    const hallados = await listarTodasLasPaginas((page, size) =>
      listarServicios(token, { page, size, search: termino, activo: true }),
    );
    hallados.forEach((item) => serviciosCache.current.set(item.id, item));
    return hallados.map((item) => ({
      id: item.id,
      label: `${item.codigo} · ${item.nombre}`,
      extra: formatoPrecio(item.precioVenta),
    }));
  }

  async function buscarProveedores(linea: LineaDraft, texto: string): Promise<OpcionBuscador[]> {
    const termino = texto.trim();
    if (termino.length < MIN_BUSQUEDA) return [];
    const hallados = await listarTodasLasPaginas((page, size) =>
      listarProveedores(token, { page, size, search: termino, activo: true }),
    );
    hallados.forEach((item) => proveedoresCache.current.set(item.id, item));
    const precios = preciosDeLinea(linea);
    return hallados.map((item) => {
      const costo = precios.find((precio) => precio.proveedorId === item.id);
      return {
        id: item.id,
        label: item.nombres,
        extra: [item.identificacion, costo ? `Costo ${formatoPrecio(costo.precioCompra)}` : null].filter(Boolean).join(" · "),
      };
    });
  }

  useEffect(() => {
    if (!abierto) return;
    const pendientes = lineas
      .map((linea) => {
        const id = linea.tipo === "producto" ? linea.productoId : linea.servicioId;
        if (!id) return null;
        const clave = clavePrecios(linea.tipo, id);
        if (preciosRef.current[clave]) return null;
        return { tipo: linea.tipo, id, clave };
      })
      .filter((item): item is { tipo: LineaDraft["tipo"]; id: number; clave: string } => Boolean(item));
    if (pendientes.length === 0) return;
    let cancelado = false;
    void Promise.all(
      pendientes.map(async (item) => {
        const precios = item.tipo === "producto"
          ? await listarPreciosProducto(token, item.id)
          : await listarPreciosServicio(token, item.id);
        if (!cancelado) guardarPrecios(item.clave, precios);
      }),
    );
    return () => {
      cancelado = true;
    };
  }, [abierto, lineas, token]);

  useEffect(() => {
    if (!abierto) return;
    const pendientes = lineas.filter((linea) => linea.productoId && linea.aplicaInventario && !existencias[linea.productoId]);
    if (pendientes.length === 0) return;
    let cancelado = false;
    void Promise.all(
      pendientes.map(async (linea) => {
        const productoId = linea.productoId;
        if (!productoId) return;
        const stock = await listarExistencias(token, productoId);
        if (!cancelado) {
          setExistencias((actual) => ({ ...actual, [productoId]: stock }));
        }
      }),
    );
    return () => {
      cancelado = true;
    };
  }, [abierto, existencias, lineas, token]);

  function agregarLinea(tipo: "producto" | "servicio") {
    const linea = lineaVacia(tipo, tipo === "producto" ? primeraBodegaId(bodegas) : null);
    setLineas((actual) => [linea, ...actual]);
    setLineaActiva(linea.key);
  }

  function recordarTextoBusqueda(texto: string) {
    const limpio = texto.trim();
    if (limpio) ultimoTextoBusqueda.current = limpio;
  }

  function abrirAltaProducto() {
    const nombre = ultimoTextoBusqueda.current;
    setAltaServicio(false);
    setAltaProducto(true);
    if (nombre) setNuevoProducto((actual) => ({ ...actual, nombre }));
    setResetBuscador((actual) => actual + 1);
    ultimoTextoBusqueda.current = "";
  }

  function abrirAltaServicio() {
    const nombre = ultimoTextoBusqueda.current;
    setAltaProducto(false);
    setAltaServicio(true);
    if (nombre) setNuevoServicio((actual) => ({ ...actual, nombre }));
    setResetBuscador((actual) => actual + 1);
    ultimoTextoBusqueda.current = "";
  }

  function cerrarAltaProducto() {
    setAltaProducto(false);
    setNuevoProducto({ nombre: "", precio: "", aplicaIva: true, tipo: "15", aplicaInventario: true });
  }

  function cerrarAltaServicio() {
    setAltaServicio(false);
    setNuevoServicio({ nombre: "", precio: "", aplicaIva: true, tipo: "15" });
  }

  async function asegurarCategoriaGeneral(): Promise<number> {
    const existente = categorias.find((item) => item.nombre.toLowerCase() === "general");
    if (existente) return existente.id;
    const creada = await crearCategoria(token, { nombre: "General", descripcion: "Categoría automática" });
    await onCatalogoChange();
    return creada.id;
  }

  async function crearProductoRapido() {
    if (nuevoProducto.nombre.trim().length < 2 || Number(nuevoProducto.precio) <= 0) {
      setError("El producto necesita nombre y precio");
      return;
    }
    setCreando(true);
    setError(null);
    try {
      const categoriaId = await asegurarCategoriaGeneral();
      const precio = precioVentaFinal(Number(nuevoProducto.precio), true, nuevoProducto.tipo, nuevoProducto.aplicaIva);
      const producto = await crearProducto(token, {
        codigo: codigoProducto(),
        nombre: nuevoProducto.nombre.trim(),
        categoria_id: categoriaId,
        precio_venta: precio,
        tipo_impuesto: nuevoProducto.tipo,
        aplica_iva: nuevoProducto.aplicaIva,
        aplica_inventario: nuevoProducto.aplicaInventario,
      });
      productosCache.current.set(producto.id, producto);
      const linea = {
        ...lineaVacia("producto", producto.aplicaInventario ? primeraBodegaId(bodegas) : null),
        productoId: producto.id,
        descripcion: producto.nombre,
        codigo: producto.codigo,
        precioBase: textoNumero(producto.precioVenta),
        aplicaIva: producto.aplicaIva,
        tipoImpuesto: producto.tipoImpuesto,
        aplicaInventario: producto.aplicaInventario,
        bodegaId: producto.aplicaInventario ? primeraBodegaId(bodegas) : null,
      };
      setLineas((actuales) => [linea, ...actuales]);
      setLineaActiva(linea.key);
      cerrarAltaProducto();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el producto");
    } finally {
      setCreando(false);
    }
  }

  async function crearServicioRapido() {
    if (nuevoServicio.nombre.trim().length < 2 || Number(nuevoServicio.precio) <= 0) {
      setError("El servicio necesita nombre y precio");
      return;
    }
    setCreando(true);
    setError(null);
    try {
      const precio = precioVentaFinal(Number(nuevoServicio.precio), true, nuevoServicio.tipo, nuevoServicio.aplicaIva);
      const servicio = await crearServicio(token, {
        nombre: nuevoServicio.nombre.trim(),
        precio_venta: precio,
        tipo_impuesto: nuevoServicio.tipo,
        aplica_iva: nuevoServicio.aplicaIva,
        categoria: "mantenimiento",
      });
      serviciosCache.current.set(servicio.id, servicio);
      const linea = {
        ...lineaVacia("servicio"),
        servicioId: servicio.id,
        descripcion: servicio.nombre,
        codigo: servicio.codigo,
        precioBase: textoNumero(servicio.precioVenta),
        aplicaIva: servicio.aplicaIva,
        tipoImpuesto: servicio.tipoImpuesto,
        aplicaInventario: false,
      };
      setLineas((actuales) => [linea, ...actuales]);
      setLineaActiva(linea.key);
      cerrarAltaServicio();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el servicio");
    } finally {
      setCreando(false);
    }
  }

  function preciosDeLinea(linea: LineaDraft): PrecioProveedor[] {
    const id = linea.tipo === "producto" ? linea.productoId : linea.servicioId;
    if (!id) return [];
    return preciosPorClave[clavePrecios(linea.tipo, id)] ?? [];
  }

  function notaCostoLinea(linea: LineaDraft): string | null {
    if (!linea.proveedorId) return null;
    const id = linea.tipo === "producto" ? linea.productoId : linea.servicioId;
    if (!id) return null;
    const registrado = preciosDeLinea(linea).some((item) => item.proveedorId === linea.proveedorId);
    if (registrado) return "Costo registrado de este proveedor";
    return "Al guardar la orden, este costo se registrará en Proveedores";
  }

  const resumen = useMemo(() => {
    return lineas.reduce(
      (acc, linea) => {
        const totales = totalesLinea(linea);
        acc.venta += totales.venta;
        acc.costo += totales.costo;
        acc.utilidad += totales.utilidad;
        return acc;
      },
      { venta: 0, costo: 0, utilidad: 0 },
    );
  }, [lineas]);

  async function enviar() {
    setError(null);
    if (!clienteId || !vehiculoId) {
      setError("Selecciona o crea un cliente y un vehículo");
      return;
    }
    if (!tecnicoId) {
      setError("Selecciona un técnico");
      return;
    }
    if (lineas.length === 0) {
      setError("Agrega al menos un repuesto o servicio");
      return;
    }
    for (const linea of lineas) {
      if ((linea.tipo === "producto" && !linea.productoId) || (linea.tipo === "servicio" && !linea.servicioId)) {
        setError("Cada línea debe tener un producto o servicio");
        return;
      }
      if (numero(linea.cantidad) <= 0) {
        setError("La cantidad debe ser mayor a 0");
        return;
      }
    }
    const items: ItemOrdenInput[] = lineas.map((linea) => ({
      producto_id: linea.tipo === "producto" ? linea.productoId : null,
      servicio_id: linea.tipo === "servicio" ? linea.servicioId : null,
      proveedor_id: linea.proveedorId,
      bodega_id: linea.aplicaInventario ? linea.bodegaId : null,
      descripcion: linea.descripcion,
      codigo: linea.codigo,
      cantidad: numero(linea.cantidad),
      precio_venta: precioVentaFinal(numero(linea.precioBase), linea.incluyeIva, linea.tipoImpuesto, linea.aplicaIva),
      precio_compra: numero(linea.precioCompra),
      aplica_iva: linea.aplicaIva,
      tipo_impuesto: linea.tipoImpuesto,
    }));
    try {
      await onSubmit({
        cliente_id: clienteId,
        vehiculo_id: vehiculoId,
        tecnico_id: tecnicoId,
        fecha_inicio: localAIso(fechaInicio),
        fecha_entrega: localAIso(fechaEntrega),
        kilometraje: kilometraje === "" ? null : Number(kilometraje),
        notas_generales: notasGenerales.trim() || null,
        notas_tecnicas: notasTecnicas.trim() || null,
        items,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la orden");
    }
  }

  if (!abierto) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70]">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <aside className="absolute inset-y-0 right-0 w-full max-w-full sm:max-w-4xl bg-card shadow-elegant flex flex-col">
          <div className="shrink-0 border-b bg-card flex items-start justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold truncate">{orden ? `Editar ${orden.numero}` : "Nueva orden de trabajo"}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Busca placa o cliente. Si no existe, crea solo con nombre y placa.</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>

          {error && (
            <div className="shrink-0 mx-4 sm:mx-6 mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" className="shrink-0" onClick={() => setError(null)} aria-label="Cerrar error">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Cliente y vehículo</h3>
              {vehiculoSel && clienteSel ? (
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg border bg-muted/20 p-3 sm:p-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Car className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium break-words">{vehiculoSel.placa} · {clienteSel.nombres}</p>
                      <p className="text-sm text-muted-foreground">
                        {[vehiculoSel.marca, vehiculoSel.modelo].filter(Boolean).join(" ") || "Vehículo sin ficha completa"}
                        {clienteSel.identificacion ? ` · ${clienteSel.identificacion}` : " · Cédula pendiente"}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto shrink-0" onClick={() => { setVehiculoSel(null); setClienteSel(null); setClienteId(null); setVehiculoId(null); }}>Cambiar</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Buscar placa, marca, modelo, cliente o cédula</Label>
                    <Input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Mín. 3 caracteres: ABC-1234 o Juan Pérez" />
                    {busqueda.trim().length > 0 && busqueda.trim().length < MIN_BUSQUEDA && (
                      <p className="text-xs text-muted-foreground">Escribe al menos {MIN_BUSQUEDA} caracteres</p>
                    )}
                    {buscando && <p className="text-xs text-muted-foreground">Buscando...</p>}
                    {resultados.length > 1 && (
                      <ul className="max-h-56 overflow-y-auto rounded-md border bg-card divide-y">
                        {resultados.map((item) => (
                          <li key={item.id}>
                            <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10" onClick={() => seleccionarVehiculo(item)}>
                              <span className="font-medium">{item.placa}</span>
                              <span className="text-muted-foreground"> · {[item.marca, item.modelo].filter(Boolean).join(" ") || "Sin marca"} · {item.clienteNombres ?? "Cliente"}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {resultados.length === 0 && clientesHallados.length > 0 && (
                      <ul className="max-h-56 overflow-y-auto rounded-md border bg-card divide-y">
                        {clientesHallados.map((item) => (
                          <li key={item.id}>
                            <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10" onClick={() => seleccionarCliente(item)}>
                              <span className="font-medium">{item.nombres}</span>
                              <span className="text-muted-foreground"> · {item.identificacion || "Cédula pendiente"} · asociar nueva placa</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {clienteSel && !vehiculoSel && (
                    <p className="text-sm rounded-md border bg-muted/20 px-3 py-2">
                      Cliente seleccionado: <span className="font-medium">{clienteSel.nombres}</span>. Ingresa solo la placa.
                    </p>
                  )}
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-sm font-medium">Alta rápida para lanzar la orden</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Nombre del cliente</Label>
                        <Input value={altaNombre} onChange={(event) => setAltaNombre(event.target.value)} placeholder="Juan Pérez" disabled={Boolean(clienteId)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Placa</Label>
                        <Input value={altaPlaca} onChange={(event) => setAltaPlaca(event.target.value.toUpperCase())} placeholder="ABC-1234" />
                      </div>
                    </div>
                    <Button type="button" variant="outline" disabled={creando || !altaPlaca.trim() || (!clienteId && altaNombre.trim().length < 2)} onClick={() => void crearAltaRapida()}>
                      Crear y seleccionar
                    </Button>
                  </div>
                </>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Cabecera</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Técnico *</Label>
                  <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background" value={tecnicoId ?? ""} onChange={(event) => setTecnicoId(event.target.value ? Number(event.target.value) : null)}>
                    <option value="">Selecciona</option>
                    {tecnicos.map((item) => <option key={item.id} value={item.id}>{item.nombreCompleto}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Kilometraje</Label>
                  <InputImporte value={kilometraje} onChange={setKilometraje} placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de inicio</Label>
                  <Input type="datetime-local" value={fechaInicio} onChange={(event) => setFechaInicio(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de entrega</Label>
                  <Input type="datetime-local" value={fechaEntrega} onChange={(event) => setFechaEntrega(event.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nota</Label>
                  <p className="text-xs text-muted-foreground">Se imprime en Observaciones del reporte (junto a las vistas del vehículo).</p>
                  <textarea className="flex min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm" value={notasGenerales} onChange={(event) => setNotasGenerales(event.target.value)} placeholder="Golpes, accesorios o comentarios de recepción" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Descripción de la falla</Label>
                  <p className="text-xs text-muted-foreground">Se imprime en Descripción de la falla del reporte.</p>
                  <textarea className="flex min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm" value={notasTecnicas} onChange={(event) => setNotasTecnicas(event.target.value)} placeholder="Qué reporta el cliente o qué se va a revisar" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Repuestos y servicios</h3>
                  <p className="text-xs text-muted-foreground">{lineas.length === 0 ? "Sin ítems" : `${lineas.length} ítem${lineas.length === 1 ? "" : "s"}`}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => agregarLinea("producto")}><Plus className="h-4 w-4 mr-1" /> Producto</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => agregarLinea("servicio")}><Plus className="h-4 w-4 mr-1" /> Servicio</Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={abrirAltaProducto}>El repuesto no existe</Button>
                <Button type="button" variant="ghost" size="sm" onClick={abrirAltaServicio}>El servicio no existe</Button>
              </div>

              {altaProducto && (
                <div className="rounded-lg border p-3 sm:p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">Nuevo producto</p>
                    <Button type="button" variant="ghost" size="icon" onClick={cerrarAltaProducto} aria-label="Cerrar alta de producto"><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input placeholder="Nombre del producto" value={nuevoProducto.nombre} onChange={(event) => setNuevoProducto((v) => ({ ...v, nombre: event.target.value }))} />
                    <InputImporte value={nuevoProducto.precio} onChange={(valor) => setNuevoProducto((v) => ({ ...v, precio: valor }))} placeholder="Precio" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nuevoProducto.aplicaIva} onChange={(event) => setNuevoProducto((v) => ({ ...v, aplicaIva: event.target.checked }))} /> Aplica IVA</label>
                    <select className="flex h-10 rounded-md border border-input px-3 text-sm bg-background" value={nuevoProducto.tipo} onChange={(event) => setNuevoProducto((v) => ({ ...v, tipo: event.target.value as TipoImpuesto }))}>
                      {TIPOS_IMPUESTO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={nuevoProducto.aplicaInventario} onChange={(event) => setNuevoProducto((v) => ({ ...v, aplicaInventario: event.target.checked }))} /> Aplica inventario</label>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button type="button" variant="outline" onClick={cerrarAltaProducto}>Cerrar</Button>
                    <Button type="button" disabled={creando} onClick={() => void crearProductoRapido()}>Crear y usar</Button>
                  </div>
                </div>
              )}

              {altaServicio && (
                <div className="rounded-lg border p-3 sm:p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">Nuevo servicio</p>
                    <Button type="button" variant="ghost" size="icon" onClick={cerrarAltaServicio} aria-label="Cerrar alta de servicio"><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input placeholder="Nombre del servicio" value={nuevoServicio.nombre} onChange={(event) => setNuevoServicio((v) => ({ ...v, nombre: event.target.value }))} />
                    <InputImporte value={nuevoServicio.precio} onChange={(valor) => setNuevoServicio((v) => ({ ...v, precio: valor }))} placeholder="Precio" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={nuevoServicio.aplicaIva} onChange={(event) => setNuevoServicio((v) => ({ ...v, aplicaIva: event.target.checked }))} /> Aplica IVA</label>
                    <select className="flex h-10 rounded-md border border-input px-3 text-sm bg-background" value={nuevoServicio.tipo} onChange={(event) => setNuevoServicio((v) => ({ ...v, tipo: event.target.value as TipoImpuesto }))}>
                      {TIPOS_IMPUESTO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button type="button" variant="outline" onClick={cerrarAltaServicio}>Cerrar</Button>
                    <Button type="button" disabled={creando} onClick={() => void crearServicioRapido()}>Crear y usar</Button>
                  </div>
                </div>
              )}

              {lineas.length > 1 && (
                <div className="sticky top-0 z-10 -mx-1 flex gap-2 overflow-x-auto bg-card/95 px-1 py-2 backdrop-blur">
                  {lineas.map((linea, indice) => {
                    const activa = lineaActiva === linea.key;
                    return (
                      <button
                        key={`nav-${linea.key}`}
                        type="button"
                        className={cn(
                          "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium max-w-[12rem] truncate",
                          activa ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-primary/10",
                        )}
                        onClick={() => {
                          setLineaActiva(linea.key);
                          document.getElementById(`linea-ot-${linea.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        {indice + 1}. {linea.descripcion || (linea.tipo === "producto" ? "Producto" : "Servicio")}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                {lineas.map((linea, indice) => {
                  const totales = totalesLinea(linea);
                  const stock = linea.productoId ? existencias[linea.productoId] ?? [] : [];
                  const abierta = lineaActiva === linea.key;
                  const Icono = linea.tipo === "producto" ? Package : Wrench;
                  const notaCosto = notaCostoLinea(linea);
                  const preciosLinea = preciosDeLinea(linea);
                  return (
                    <div key={linea.key} id={`linea-ot-${linea.key}`} className="rounded-lg border scroll-mt-4">
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          onClick={() => setLineaActiva(abierta ? null : linea.key)}
                        >
                          <Icono className="h-4 w-4 shrink-0 text-primary" />
                          <span className="text-xs text-muted-foreground shrink-0">{indice + 1}.</span>
                          <span className="truncate text-sm font-medium">{linea.descripcion || (linea.tipo === "producto" ? "Producto" : "Servicio")}</span>
                          <span className="hidden sm:inline truncate text-xs text-muted-foreground">{formatoPrecio(totales.venta)} · {formatoPrecio(totales.utilidad)}</span>
                          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform ml-auto", abierta && "rotate-180")} />
                        </button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => {
                            setLineas((actual) => actual.filter((item) => item.key !== linea.key));
                            if (lineaActiva === linea.key) setLineaActiva(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {abierta && (
                        <div className="border-t p-3 sm:p-4 space-y-3">
                          <p className="sm:hidden text-xs text-muted-foreground">Final {formatoPrecio(totales.ventaUnit)} · Utilidad {formatoPrecio(totales.utilidad)}</p>
                          {linea.tipo === "producto" ? (
                            <BuscadorSelect
                              opciones={[]}
                              valor={linea.productoId}
                              onChange={(id) => void elegirProducto(linea, id)}
                              onBuscar={buscarProductos}
                              onTextoChange={recordarTextoBusqueda}
                              resetKey={resetBuscador}
                              minCaracteres={MIN_BUSQUEDA}
                              opcionFija={linea.productoId ? {
                                id: linea.productoId,
                                label: linea.codigo ? `${linea.codigo} · ${linea.descripcion}` : linea.descripcion,
                              } : null}
                              placeholder="Buscar producto"
                            />
                          ) : (
                            <BuscadorSelect
                              opciones={[]}
                              valor={linea.servicioId}
                              onChange={(id) => void elegirServicio(linea, id)}
                              onBuscar={buscarServicios}
                              onTextoChange={recordarTextoBusqueda}
                              resetKey={resetBuscador}
                              minCaracteres={MIN_BUSQUEDA}
                              opcionFija={linea.servicioId ? {
                                id: linea.servicioId,
                                label: linea.codigo ? `${linea.codigo} · ${linea.descripcion}` : linea.descripcion,
                              } : null}
                              placeholder="Buscar servicio"
                            />
                          )}
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label>Cantidad</Label>
                              <InputImporte value={linea.cantidad} onChange={(valor) => actualizarLinea(linea.key, { cantidad: valor })} placeholder="1" />
                            </div>
                            <div className="space-y-1">
                              <Label>Precio venta</Label>
                              <InputImporte value={linea.precioBase} onChange={(valor) => actualizarLinea(linea.key, { precioBase: valor })} />
                            </div>
                            <div className="space-y-1">
                              <Label>Costo proveedor</Label>
                              <InputImporte value={linea.precioCompra} onChange={(valor) => actualizarLinea(linea.key, { precioCompra: valor })} />
                              {notaCosto && (
                                <p className="text-xs text-muted-foreground">{notaCosto}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={linea.incluyeIva} onChange={(event) => actualizarLinea(linea.key, { incluyeIva: event.target.checked })} /> Incluye IVA</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={linea.aplicaIva} onChange={(event) => actualizarLinea(linea.key, { aplicaIva: event.target.checked })} /> Aplica IVA</label>
                            <select className="h-9 rounded-md border border-input px-2 text-sm bg-background" value={linea.tipoImpuesto} onChange={(event) => actualizarLinea(linea.key, { tipoImpuesto: event.target.value as TipoImpuesto })}>
                              {TIPOS_IMPUESTO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                            <span className="text-muted-foreground">Final {formatoPrecio(totales.ventaUnit)} · Utilidad {formatoPrecio(totales.utilidad)}</span>
                          </div>
                          <div className={cn("grid gap-3", linea.aplicaInventario ? "sm:grid-cols-2" : "")}>
                            <div className="space-y-1">
                              <Label>Proveedor</Label>
                              <BuscadorSelect
                                opciones={[]}
                                valor={linea.proveedorId}
                                onChange={(id) => void elegirProveedor(linea, id)}
                                onBuscar={(texto) => buscarProveedores(linea, texto)}
                                minCaracteres={MIN_BUSQUEDA}
                                opcionFija={linea.proveedorId ? {
                                  id: linea.proveedorId,
                                  label: linea.proveedorNombre
                                    ?? proveedoresCache.current.get(linea.proveedorId)?.nombres
                                    ?? preciosLinea.find((precio) => precio.proveedorId === linea.proveedorId)?.proveedorNombres
                                    ?? "Proveedor",
                                } : null}
                                placeholder="Opcional"
                              />
                            </div>
                            {linea.aplicaInventario && (
                              <div className="space-y-1">
                                <Label>Bodega</Label>
                                <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background" value={linea.bodegaId ?? ""} onChange={(event) => actualizarLinea(linea.key, { bodegaId: event.target.value ? Number(event.target.value) : null })}>
                                  <option value="">Selecciona</option>
                                  {bodegas.map((item) => {
                                    const qty = stock.find((s) => s.bodegaId === item.id)?.cantidad;
                                    return <option key={item.id} value={item.id}>{item.nombre}{qty != null ? ` (${qty})` : ""}</option>;
                                  })}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t bg-card px-4 sm:px-6 py-3 space-y-3">
            <div className="flex flex-wrap justify-start gap-x-6 gap-y-1 text-sm">
              <div><span className="text-muted-foreground">Venta </span><span className="font-semibold">{formatoPrecio(resumen.venta)}</span></div>
              <div><span className="text-muted-foreground">Costo </span><span className="font-semibold">{formatoPrecio(resumen.costo)}</span></div>
              <div><span className="text-muted-foreground">Utilidad </span><span className="font-semibold">{formatoPrecio(resumen.utilidad)}</span></div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-start gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>Cancelar</Button>
              <Button type="button" className="w-full sm:w-auto" disabled={cargando} onClick={() => void enviar()}>{cargando ? "Guardando..." : "Guardar orden"}</Button>
            </div>
          </div>
        </aside>
      </div>
    </Portal>
  );
}

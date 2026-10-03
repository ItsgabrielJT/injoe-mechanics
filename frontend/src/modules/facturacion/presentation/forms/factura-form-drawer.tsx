"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Wrench, X } from "lucide-react";
import { BuscadorSelect } from "@/modules/inventario/presentation/components/buscador-select";
import type { Bodega, Existencia, Producto, TipoImpuesto } from "@/modules/inventario/domain/entities";
import type { Servicio } from "@/modules/servicios/domain/entities";
import type { Cliente } from "@/modules/clientes/domain/entities";
import type { Factura, FacturaInput, FormaPago, ItemFacturaInput, TipoReceptor } from "@/modules/facturacion/domain/entities";
import { numeroVacio, precioBaseCatalogo, precioConIva, tasaIva, TIPOS_IMPUESTO } from "@/modules/facturacion/domain/entities";
import { Portal } from "@/shared/components/portal";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface LineaForm {
  key: string;
  producto_id: number | null;
  servicio_id: number | null;
  descripcion: string;
  codigo: string;
  cantidad: string;
  precio_mostrado: string;
  incluye_iva: boolean;
  descuento_porcentaje: string;
  tipo_impuesto: TipoImpuesto;
  bodega_id: number | null;
}

function nuevaKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function baseLinea(linea: LineaForm): number {
  return precioBaseCatalogo(numeroVacio(linea.precio_mostrado), linea.incluye_iva, linea.tipo_impuesto);
}

function recalc(linea: LineaForm) {
  const qty = numeroVacio(linea.cantidad);
  const precio = baseLinea(linea);
  const desc = numeroVacio(linea.descuento_porcentaje);
  const bruto = qty * precio;
  const descuento = bruto * (desc / 100);
  const subtotal = bruto - descuento;
  const cobraIva = linea.tipo_impuesto === "15" || linea.tipo_impuesto === "5";
  const iva = cobraIva ? subtotal * tasaIva(linea.tipo_impuesto, true) : 0;
  return { subtotal, iva, total: subtotal + iva, precio };
}

function stockBodega(existencias: Existencia[] | undefined, bodegaId: number | null): number | null {
  if (!existencias || !bodegaId) return null;
  const fila = existencias.find((item) => item.bodegaId === bodegaId);
  return fila ? fila.cantidad : 0;
}

interface Props {
  abierto: boolean;
  cargando?: boolean;
  factura?: Factura | null;
  clientes: Cliente[];
  productos: Producto[];
  servicios: Servicio[];
  formasPago: FormaPago[];
  bodegas: Bodega[];
  existencias: Record<number, Existencia[]>;
  onCargarExistencias: (productoId: number) => Promise<Existencia[] | void>;
  onClose: () => void;
  onSubmit: (body: FacturaInput) => Promise<void>;
}

export function FacturaFormDrawer({
  abierto,
  cargando,
  factura,
  clientes,
  productos,
  servicios,
  formasPago,
  bodegas,
  existencias,
  onCargarExistencias,
  onClose,
  onSubmit,
}: Props) {
  const [tipoReceptor, setTipoReceptor] = useState<TipoReceptor>("cliente");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [formaPagoId, setFormaPagoId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [fechaPago, setFechaPago] = useState("");
  const [notas, setNotas] = useState("");
  const [terminos, setTerminos] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([]);

  useEffect(() => {
    if (!abierto) return;
    setTipoReceptor(factura?.tipoReceptor ?? "cliente");
    setClienteId(factura?.clienteId ?? null);
    setFormaPagoId(factura?.formaPagoId ?? formasPago[0]?.id ?? null);
    setFecha(factura?.fechaEmision ?? hoy());
    setFechaPago(factura?.fechaPago ?? "");
    setNotas(factura?.notas ?? "");
    setTerminos(factura?.terminos ?? "");
    setBusqueda("");
    setLineas((factura?.items ?? []).map((item) => ({
      key: nuevaKey(),
      producto_id: item.productoId,
      servicio_id: item.servicioId,
      descripcion: item.descripcion,
      codigo: item.codigo ?? "",
      cantidad: item.cantidad ? String(item.cantidad) : "",
      precio_mostrado: item.precioUnitario ? String(item.precioUnitario) : "",
      incluye_iva: false,
      descuento_porcentaje: item.descuentoPorcentaje ? String(item.descuentoPorcentaje) : "",
      tipo_impuesto: item.tipoImpuesto,
      bodega_id: item.bodegaId,
    })));
    for (const item of factura?.items ?? []) {
      if (item.productoId) void onCargarExistencias(item.productoId);
    }
  }, [abierto, factura]);

  useEffect(() => {
    if (!abierto || factura?.formaPagoId) return;
    setFormaPagoId((actual) => actual ?? formasPago[0]?.id ?? null);
  }, [abierto, factura, formasPago]);

  const itemsFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (termino.length < 2) return [];
    const prods = productos.filter((p) => `${p.codigo} ${p.nombre}`.toLowerCase().includes(termino)).map((p) => ({
      tipo: "producto" as const,
      id: p.id,
      label: p.nombre,
      extra: `${p.codigo} · ${TIPOS_IMPUESTO.find((t) => t.value === p.tipoImpuesto)?.label ?? p.tipoImpuesto} · stock ${p.stockTotal}`,
      item: p,
    }));
    const servs = servicios.filter((s) => `${s.codigo} ${s.nombre}`.toLowerCase().includes(termino)).map((s) => ({
      tipo: "servicio" as const,
      id: s.id,
      label: s.nombre,
      extra: `${s.codigo} · ${TIPOS_IMPUESTO.find((t) => t.value === s.tipoImpuesto)?.label ?? s.tipoImpuesto}`,
      item: s,
    }));
    return [...prods, ...servs].slice(0, 12);
  }, [busqueda, productos, servicios]);

  const totales = useMemo(() => {
    const buckets = { s15: 0, s5: 0, s0: 0, objeto: 0, exento: 0, iva15: 0, iva5: 0, desc: 0, total: 0 };
    for (const linea of lineas) {
      const { subtotal, iva, total, precio } = recalc(linea);
      const bruto = numeroVacio(linea.cantidad) * precio;
      buckets.desc += bruto - subtotal;
      buckets.total += total;
      if (linea.tipo_impuesto === "15") { buckets.s15 += subtotal; buckets.iva15 += iva; }
      else if (linea.tipo_impuesto === "5") { buckets.s5 += subtotal; buckets.iva5 += iva; }
      else if (linea.tipo_impuesto === "no_objeto") buckets.objeto += subtotal;
      else if (linea.tipo_impuesto === "exento_iva") buckets.exento += subtotal;
      else buckets.s0 += subtotal;
    }
    return buckets;
  }, [lineas]);

  function actualizar(index: number, cambios: Partial<LineaForm>) {
    setLineas((prev) => prev.map((linea, i) => (i === index ? { ...linea, ...cambios } : linea)));
  }

  async function agregarItem(tipo: "producto" | "servicio", id: number) {
    const producto = tipo === "producto" ? productos.find((p) => p.id === id) : undefined;
    const servicio = tipo === "servicio" ? servicios.find((s) => s.id === id) : undefined;
    const origen = producto ?? servicio;
    if (!origen) return;
    const key = nuevaKey();
    const cobraIva = origen.tipoImpuesto === "15" || origen.tipoImpuesto === "5";
    setLineas((prev) => [...prev, {
      key,
      producto_id: producto?.id ?? null,
      servicio_id: servicio?.id ?? null,
      descripcion: origen.nombre,
      codigo: origen.codigo,
      cantidad: "1",
      precio_mostrado: String(origen.precioVenta),
      incluye_iva: Boolean(origen.aplicaIva && cobraIva),
      descuento_porcentaje: "",
      tipo_impuesto: origen.tipoImpuesto,
      bodega_id: producto ? (bodegas[0]?.id ?? null) : null,
    }]);
    setBusqueda("");
    if (!producto) return;
    try {
      const stocks = (await onCargarExistencias(producto.id)) ?? existencias[producto.id] ?? [];
      const conStock = stocks.find((item) => item.cantidad > 0);
      const bodegaId = conStock?.bodegaId ?? stocks[0]?.bodegaId ?? bodegas[0]?.id ?? null;
      setLineas((prev) => prev.map((linea) => (linea.key === key ? { ...linea, bodega_id: bodegaId } : linea)));
    } catch {
      // se mantiene la primera bodega
    }
  }

  function cambiarIncluyeIva(index: number, incluye: boolean) {
    const linea = lineas[index];
    const base = baseLinea(linea);
    actualizar(index, {
      incluye_iva: incluye,
      precio_mostrado: incluye ? String(precioConIva(base, linea.tipo_impuesto)) : String(base),
    });
  }

  async function submit() {
    const items: ItemFacturaInput[] = lineas.map((linea) => ({
      producto_id: linea.producto_id,
      servicio_id: linea.servicio_id,
      descripcion: linea.descripcion,
      codigo: linea.codigo,
      cantidad: numeroVacio(linea.cantidad) || 0,
      precio_unitario: baseLinea(linea),
      descuento_porcentaje: numeroVacio(linea.descuento_porcentaje),
      aplica_iva: linea.tipo_impuesto === "15" || linea.tipo_impuesto === "5",
      tipo_impuesto: linea.tipo_impuesto,
      bodega_id: linea.producto_id ? linea.bodega_id : null,
    }));
    await onSubmit({
      tipo_receptor: tipoReceptor,
      cliente_id: tipoReceptor === "cliente" ? clienteId : null,
      forma_pago_id: formaPagoId,
      fecha_emision: fecha,
      fecha_pago: fechaPago || null,
      notas,
      terminos,
      items,
      orden_trabajo_id: factura?.ordenTrabajoId,
    });
  }

  if (!abierto) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-6xl rounded-t-2xl sm:rounded-2xl bg-card shadow-elegant max-h-[94dvh] overflow-y-auto">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">{factura ? `Editar ${factura.numero}` : "Nueva factura"}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          <div className="px-6 py-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Receptor</Label>
                <select className="flex h-10 w-full rounded-md border px-3 text-sm bg-background" value={tipoReceptor} onChange={(e) => setTipoReceptor(e.target.value as TipoReceptor)}>
                  <option value="cliente">Cliente</option>
                  <option value="consumidor_final">Consumidor final</option>
                </select>
              </div>
              {tipoReceptor === "cliente" && (
                <div>
                  <Label>Cliente</Label>
                  <BuscadorSelect
                    opciones={clientes.map((c) => ({ id: c.id, label: c.nombres, extra: c.identificacion ?? "" }))}
                    valor={clienteId}
                    onChange={setClienteId}
                    placeholder="Buscar cliente"
                  />
                </div>
              )}
              <div>
                <Label>Forma de pago</Label>
                <select className="flex h-10 w-full rounded-md border px-3 text-sm bg-background" value={formaPagoId ?? ""} onChange={(e) => setFormaPagoId(Number(e.target.value))}>
                  {formasPago.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
              <div><Label>Fecha de emisión</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
              <div><Label>Fecha de pago</Label><Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} /></div>
            </div>

            <div>
              <Label>Agregar producto o servicio</Label>
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escribe al menos 2 caracteres" />
              {itemsFiltrados.length > 0 && (
                <div className="mt-1 rounded-md border bg-background shadow-sm max-h-48 overflow-y-auto">
                  {itemsFiltrados.map((item) => (
                    <button key={`${item.tipo}-${item.id}`} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10" onClick={() => void agregarItem(item.tipo, item.id)}>
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground"> · {item.extra} · {item.tipo}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {lineas.length === 0 && (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Todavía no hay ítems. Busca un producto o servicio para agregarlo.</p>
              )}
              {lineas.map((linea, index) => {
                const { total, iva, precio } = recalc(linea);
                const stock = linea.producto_id ? stockBodega(existencias[linea.producto_id], linea.bodega_id) : null;
                const esProducto = Boolean(linea.producto_id);
                return (
                  <div key={linea.key} className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3 ring-1 ring-primary/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {esProducto ? <Package className="h-4 w-4 text-primary" /> : <Wrench className="h-4 w-4 text-primary" />}
                          <span className="text-xs text-muted-foreground">{index + 1}.</span>
                          {linea.descripcion}
                        </p>
                        <p className="text-xs text-muted-foreground">{linea.codigo || "Sin código"} · {esProducto ? "Producto" : "Servicio"}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setLineas((prev) => prev.filter((item) => item.key !== linea.key))}>Quitar</Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                      <div>
                        <Label>Cantidad</Label>
                        <Input value={linea.cantidad} onChange={(e) => actualizar(index, { cantidad: e.target.value })} />
                      </div>
                      <div>
                        <Label>P. unitario</Label>
                        <Input value={linea.precio_mostrado} onChange={(e) => actualizar(index, { precio_mostrado: e.target.value })} />
                        <p className="mt-1 text-[11px] text-muted-foreground">Base {precio.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label>Desc. %</Label>
                        <Input value={linea.descuento_porcentaje} onChange={(e) => actualizar(index, { descuento_porcentaje: e.target.value })} />
                      </div>
                      <div>
                        <Label>Impuesto</Label>
                        <select className="flex h-10 w-full rounded-md border px-3 text-sm bg-background" value={linea.tipo_impuesto} onChange={(e) => actualizar(index, { tipo_impuesto: e.target.value as TipoImpuesto })}>
                          {TIPOS_IMPUESTO.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                        </select>
                      </div>
                      {esProducto ? (
                        <div>
                          <Label>Bodega</Label>
                          <select className="flex h-10 w-full rounded-md border px-3 text-sm bg-background" value={linea.bodega_id ?? ""} onChange={(e) => actualizar(index, { bodega_id: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">Seleccionar</option>
                            {bodegas.map((bodega) => {
                              const qty = (existencias[linea.producto_id ?? 0] ?? []).find((item) => item.bodegaId === bodega.id)?.cantidad;
                              return <option key={bodega.id} value={bodega.id}>{bodega.nombre}{qty != null ? ` (stock ${qty})` : ""}</option>;
                            })}
                          </select>
                          <p className={`mt-1 text-[11px] ${stock !== null && stock <= 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            Stock disponible: {stock === null ? "—" : stock}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <Label>Bodega</Label>
                          <p className="flex h-10 items-center text-sm text-muted-foreground">No aplica</p>
                        </div>
                      )}
                      <div>
                        <Label>Total línea</Label>
                        <p className="flex h-10 items-center font-semibold">{total.toFixed(2)}</p>
                        <p className="text-[11px] text-muted-foreground">IVA {iva.toFixed(2)}</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={linea.incluye_iva}
                        disabled={linea.tipo_impuesto !== "15" && linea.tipo_impuesto !== "5"}
                        onChange={(e) => cambiarIncluyeIva(index, e.target.checked)}
                      />
                      El precio unitario incluye IVA
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label>Notas</Label>
                  <textarea className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones internas o para el cliente" />
                </div>
                <div>
                  <Label>Términos y condiciones</Label>
                  <textarea className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={terminos} onChange={(e) => setTerminos(e.target.value)} placeholder="Condiciones de la factura" />
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
                <p>Subtotal 15%: {totales.s15.toFixed(2)} · IVA 15%: {totales.iva15.toFixed(2)}</p>
                <p>Subtotal 5%: {totales.s5.toFixed(2)} · IVA 5%: {totales.iva5.toFixed(2)}</p>
                <p>0% / exento / no objeto: {(totales.s0 + totales.exento + totales.objeto).toFixed(2)}</p>
                <p className="text-base font-semibold pt-2">Total: {totales.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button disabled={cargando} onClick={() => void submit()}>{cargando ? "Guardando..." : "Guardar borrador"}</Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

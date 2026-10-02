"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { PrecioProveedor, Proveedor } from "@/modules/proveedores/domain/entities";
import {
  eliminarPrecioProducto,
  eliminarPrecioServicio,
  guardarPrecioProducto,
  guardarPrecioServicio,
  listarPreciosProducto,
  listarPreciosServicio,
  listarProveedores,
} from "@/modules/proveedores/infrastructure/proveedores-api";
import { BuscadorSelect } from "@/modules/inventario/presentation/components/buscador-select";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ApiError } from "@/shared/infrastructure/http/http-error";

interface Props {
  token: string;
  catalogoId: number | null;
  tipo: "producto" | "servicio";
}

export function PreciosProveedorPanel({ token, catalogoId, tipo }: Props) {
  const [precios, setPrecios] = useState<PrecioProveedor[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [precio, setPrecio] = useState("");
  const [principal, setPrincipal] = useState(false);
  const [edicion, setEdicion] = useState<PrecioProveedor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    if (!token || !catalogoId) {
      setPrecios([]);
      return;
    }
    const [lista, maestros] = await Promise.all([
      tipo === "producto" ? listarPreciosProducto(token, catalogoId) : listarPreciosServicio(token, catalogoId),
      listarProveedores(token, { page: 1, size: 200, activo: true }),
    ]);
    setPrecios(lista);
    setProveedores(maestros.data);
  }

  useEffect(() => {
    void cargar().catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar precios"));
  }, [catalogoId, tipo, token]);

  async function guardar() {
    if (!catalogoId || !proveedorId) {
      setError("Selecciona un proveedor");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const body = { proveedor_id: proveedorId, precio_compra: Number(precio), es_principal: principal };
      if (tipo === "producto") {
        await guardarPrecioProducto(token, catalogoId, body, edicion?.id);
      } else {
        await guardarPrecioServicio(token, catalogoId, body, edicion?.id);
      }
      setEdicion(null);
      setProveedorId(null);
      setPrecio("");
      setPrincipal(false);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el precio");
    } finally {
      setGuardando(false);
    }
  }

  if (!catalogoId) {
    return <p className="text-sm text-muted-foreground">Selecciona un ítem del catálogo para ver sus precios de compra.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-4 items-end rounded-lg border p-4">
        <div className="space-y-2 sm:col-span-2">
          <Label>Proveedor</Label>
          <BuscadorSelect
            opciones={proveedores.map((item) => ({ id: item.id, label: item.nombres, extra: item.identificacion }))}
            valor={proveedorId}
            onChange={setProveedorId}
            placeholder="Buscar proveedor"
          />
        </div>
        <div className="space-y-2">
          <Label>Precio de compra</Label>
          <Input type="number" min="0" step="0.01" value={precio} onChange={(event) => setPrecio(event.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={principal} onChange={(event) => setPrincipal(event.target.checked)} /> Principal
          </label>
          <Button onClick={() => void guardar()} disabled={guardando}>{edicion ? "Actualizar" : <><Plus className="h-4 w-4 mr-1" /> Agregar</>}</Button>
        </div>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="text-left px-3 py-2">Proveedor</th>
              <th className="text-left px-3 py-2">RUC</th>
              <th className="text-right px-3 py-2">Precio</th>
              <th className="text-left px-3 py-2">Principal</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {precios.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin precios de compra</td></tr>
            )}
            {precios.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2">{item.proveedorNombres}</td>
                <td className="px-3 py-2">{item.proveedorIdentificacion}</td>
                <td className="px-3 py-2 text-right">${item.precioCompra.toFixed(2)}</td>
                <td className="px-3 py-2">{item.esPrincipal ? "Sí" : "No"}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => {
                    setEdicion(item);
                    setProveedorId(item.proveedorId);
                    setPrecio(String(item.precioCompra));
                    setPrincipal(item.esPrincipal);
                  }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (tipo === "producto") await eliminarPrecioProducto(token, catalogoId, item.id);
                    else await eliminarPrecioServicio(token, catalogoId, item.id);
                    await cargar();
                  }}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
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

export interface ItemCatalogoPrecio {
  id: number;
  label: string;
}

interface PrecioFila extends PrecioProveedor {
  catalogoId: number;
  catalogoLabel: string;
}

interface Props {
  token: string;
  items: ItemCatalogoPrecio[];
  tipo: "producto" | "servicio";
}

export function PreciosProveedorPanel({ token, items, tipo }: Props) {
  const [precios, setPrecios] = useState<PrecioFila[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [catalogoId, setCatalogoId] = useState<number | null>(null);
  const [proveedorId, setProveedorId] = useState<number | null>(null);
  const [precio, setPrecio] = useState("");
  const [principal, setPrincipal] = useState(false);
  const [edicion, setEdicion] = useState<PrecioFila | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const idsKey = items.map((item) => item.id).join(",");
  const itemPorId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  async function cargar() {
    if (!token || items.length === 0) {
      setPrecios([]);
      return;
    }
    const [listas, maestros] = await Promise.all([
      Promise.all(
        items.map((item) =>
          tipo === "producto" ? listarPreciosProducto(token, item.id) : listarPreciosServicio(token, item.id),
        ),
      ),
      listarProveedores(token, { page: 1, size: 200, activo: true }),
    ]);
    setPrecios(
      listas.flatMap((lista, indice) => {
        const item = items[indice];
        return lista.map((precioItem) => ({
          ...precioItem,
          catalogoId: item.id,
          catalogoLabel: item.label,
        }));
      }),
    );
    setProveedores(maestros.data);
  }

  useEffect(() => {
    if (items.length === 1) {
      setCatalogoId(items[0].id);
    } else if (catalogoId && !itemPorId.has(catalogoId)) {
      setCatalogoId(null);
    }
  }, [idsKey, catalogoId, itemPorId, items]);

  useEffect(() => {
    void cargar().catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar precios"));
  }, [idsKey, tipo, token]);

  async function guardar() {
    const destinoId = catalogoId ?? (items.length === 1 ? items[0].id : null);
    if (!destinoId || !proveedorId) {
      setError(items.length > 1 ? "Selecciona el ítem y el proveedor" : "Selecciona un proveedor");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const body = { proveedor_id: proveedorId, precio_compra: Number(precio || 0), es_principal: principal };
      if (tipo === "producto") {
        await guardarPrecioProducto(token, destinoId, body, edicion?.id);
      } else {
        await guardarPrecioServicio(token, destinoId, body, edicion?.id);
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

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Busca y agrega uno o varios {tipo === "producto" ? "productos" : "servicios"} para ver y comparar sus costos de compra.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end rounded-lg border p-4">
        {items.length > 1 && (
          <div className="space-y-2 lg:col-span-2">
            <Label>{tipo === "producto" ? "Producto" : "Servicio"}</Label>
            <BuscadorSelect
              opciones={items.map((item) => ({ id: item.id, label: item.label }))}
              valor={catalogoId}
              onChange={setCatalogoId}
              placeholder="Ítem para el costo"
            />
          </div>
        )}
        <div className="space-y-2 lg:col-span-2">
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
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={precio}
            onChange={(event) => {
              const siguiente = event.target.value.replace(",", ".").replace(/[^0-9.]/g, "");
              const partes = siguiente.split(".");
              setPrecio(partes.length > 2 ? `${partes[0]}.${partes.slice(1).join("")}` : siguiente);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={principal} onChange={(event) => setPrincipal(event.target.checked)} /> Principal
          </label>
          <Button onClick={() => void guardar()} disabled={guardando}>{edicion ? "Actualizar" : <><Plus className="h-4 w-4 mr-1" /> Agregar</>}</Button>
        </div>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-[36rem]">
          <thead className="bg-muted/40 text-muted-foreground uppercase text-xs">
            <tr>
              {items.length > 1 && <th className="text-left px-3 py-2">{tipo === "producto" ? "Producto" : "Servicio"}</th>}
              <th className="text-left px-3 py-2">Proveedor</th>
              <th className="text-left px-3 py-2">RUC</th>
              <th className="text-right px-3 py-2">Precio</th>
              <th className="text-left px-3 py-2">Principal</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {precios.length === 0 && (
              <tr>
                <td colSpan={items.length > 1 ? 6 : 5} className="px-3 py-6 text-center text-muted-foreground">
                  Sin precios de compra
                </td>
              </tr>
            )}
            {precios.map((item) => (
              <tr key={`${item.catalogoId}-${item.id}`} className="border-t">
                {items.length > 1 && <td className="px-3 py-2">{item.catalogoLabel}</td>}
                <td className="px-3 py-2">{item.proveedorNombres}</td>
                <td className="px-3 py-2">{item.proveedorIdentificacion}</td>
                <td className="px-3 py-2 text-right">${item.precioCompra.toFixed(2)}</td>
                <td className="px-3 py-2">{item.esPrincipal ? "Sí" : "No"}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEdicion(item);
                      setCatalogoId(item.catalogoId);
                      setProveedorId(item.proveedorId);
                      setPrecio(String(item.precioCompra));
                      setPrincipal(item.esPrincipal);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      if (tipo === "producto") await eliminarPrecioProducto(token, item.catalogoId, item.id);
                      else await eliminarPrecioServicio(token, item.catalogoId, item.id);
                      await cargar();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const EVENTO_BUSCADOR_ABRIO = "injoe:buscador-abrio";

function useCerrarAlClickFuera(abierto: boolean, onCerrar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;

  useEffect(() => {
    if (!abierto) return;
    const id = {};

    function cerrarSiFuera(event: Event) {
      const destino = event.target;
      if (!(destino instanceof Node) || !ref.current?.contains(destino)) {
        onCerrarRef.current();
      }
    }

    function cerrarPorOtro(event: Event) {
      if ((event as CustomEvent).detail !== id) {
        onCerrarRef.current();
      }
    }

    function handleTecla(event: KeyboardEvent) {
      if (event.key === "Escape") onCerrarRef.current();
    }

    document.dispatchEvent(new CustomEvent(EVENTO_BUSCADOR_ABRIO, { detail: id }));
    document.addEventListener(EVENTO_BUSCADOR_ABRIO, cerrarPorOtro);
    document.addEventListener("pointerdown", cerrarSiFuera, true);
    document.addEventListener("keydown", handleTecla);
    return () => {
      document.removeEventListener(EVENTO_BUSCADOR_ABRIO, cerrarPorOtro);
      document.removeEventListener("pointerdown", cerrarSiFuera, true);
      document.removeEventListener("keydown", handleTecla);
    };
  }, [abierto]);

  return ref;
}

export interface OpcionBuscador {
  id: number;
  label: string;
  extra?: string;
}

interface BuscadorSelectProps {
  opciones: OpcionBuscador[];
  valor: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export function BuscadorSelect({ opciones, valor, onChange, placeholder = "Buscar...", disabled, error }: BuscadorSelectProps) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const contenedor = useCerrarAlClickFuera(abierto, () => setAbierto(false));
  const seleccionado = opciones.find((item) => item.id === valor) ?? null;

  const filtradas = useMemo(() => {
    const termino = texto.trim().toLowerCase();
    if (!termino) {
      return opciones.slice(0, 20);
    }
    return opciones
      .filter((item) => `${item.label} ${item.extra ?? ""}`.toLowerCase().includes(termino))
      .slice(0, 20);
  }, [opciones, texto]);

  useEffect(() => {
    if (!abierto) {
      setTexto("");
    }
  }, [abierto]);

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto((actual) => !actual)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm",
          error && "border-destructive",
          disabled && "opacity-50",
        )}
      >
        <span className={cn("truncate", !seleccionado && "text-muted-foreground")}>
          {seleccionado ? seleccionado.label : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {seleccionado && (
            <X
              className="h-3.5 w-3.5"
              onClick={(event) => {
                event.stopPropagation();
                onChange(null);
              }}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </span>
      </button>
      {abierto && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-card shadow-elegant">
          <input
            autoFocus
            className="h-10 w-full border-b bg-transparent px-3 text-sm outline-none"
            placeholder="Escribe para buscar"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
          />
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtradas.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>}
            {filtradas.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-primary/10",
                    item.id === valor && "bg-primary/10",
                  )}
                  onClick={() => {
                    onChange(item.id);
                    setAbierto(false);
                  }}
                >
                  <span className="block font-medium">{item.label}</span>
                  {item.extra && <span className="block text-xs text-muted-foreground">{item.extra}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface BuscadorMultipleProps {
  opciones: OpcionBuscador[];
  valores: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}

export function BuscadorMultiple({ opciones, valores, onChange, placeholder }: BuscadorMultipleProps) {
  const [texto, setTexto] = useState("");
  const listaAbierta = texto.trim().length > 0;
  const contenedor = useCerrarAlClickFuera(listaAbierta, () => setTexto(""));
  const filtradas = useMemo(() => {
    const termino = texto.trim().toLowerCase();
    return opciones
      .filter((item) => !valores.includes(item.id))
      .filter((item) => !termino || `${item.label} ${item.extra ?? ""}`.toLowerCase().includes(termino))
      .slice(0, 8);
  }, [opciones, texto, valores]);
  const seleccionadas = opciones.filter((item) => valores.includes(item.id));

  return (
    <div ref={contenedor} className="relative space-y-2">
      <input
        className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background"
        placeholder={placeholder}
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
      />
      {filtradas.length > 0 && listaAbierta && (
        <ul className="absolute z-20 mt-1 w-full rounded-md border bg-card shadow-elegant">
          {filtradas.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10"
                onClick={() => {
                  onChange([...valores, item.id]);
                  setTexto("");
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {seleccionadas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {seleccionadas.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs">
              {item.label}
              <button type="button" onClick={() => onChange(valores.filter((id) => id !== item.id))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";

export function SwitcherPunto({ onAbiertoChange }: { onAbiertoChange?: (abierto: boolean) => void } = {}) {
  const { sesion, empresaActiva, puntoActivo, cambiarPunto } = useSesionContext();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    onAbiertoChange?.(abierto);
  }, [abierto, onAbiertoChange]);

  useEffect(() => {
    return () => onAbiertoChange?.(false);
  }, [onAbiertoChange]);

  if (!sesion || !empresaActiva || !puntoActivo) {
    return null;
  }

  const puntos = sesion.empresas.flatMap((empresa) =>
    empresa.puntosEmision.map((punto) => ({ empresa, punto })),
  );

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setAbierto((valor) => !valor)}
        className="sidebar-center w-full h-auto min-w-0 justify-between gap-2 p-3 hover:bg-primary/20"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
            <Building2 className="h-4 w-4 shrink-0 text-white" />
          </div>
          <div className="sidebar-label min-w-0 flex-1 overflow-hidden text-left">
            <div className="truncate text-sm font-medium" title={empresaActiva.nombre}>
              {empresaActiva.nombre}
            </div>
            <div className="truncate text-xs text-muted-foreground" title={puntoActivo.nombre}>
              {puntoActivo.nombre}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`sidebar-label h-4 w-4 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </Button>
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 top-full left-0 mt-2 w-72"
          >
            <Card className="bg-card/95 border shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cambiar punto de emisión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {puntos.map(({ empresa, punto }) => (
                  <Button
                    key={punto.id}
                    variant="ghost"
                    className="w-full min-w-0 justify-start p-3 h-auto hover:bg-accent"
                    onClick={async () => {
                      setAbierto(false);
                      await cambiarPunto(punto.id);
                    }}
                  >
                    <div className="flex min-w-0 w-full items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark">
                        <Building2 className="h-4 w-4 shrink-0 text-white" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden text-left">
                        <div className="truncate text-sm font-medium" title={punto.nombre}>
                          {punto.nombre}
                        </div>
                        <div className="truncate text-xs text-muted-foreground" title={empresa.nombre}>
                          {empresa.nombre}
                        </div>
                      </div>
                      {puntoActivo.id === punto.id && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      {abierto && <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />}
    </div>
  );
}

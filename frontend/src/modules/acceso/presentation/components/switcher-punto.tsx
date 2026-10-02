"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";

export function SwitcherPunto() {
  const { sesion, empresaActiva, puntoActivo, cambiarPunto } = useSesionContext();
  const [abierto, setAbierto] = useState(false);

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
        className="w-full h-auto justify-between p-3 hover:bg-primary/20"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-sm font-medium truncate">{empresaActiva.nombre}</div>
            <div className="text-xs text-muted-foreground truncate">{puntoActivo.nombre}</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </Button>
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 top-full left-0 right-0 mt-2"
          >
            <Card className="bg-card/95 border shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Cambiar punto de emisión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {puntos.map(({ empresa, punto }) => (
                  <Button
                    key={punto.id}
                    variant="ghost"
                    className="w-full justify-start p-3 h-auto hover:bg-accent"
                    onClick={async () => {
                      setAbierto(false);
                      await cambiarPunto(punto.id);
                    }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">{punto.nombre}</div>
                        <div className="text-xs text-muted-foreground">{empresa.nombre}</div>
                      </div>
                      {puntoActivo.id === punto.id && <Check className="w-4 h-4 text-primary ml-auto" />}
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

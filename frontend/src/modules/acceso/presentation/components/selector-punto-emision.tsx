"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import type { Empresa, PuntoEmision } from "@/modules/acceso/domain/entities";
import { BrandLockup } from "@/shared/components/brand-lockup";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface SelectorPuntoEmisionProps {
  empresas: Empresa[];
  onSelect: (punto: PuntoEmision) => void;
  cargando?: boolean;
}

export function SelectorPuntoEmision({ empresas, onSelect, cargando }: SelectorPuntoEmisionProps) {
  const puntos = empresas.flatMap((empresa) =>
    empresa.puntosEmision.map((punto) => ({ empresa, punto })),
  );

  return (
    <div className="min-h-dvh relative overflow-x-hidden overflow-y-auto flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover">
          <source
            src="https://videos.pexels.com/video-files/3066460/3066460-uhd_2732_1440_24fps.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <div className="relative z-10 w-full max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <BrandLockup as="h1" size="lg" className="mb-6 justify-center gap-3 sm:gap-4" />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">Selecciona punto de emisión</h2>
          <p className="text-sm sm:text-base text-white/70">Elige el punto de emisión desde el cual trabajarás</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {puntos.map(({ empresa, punto }, index) => (
            <motion.div
              key={punto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl hover:shadow-[#FF7F50]/20 transition-all duration-300 hover:scale-105 h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">{punto.nombre}</CardTitle>
                      <p className="text-white/70 text-sm">{empresa.nombre}</p>
                      <p className="text-white/60 text-xs">Código: {punto.codigo}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 text-sm mb-4">{punto.direccion}</p>
                  <Button
                    onClick={() => onSelect(punto)}
                    disabled={cargando}
                    className="w-full bg-gradient-to-r from-primary to-primary-dark border-0"
                  >
                    Seleccionar punto
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

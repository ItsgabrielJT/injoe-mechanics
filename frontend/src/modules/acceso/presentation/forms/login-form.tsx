"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";

export function LoginForm() {
  const { login, cargando } = useSesionContext();
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (identificador.includes("@")) {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      if (!emailRegex.test(identificador)) {
        setError("El formato del correo electrónico no es válido");
        return;
      }
    }
    try {
      await login(identificador, contrasena);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credenciales inválidas");
    }
  }

  return (
    <Card className="backdrop-blur-xl p-6 rounded-2xl bg-white/85 text-slate-900 border border-white/40 shadow-2xl hover:shadow-[#FF7F50]/20 transition-all duration-300">
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-lg bg-red-50 border border-red-200"
              >
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="space-y-2">
            <Label htmlFor="identificador">Correo o Nombre de Usuario</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="identificador"
                value={identificador}
                onChange={(event) => {
                  setIdentificador(event.target.value.replace(/[, ]/g, ""));
                  if (error) setError(null);
                }}
                placeholder="correo@empresa.com o nombre_usuario"
                required
                className="pl-10 bg-white/90 text-slate-900 placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contrasena">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="contrasena"
                type={mostrar ? "text" : "password"}
                value={contrasena}
                onChange={(event) => {
                  setContrasena(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="Tu contraseña"
                required
                className="pl-10 pr-10 bg-white/90 text-slate-900 placeholder:text-slate-500"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-slate-600"
                onClick={() => setMostrar((valor) => !valor)}
              >
                {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={cargando}
            className="w-full bg-gradient-primary hover:bg-primary-dark border-0 shadow-soft hover:shadow-elegant"
          >
            {cargando ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { motion } from "framer-motion";
import { LoginForm } from "@/modules/acceso/presentation/forms/login-form";

export function LoginPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover">
          <source
            src="https://videos.pexels.com/video-files/3066460/3066460-uhd_2732_1440_24fps.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-full lg:w-1/2 text-left"
              >
                <div className="mb-8 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden">
                    <img src="/logos/logo_injoe_web.png" alt="INJOE" className="w-full h-full object-contain" />
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-2xl">
                    <span className="text-primary">INJOE</span>
                    <span className="text-white/90"> MECÁNICOS</span>
                  </h1>
                </div>
                <p className="text-xl text-white/90 mb-8">Inicia sesión para acceder a tu cuenta</p>
              </motion.div>
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-full lg:w-1/2"
              >
                <LoginForm />
              </motion.div>
            </div>
          </div>
        </div>
        <footer className="relative z-10 py-6 px-4 border-t border-white/10">
          <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-60 h-12 rounded-xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20">
              <img src="/logos/logo_injoe_white.png" alt="INJOE" className="w-full h-full object-contain p-2" />
            </div>
            <div className="text-center md:text-right">
              <p className="text-white/60 text-sm">
                © {new Date().getFullYear()} INJOE MECÁNICOS. Todos los derechos reservados.
              </p>
              <p className="text-white/50 text-xs mt-1">Sistema de talleres y puntos de emisión</p>
            </div>
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

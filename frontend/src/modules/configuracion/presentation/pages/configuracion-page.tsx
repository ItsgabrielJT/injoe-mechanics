"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle, FileText, Lock, Settings, Shield, Upload } from "lucide-react";
import { useSesionContext } from "@/modules/acceso/presentation/state/sesion-context";
import type { EmpresaConfig, PuntoConfig, CertificadoInfo } from "@/modules/configuracion/domain/entities";
import {
  actualizarEmpresa,
  consultarCertificado,
  eliminarPunto,
  guardarPunto,
  guardarSriId,
  listarPuntos,
  obtenerEmpresa,
  subirCertificado,
} from "@/modules/configuracion/infrastructure/configuracion-api";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ApiError } from "@/shared/infrastructure/http/http-error";

export function ConfiguracionPage() {
  const { sesion } = useSesionContext();
  const token = sesion?.accessToken ?? "";
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);
  const [puntos, setPuntos] = useState<PuntoConfig[]>([]);
  const [certificado, setCertificado] = useState<CertificadoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [reemplazar, setReemplazar] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);
  const [puntoForm, setPuntoForm] = useState<Partial<PuntoConfig> | null>(null);
  const [eliminar, setEliminar] = useState<PuntoConfig | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [emp, pts] = await Promise.all([obtenerEmpresa(token), listarPuntos(token)]);
      setEmpresa(emp);
      setPuntos(pts);
      if (emp.sriId) setCertificado(await consultarCertificado(emp.sriId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la configuración");
    }
  }, [token]);

  useEffect(() => { void cargar(); }, [cargar]);

  async function guardarEmpresa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!empresa) return;
    setGuardando(true);
    try {
      const actualizada = await actualizarEmpresa(token, {
        nombre: empresa.nombre,
        ruc: empresa.ruc,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        correo: empresa.correo,
        entorno_sri: empresa.entornoSri,
      });
      setEmpresa(actualizada);
      setExito("Datos de empresa actualizados");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar la empresa");
    } finally {
      setGuardando(false);
    }
  }

  async function enviarCertificado() {
    if (!empresa || !archivo || !password) return;
    setGuardando(true);
    try {
      const sriId = await subirCertificado(archivo, password, empresa.ruc, empresa.nombre);
      const actualizada = await guardarSriId(token, sriId);
      setEmpresa(actualizada);
      setCertificado(await consultarCertificado(sriId));
      setExito("Certificado vinculado");
      setArchivo(null);
      setPassword("");
      setReemplazar(false);
      if (archivoRef.current) archivoRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el certificado");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarPuntoForm() {
    if (!puntoForm) return;
    setGuardando(true);
    try {
      await guardarPunto(token, {
        punto_emision: puntoForm.puntoEmision,
        codigo: puntoForm.codigo,
        direccion: puntoForm.direccion,
        info: puntoForm.info,
        factura_seq: Number(puntoForm.facturaSeq || 0),
        nota_credito_seq: Number(puntoForm.notaCreditoSeq || 0),
        nota_debito_seq: Number(puntoForm.notaDebitoSeq || 0),
        retencion_seq: Number(puntoForm.retencionSeq || 0),
        liquidacion_compra_seq: Number(puntoForm.liquidacionCompraSeq || 0),
        guia_remision_seq: Number(puntoForm.guiaRemisionSeq || 0),
      }, puntoForm.id);
      setPuntoForm(null);
      setExito("Punto de emisión guardado");
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el punto");
    } finally {
      setGuardando(false);
    }
  }

  if (!empresa) return <p className="text-sm text-muted-foreground">Cargando configuración...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Settings className="h-6 w-6 text-primary" /> Configuración</h1>
        <p className="text-sm text-muted-foreground">Datos de empresa, certificado SRI y secuenciales por punto de emisión.</p>
      </div>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {exito && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{exito}</div>}

      <form onSubmit={guardarEmpresa} className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Datos de la empresa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Razón social</Label><Input value={empresa.nombre} onChange={(e) => setEmpresa({ ...empresa, nombre: e.target.value })} /></div>
          <div><Label>RUC</Label><Input value={empresa.ruc} maxLength={13} onChange={(e) => setEmpresa({ ...empresa, ruc: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Dirección</Label><Input value={empresa.direccion} onChange={(e) => setEmpresa({ ...empresa, direccion: e.target.value })} /></div>
          <div><Label>Teléfono</Label><Input value={empresa.telefono ?? ""} onChange={(e) => setEmpresa({ ...empresa, telefono: e.target.value })} /></div>
          <div><Label>Correo</Label><Input value={empresa.correo ?? ""} onChange={(e) => setEmpresa({ ...empresa, correo: e.target.value })} /></div>
          <div>
            <Label>Entorno SRI</Label>
            <select className="flex h-10 w-full rounded-md border border-input px-3 text-sm bg-background" value={empresa.entornoSri} onChange={(e) => setEmpresa({ ...empresa, entornoSri: e.target.value })}>
              <option value="1">1 — Pruebas</option>
              <option value="2">2 — Producción</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Ese código (1 o 2) viaja al SRI al firmar. Las facturas ya enviadas conservan el ambiente con el que salieron.</p>
          </div>
        </div>
        <Button type="submit" disabled={guardando}>Guardar empresa</Button>
      </form>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> Certificado digital (.p12)</h2>
          <p className="text-sm text-muted-foreground">Sube tu certificado digital .p12 para firmar documentos electrónicamente.</p>
        </div>
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
          <input ref={archivoRef} type="file" accept=".p12" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          {certificado?.isActive && !archivo && !reemplazar ? (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
              <p className="text-sm text-muted-foreground">Ya tienes un certificado activo. Puedes subir uno nuevo para reemplazarlo.</p>
              <Button type="button" variant="outline" onClick={() => { setReemplazar(true); archivoRef.current?.click(); }}>Reemplazar certificado</Button>
              <p className="text-xs text-muted-foreground">Máximo 5MB · Solo archivos .p12</p>
            </>
          ) : archivo ? (
            <div className="space-y-3">
              <p className="font-medium">{archivo.name}</p>
              <div className="mx-auto max-w-md text-left space-y-2">
                <Label className="flex items-center gap-2"><Lock className="h-4 w-4" /> Contraseña del certificado</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña del .p12" />
              </div>
              <div className="flex justify-center gap-2">
                <Button type="button" disabled={guardando || !password} onClick={() => void enviarCertificado()}>{guardando ? "Subiendo..." : "Subir certificado"}</Button>
                <Button type="button" variant="outline" onClick={() => { setArchivo(null); setPassword(""); setReemplazar(false); if (archivoRef.current) archivoRef.current.value = ""; }}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Arrastra tu archivo .p12 o haz clic para seleccionarlo.</p>
              <Button type="button" variant="outline" onClick={() => archivoRef.current?.click()}>Seleccionar archivo</Button>
              <p className="text-xs text-muted-foreground">Máximo 5MB · Solo archivos .p12</p>
            </>
          )}
        </div>
        <div className="rounded-lg border px-4 py-3 text-sm flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p><strong>Importante:</strong> el certificado y su contraseña se envían de forma segura a SriSignXml. No se almacenan en Mechanics ni en el navegador.</p>
        </div>
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2"><Shield className="h-4 w-4" /> Estado del certificado</h3>
          {certificado?.isActive ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Certificado activo</p>
                    <p className="text-sm text-muted-foreground">RUC: {certificado.ruc}</p>
                    <p className="text-sm text-muted-foreground">Razón social: {certificado.razonSocial}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">Activo</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Fingerprint</p>
                  <p className="font-mono text-xs break-all">{certificado.fingerprint}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expira</p>
                  <p>{new Date(certificado.fechaExpiracion).toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                {certificado.creadoEn && (
                  <div>
                    <p className="text-muted-foreground">Creado</p>
                    <p>{new Date(certificado.creadoEn).toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Sin certificado</p>
                  <p className="text-sm text-muted-foreground">{empresa.sriId ? `Hay un sri_id local (${empresa.sriId}) pero no se pudo consultar SriSignXml.` : "No se ha subido ningún certificado digital."}</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">Pendiente</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Puntos de emisión</h2>
          <Button variant="outline" onClick={() => setPuntoForm({ codigo: "001", puntoEmision: "001", direccion: empresa.direccion, facturaSeq: 0, notaCreditoSeq: 0, notaDebitoSeq: 0, retencionSeq: 0, liquidacionCompraSeq: 0, guiaRemisionSeq: 0 })}>Nuevo punto</Button>
        </div>
        <div className="space-y-2">
          {puntos.map((punto) => (
            <div key={punto.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{punto.codigo}-{punto.puntoEmision}</p>
                <p className="text-muted-foreground">{punto.direccion} · factura_seq {punto.facturaSeq}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPuntoForm(punto)}>Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => setEliminar(punto)}>Eliminar</Button>
              </div>
            </div>
          ))}
        </div>
        {puntoForm && (
          <div className="grid gap-3 sm:grid-cols-3 border-t pt-4">
            <div><Label>Establecimiento</Label><Input value={puntoForm.codigo ?? ""} onChange={(e) => setPuntoForm({ ...puntoForm, codigo: e.target.value })} /></div>
            <div><Label>Punto</Label><Input value={puntoForm.puntoEmision ?? ""} onChange={(e) => setPuntoForm({ ...puntoForm, puntoEmision: e.target.value })} /></div>
            <div><Label>Dirección</Label><Input value={puntoForm.direccion ?? ""} onChange={(e) => setPuntoForm({ ...puntoForm, direccion: e.target.value })} /></div>
            <div><Label>Secuencial factura</Label><Input type="number" value={puntoForm.facturaSeq ?? 0} onChange={(e) => setPuntoForm({ ...puntoForm, facturaSeq: Number(e.target.value) })} /></div>
            <div className="sm:col-span-3 flex gap-2">
              <Button type="button" disabled={guardando} onClick={() => void guardarPuntoForm()}>Guardar punto</Button>
              <Button type="button" variant="ghost" onClick={() => setPuntoForm(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(eliminar)}
        title="Eliminar punto"
        description={eliminar ? `¿Eliminar ${eliminar.codigo}-${eliminar.puntoEmision}?` : ""}
        onClose={() => setEliminar(null)}
        onConfirm={async () => {
          if (!eliminar) return;
          try {
            await eliminarPunto(token, eliminar.id);
            setEliminar(null);
            await cargar();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo eliminar");
            setEliminar(null);
          }
        }}
      />
    </div>
  );
}

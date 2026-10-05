export type CodigoAmbienteSri = "1" | "2";

const PRODUCCION = new Set(["2", "produccion", "producción", "production", "prod"]);
const PRUEBAS = new Set(["1", "pruebas", "prueba", "test", "testing", "dev"]);

export function normalizarEntornoSri(valor?: string | number | null): CodigoAmbienteSri | null {
  if (valor == null) return null;
  const texto = String(valor).trim().toLowerCase();
  if (!texto) return null;
  if (PRODUCCION.has(texto)) return "2";
  if (PRUEBAS.has(texto)) return "1";
  return null;
}

export function codigoAmbienteClave(claveAcceso?: string | null): CodigoAmbienteSri | null {
  const clave = (claveAcceso || "").trim();
  const codigo = clave.length >= 24 ? clave[23] : "";
  return codigo === "1" || codigo === "2" ? codigo : null;
}

export function codigoAmbienteXml(xmlContent?: string | null): CodigoAmbienteSri | null {
  if (!xmlContent) return null;
  const match = xmlContent.match(/<ambiente>\s*([12])\s*<\/ambiente>/i);
  return match?.[1] === "1" || match?.[1] === "2" ? match[1] : null;
}

export function codigoAmbienteComprobante(opts: {
  claveAcceso?: string | null;
  xmlContent?: string | null;
  fallback?: string | number | null;
}): CodigoAmbienteSri {
  return (
    codigoAmbienteClave(opts.claveAcceso)
    || codigoAmbienteXml(opts.xmlContent)
    || normalizarEntornoSri(opts.fallback)
    || "1"
  );
}

export function etiquetaAmbienteSri(codigo?: string | null): string {
  return codigo === "2" ? "PRODUCCIÓN (2)" : "PRUEBAS (1)";
}

export function etiquetaAmbienteComprobante(opts: {
  claveAcceso?: string | null;
  xmlContent?: string | null;
  fallback?: string | number | null;
}): string {
  return etiquetaAmbienteSri(codigoAmbienteComprobante(opts));
}

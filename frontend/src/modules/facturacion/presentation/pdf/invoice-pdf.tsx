"use client";

import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import JsBarcode from "jsbarcode";
import { env } from "@/config/env";
import type { Factura } from "@/modules/facturacion/domain/entities";
import type { TipoImpuesto } from "@/modules/inventario/domain/entities";

const LOGO_SISTEMA = "/logos/logo_injoe_web.png";

export interface DatosRide {
  nombre: string;
  ruc: string;
  direccion: string;
  direccionSucursal?: string;
  telefono?: string | null;
  correo?: string | null;
  entornoSri?: string;
  logoUrl?: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 16, fontSize: 8, fontFamily: "Helvetica", color: "#000" },
  top: { flexDirection: "row", marginBottom: 8 },
  left: {
    width: "49%",
    borderWidth: 1,
    borderColor: "#000",
    padding: 8,
    minHeight: 210,
  },
  right: {
    width: "49%",
    marginLeft: "2%",
    borderWidth: 1,
    borderColor: "#000",
    padding: 8,
    minHeight: 210,
  },
  logoBox: { height: 52, marginBottom: 6, justifyContent: "flex-start" },
  logo: { width: 110, height: 48, objectFit: "contain" },
  company: { fontSize: 10, fontWeight: "bold", marginBottom: 4, textTransform: "uppercase" },
  info: { fontSize: 7, marginBottom: 2, lineHeight: 1.35 },
  title: { fontSize: 14, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: "42%", fontWeight: "bold", fontSize: 7 },
  value: { width: "58%", fontSize: 7 },
  authLabel: { fontWeight: "bold", fontSize: 7, marginBottom: 1 },
  authValue: { fontSize: 7, marginBottom: 4 },
  barcodeBox: { marginTop: 6, alignItems: "center" },
  barcode: { width: "100%", height: 52, objectFit: "fill" },
  barcodeLabel: { fontSize: 6, marginBottom: 3 },
  barcodeText: { fontSize: 6, fontFamily: "Courier", marginTop: 3, letterSpacing: 0.4 },
  box: { borderWidth: 1, borderColor: "#000", padding: 6, marginBottom: 8 },
  clientRow: { flexDirection: "row", marginBottom: 3, fontSize: 7 },
  clientLabel: { width: 150, fontWeight: "bold" },
  clientValue: { flex: 1 },
  table: { borderWidth: 1, borderColor: "#000", marginBottom: 8 },
  thead: { flexDirection: "row", backgroundColor: "#F0F0F0", borderBottomWidth: 1, paddingVertical: 3, paddingHorizontal: 2 },
  th: { fontSize: 6, fontWeight: "bold", textAlign: "center" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#CCC", paddingVertical: 3, paddingHorizontal: 2 },
  td: { fontSize: 6, paddingHorizontal: 1 },
  tdRight: { fontSize: 6, textAlign: "right", paddingHorizontal: 1 },
  bottom: { flexDirection: "row" },
  pay: { width: "38%", borderWidth: 1, borderColor: "#000", padding: 6 },
  totals: { width: "60%", marginLeft: "2%", borderWidth: 1, borderColor: "#000", padding: 6 },
  sectionTitle: { fontSize: 8, fontWeight: "bold", marginBottom: 4 },
  totRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2, fontSize: 7 },
  grand: { marginTop: 4, paddingTop: 4, borderTopWidth: 1, fontWeight: "bold", fontSize: 8 },
  note: { fontSize: 6, fontStyle: "italic", marginTop: 3 },
});

const cols = {
  codigo: "12%",
  descripcion: "28%",
  unidad: "12%",
  cantidad: "8%",
  iva: "8%",
  unitario: "12%",
  desc: "10%",
  total: "10%",
};

function dinero(valor: number): string {
  return Number(valor || 0).toFixed(2);
}

function etiquetaIva(tipo: TipoImpuesto): string {
  if (tipo === "15") return "15.00%";
  if (tipo === "5") return "5.00%";
  return "0.00%";
}

function ambiente(entorno?: string): string {
  return entorno === "2" ? "PRODUCCIÓN" : "PRUEBAS";
}

function fechaCorta(valor?: string | null): string {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString("es-EC");
}

function fechaHora(valor?: string | null): string {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function partirClave(valor: string, tamano = 28): string {
  if (!valor) return "-";
  const partes: string[] = [];
  for (let i = 0; i < valor.length; i += tamano) {
    partes.push(valor.slice(i, i + tamano));
  }
  return partes.join("\n");
}

function barcodeDataUrl(valor: string): string | null {
  if (!valor || typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, valor, {
      format: "CODE128",
      displayValue: false,
      height: 80,
      width: 1.8,
      margin: 0,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function imagenDataUrl(src: string): Promise<string | null> {
  try {
    const resp = await fetch(src);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function InvoicePDFDocument({
  factura,
  empresa,
  logo,
}: {
  factura: Factura;
  empresa: DatosRide;
  logo: string;
}) {
  const esBorrador = factura.estado === "BORRADOR";
  const clave = factura.claveAcceso || factura.numeroAutorizacion || "";
  const barcode = !esBorrador && clave ? barcodeDataUrl(clave) : null;
  const receptor = factura.tipoReceptor === "consumidor_final"
    ? { nombre: "CONSUMIDOR FINAL", ident: "9999999999999", correo: "", direccion: "", telefono: "" }
    : {
      nombre: factura.clienteNombres || "-",
      ident: factura.clienteIdentificacion || "-",
      correo: factura.clienteCorreo || "",
      direccion: factura.clienteDireccion || "",
      telefono: factura.clienteTelefono || "",
    };
  const subtotalSinImpuestos = factura.subtotal15 + factura.subtotal5 + factura.subtotal0 + factura.subtotalObjeto + factura.subtotalExento;
  const adicionales = [
    ["Contactanos", [empresa.telefono, empresa.correo].filter(Boolean).join(" - ") || "-"],
    ["Correo Cliente", receptor.correo || "-"],
    ["RUC Proveedor", env.pdfRucProveedor || "-"],
    ["Teléfonos Cliente", receptor.telefono || "-"],
    ["Notas", factura.notas],
    ["Términos", factura.terminos],
  ].filter(([, valor]) => Boolean(valor));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View style={styles.left}>
            <View style={styles.logoBox}>
              <Image src={logo} style={styles.logo} />
            </View>
            <Text style={styles.company}>{empresa.nombre}</Text>
            <Text style={styles.info}>Dirección Matriz: {empresa.direccion}</Text>
            <Text style={styles.info}>Dirección Sucursal: {empresa.direccionSucursal || empresa.direccion}</Text>
            <Text style={styles.info}>Obligado a llevar Contabilidad: SI</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.title}>{esBorrador ? "PROFORMA" : "FACTURA"}</Text>
            <View style={styles.row}><Text style={styles.label}>R.U.C.:</Text><Text style={styles.value}>{empresa.ruc}</Text></View>
            <View style={styles.row}><Text style={styles.label}>No.:</Text><Text style={styles.value}>{factura.numero}</Text></View>
            <Text style={styles.authLabel}>Número de Autorización:</Text>
            <Text style={styles.authValue}>{partirClave(clave)}</Text>
            <Text style={styles.authLabel}>Fecha y Hora de Autorización:</Text>
            <Text style={styles.authValue}>{fechaHora(factura.fechaAutorizacion) || "-"}</Text>
            <View style={styles.row}><Text style={styles.label}>Ambiente:</Text><Text style={styles.value}>{ambiente(empresa.entornoSri)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Emisión:</Text><Text style={styles.value}>NORMAL</Text></View>
            <View style={styles.barcodeBox}>
              <Text style={styles.barcodeLabel}>Clave de Acceso</Text>
              {barcode ? <Image src={barcode} style={styles.barcode} /> : null}
              <Text style={styles.barcodeText}>{clave || "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.box}>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Razón Social / Nombres y Apellidos:</Text>
            <Text style={styles.clientValue}>{receptor.nombre}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Identificación:</Text>
            <Text style={styles.clientValue}>{receptor.ident}</Text>
            <Text style={[styles.clientLabel, { width: 50 }]}>Fecha:</Text>
            <Text style={styles.clientValue}>{fechaCorta(factura.fechaEmision)}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Placa / Matrícula:</Text>
            <Text style={styles.clientValue} />
            <Text style={[styles.clientLabel, { width: 50 }]}>Guía:</Text>
            <Text style={styles.clientValue} />
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Dirección:</Text>
            <Text style={styles.clientValue}>{receptor.direccion || "-"}</Text>
          </View>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Teléfono:</Text>
            <Text style={styles.clientValue}>{receptor.telefono || "-"}</Text>
            <Text style={[styles.clientLabel, { width: 50 }]}>Email:</Text>
            <Text style={styles.clientValue}>{receptor.correo || "-"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: cols.codigo }]}>Cod. Principal</Text>
            <Text style={[styles.th, { width: cols.descripcion }]}>Descripción</Text>
            <Text style={[styles.th, { width: cols.unidad }]}>Unidad Medida</Text>
            <Text style={[styles.th, { width: cols.cantidad }]}>Cantidad</Text>
            <Text style={[styles.th, { width: cols.iva }]}>IVA</Text>
            <Text style={[styles.th, { width: cols.unitario }]}>Precio Unitario</Text>
            <Text style={[styles.th, { width: cols.desc }]}>Descuento</Text>
            <Text style={[styles.th, { width: cols.total }]}>Precio Total</Text>
          </View>
          {factura.items.map((item) => (
            <View key={item.id} style={styles.tr}>
              <Text style={[styles.td, { width: cols.codigo }]}>{item.codigo || "-"}</Text>
              <Text style={[styles.td, { width: cols.descripcion }]}>{item.descripcion}</Text>
              <Text style={[styles.td, { width: cols.unidad }]}>UNIDAD</Text>
              <Text style={[styles.tdRight, { width: cols.cantidad }]}>{dinero(item.cantidad)}</Text>
              <Text style={[styles.tdRight, { width: cols.iva }]}>{etiquetaIva(item.tipoImpuesto)}</Text>
              <Text style={[styles.tdRight, { width: cols.unitario }]}>{dinero(item.precioUnitario)}</Text>
              <Text style={[styles.tdRight, { width: cols.desc }]}>{dinero(item.descuentoPorcentaje)}%</Text>
              <Text style={[styles.tdRight, { width: cols.total }]}>{dinero(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottom}>
          <View style={styles.pay}>
            <Text style={styles.sectionTitle}>Forma de pago</Text>
            <View style={styles.totRow}>
              <Text>{[factura.formaPagoSriCodigo, factura.formaPagoNombre].filter(Boolean).join(" - ") || "-"}</Text>
              <Text>${dinero(factura.total)}</Text>
            </View>
          </View>
          <View style={styles.totals}>
            <Text style={styles.sectionTitle}>Resumen de Totales e Impuestos</Text>
            <View style={styles.totRow}><Text>SUBTOTAL 15%:</Text><Text>${dinero(factura.subtotal15)}</Text></View>
            <View style={styles.totRow}><Text>SUBTOTAL 5%:</Text><Text>${dinero(factura.subtotal5)}</Text></View>
            <View style={styles.totRow}><Text>SUBTOTAL 0%:</Text><Text>${dinero(factura.subtotal0)}</Text></View>
            <View style={styles.totRow}><Text>SUBTOTAL no objeto de IVA:</Text><Text>${dinero(factura.subtotalObjeto)}</Text></View>
            <View style={styles.totRow}><Text>SUBTOTAL exento de IVA:</Text><Text>${dinero(factura.subtotalExento)}</Text></View>
            <View style={styles.totRow}><Text>SUBTOTAL sin impuestos:</Text><Text>${dinero(subtotalSinImpuestos)}</Text></View>
            <View style={styles.totRow}><Text>TOTAL Descuento:</Text><Text>${dinero(factura.descuento)}</Text></View>
            <View style={styles.totRow}><Text>ICE:</Text><Text>$0.00</Text></View>
            <View style={styles.totRow}><Text>IVA 15%:</Text><Text>${dinero(factura.iva15)}</Text></View>
            <View style={styles.totRow}><Text>IVA 5%:</Text><Text>${dinero(factura.iva5)}</Text></View>
            <View style={styles.totRow}><Text>Total Devolución IVA:</Text><Text>$0.00</Text></View>
            <View style={styles.totRow}><Text>IRBPNR:</Text><Text>$0.00</Text></View>
            <View style={styles.totRow}><Text>Propina:</Text><Text>$0.00</Text></View>
            <View style={[styles.totRow, styles.grand]}><Text>VALOR TOTAL:</Text><Text>${dinero(factura.total)}</Text></View>
            <View style={styles.totRow}><Text>VALOR TOTAL SIN SUBSIDIO:</Text><Text>$0.00</Text></View>
            <View style={styles.totRow}><Text>AHORRO POR SUBSIDIO:</Text><Text>$0.00</Text></View>
            <Text style={styles.note}>(Incluye IVA cuando corresponda)</Text>
          </View>
        </View>

        {adicionales.length > 0 && (
          <View style={[styles.box, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Información Adicional</Text>
            {adicionales.map(([etiqueta, valor]) => (
              <View key={etiqueta} style={styles.clientRow}>
                <Text style={styles.clientLabel}>{etiqueta}:</Text>
                <Text style={styles.clientValue}>{valor}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function descargarPdfFactura(factura: Factura, empresa: DatosRide) {
  const logoEmpresa = empresa.logoUrl ? await imagenDataUrl(empresa.logoUrl) : null;
  const logo = logoEmpresa ?? (await imagenDataUrl(LOGO_SISTEMA)) ?? LOGO_SISTEMA;
  const blob = await pdf(<InvoicePDFDocument factura={factura} empresa={empresa} logo={logo} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${factura.numero}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

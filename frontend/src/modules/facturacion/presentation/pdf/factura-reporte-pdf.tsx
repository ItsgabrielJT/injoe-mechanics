"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { etiquetaEstado, nombreCliente, type Factura, type TotalesFactura } from "@/modules/facturacion/domain/entities";

const styles = StyleSheet.create({
  page: { padding: 18, fontSize: 8, fontFamily: "Helvetica", color: "#111" },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  meta: { fontSize: 8, color: "#555", marginBottom: 10 },
  table: { borderWidth: 1, borderColor: "#222" },
  thead: { flexDirection: "row", backgroundColor: "#F0F0F0", borderBottomWidth: 1, paddingVertical: 4, paddingHorizontal: 3 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#999", paddingVertical: 3, paddingHorizontal: 3 },
  th: { fontSize: 6.5, fontWeight: "bold" },
  td: { fontSize: 7 },
  right: { textAlign: "right" },
  footer: { flexDirection: "row", backgroundColor: "#111", color: "#fff", paddingVertical: 4, paddingHorizontal: 3 },
});

const cols = {
  numero: "14%",
  cliente: "18%",
  id: "12%",
  estado: "11%",
  pago: "11%",
  subtotal: "8%",
  iva15: "8%",
  iva5: "8%",
  iva0: "5%",
  total: "5%",
};

function dinero(valor: number): string {
  return valor.toFixed(2);
}

interface Props {
  facturas: Factura[];
  totales: TotalesFactura;
  empresa: string;
  filtros: string;
}

export function FacturaReporteDocument({ facturas, totales, empresa, filtros }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Reporte de facturas — {empresa}</Text>
        <Text style={styles.meta}>{filtros} · {facturas.length} documentos · Generado {new Date().toLocaleString("es-EC")}</Text>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: cols.numero }]}>Número</Text>
            <Text style={[styles.th, { width: cols.cliente }]}>Cliente</Text>
            <Text style={[styles.th, { width: cols.id }]}>Identificación</Text>
            <Text style={[styles.th, { width: cols.estado }]}>Estado</Text>
            <Text style={[styles.th, { width: cols.pago }]}>Forma de pago</Text>
            <Text style={[styles.th, styles.right, { width: cols.subtotal }]}>Subtotal</Text>
            <Text style={[styles.th, styles.right, { width: cols.iva15 }]}>IVA 15%</Text>
            <Text style={[styles.th, styles.right, { width: cols.iva5 }]}>IVA 5%</Text>
            <Text style={[styles.th, styles.right, { width: cols.iva0 }]}>IVA 0%</Text>
            <Text style={[styles.th, styles.right, { width: cols.total }]}>Total</Text>
          </View>
          {facturas.map((factura) => (
            <View key={factura.id} style={styles.tr} wrap={false}>
              <Text style={[styles.td, { width: cols.numero }]}>{factura.numero}</Text>
              <Text style={[styles.td, { width: cols.cliente }]}>{nombreCliente(factura)}</Text>
              <Text style={[styles.td, { width: cols.id }]}>{factura.tipoReceptor === "consumidor_final" ? "9999999999999" : factura.clienteIdentificacion || "—"}</Text>
              <Text style={[styles.td, { width: cols.estado }]}>{etiquetaEstado(factura.estado)}</Text>
              <Text style={[styles.td, { width: cols.pago }]}>{factura.formaPagoNombre || "—"}</Text>
              <Text style={[styles.td, styles.right, { width: cols.subtotal }]}>{dinero(factura.subtotal)}</Text>
              <Text style={[styles.td, styles.right, { width: cols.iva15 }]}>{dinero(factura.iva15)}</Text>
              <Text style={[styles.td, styles.right, { width: cols.iva5 }]}>{dinero(factura.iva5)}</Text>
              <Text style={[styles.td, styles.right, { width: cols.iva0 }]}>{dinero(factura.iva0)}</Text>
              <Text style={[styles.td, styles.right, { width: cols.total }]}>{dinero(factura.total)}</Text>
            </View>
          ))}
          <View style={styles.footer}>
            <Text style={[styles.td, { width: "66%", color: "#fff" }]}>Total general ({totales.cantidad})</Text>
            <Text style={[styles.td, styles.right, { width: cols.subtotal, color: "#fff" }]}>{dinero(totales.subtotal)}</Text>
            <Text style={[styles.td, styles.right, { width: cols.iva15, color: "#fff" }]}>{dinero(totales.iva15)}</Text>
            <Text style={[styles.td, styles.right, { width: cols.iva5, color: "#fff" }]}>{dinero(totales.iva5)}</Text>
            <Text style={[styles.td, styles.right, { width: cols.iva0, color: "#fff" }]}>{dinero(totales.iva0)}</Text>
            <Text style={[styles.td, styles.right, { width: cols.total, color: "#fff" }]}>{dinero(totales.total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function blobReporteFacturas(props: Props): Promise<Blob> {
  return pdf(<FacturaReporteDocument {...props} />).toBlob();
}

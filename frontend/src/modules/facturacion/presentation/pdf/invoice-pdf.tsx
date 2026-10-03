"use client";

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import type { Factura } from "@/modules/facturacion/domain/entities";

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 8, fontFamily: "Helvetica" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  box: { borderWidth: 1, borderColor: "#000", padding: 8, marginBottom: 8 },
  title: { fontSize: 14, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
  bold: { fontWeight: "bold" },
  tableHeader: { flexDirection: "row", backgroundColor: "#F0F0F0", borderBottomWidth: 1, paddingVertical: 3 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ccc", paddingVertical: 2 },
  cell: { fontSize: 7, paddingHorizontal: 2 },
});

export function InvoicePDFDocument({
  factura,
  empresaNombre,
  empresaRuc,
  empresaDireccion,
}: {
  factura: Factura;
  empresaNombre: string;
  empresaRuc: string;
  empresaDireccion: string;
}) {
  const receptor = factura.tipoReceptor === "consumidor_final"
    ? { nombre: "CONSUMIDOR FINAL", ident: "9999999999999" }
    : { nombre: factura.clienteNombres || "-", ident: factura.clienteIdentificacion || "-" };
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.box}>
          <View style={styles.row}>
            <View>
              <Text style={styles.bold}>{empresaNombre}</Text>
              <Text>RUC: {empresaRuc}</Text>
              <Text>Dir. Matriz: {empresaDireccion}</Text>
              <Text>OBLIGADO A LLEVAR CONTABILIDAD: NO</Text>
            </View>
            <View>
              <Text style={styles.title}>{factura.estado === "BORRADOR" ? "PROFORMA" : "FACTURA"}</Text>
              <Text>No. {factura.numero}</Text>
              <Text>Clave: {factura.claveAcceso || "-"}</Text>
            </View>
          </View>
        </View>
        <View style={styles.box}>
          <Text>Razón social: {receptor.nombre}</Text>
          <Text>Identificación: {receptor.ident}</Text>
          <Text>Fecha: {factura.fechaEmision}</Text>
        </View>
        <View style={styles.box}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, { width: "10%" }]}>Cant</Text>
            <Text style={[styles.cell, { width: "50%" }]}>Descripción</Text>
            <Text style={[styles.cell, { width: "20%" }]}>P. Unit</Text>
            <Text style={[styles.cell, { width: "20%" }]}>Total</Text>
          </View>
          {factura.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.cell, { width: "10%" }]}>{item.cantidad}</Text>
              <Text style={[styles.cell, { width: "50%" }]}>{item.descripcion}</Text>
              <Text style={[styles.cell, { width: "20%" }]}>{item.precioUnitario.toFixed(2)}</Text>
              <Text style={[styles.cell, { width: "20%" }]}>{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.box}>
          <Text>SUBTOTAL 15%: {factura.subtotal15.toFixed(2)}</Text>
          <Text>SUBTOTAL 5%: {factura.subtotal5.toFixed(2)}</Text>
          <Text>SUBTOTAL 0%: {factura.subtotal0.toFixed(2)}</Text>
          <Text>IVA 15%: {factura.iva15.toFixed(2)}</Text>
          <Text>IVA 5%: {factura.iva5.toFixed(2)}</Text>
          <Text style={styles.bold}>TOTAL: {factura.total.toFixed(2)}</Text>
          <Text>Forma de pago: {factura.formaPagoNombre || "-"}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function descargarPdfFactura(factura: Factura, empresaNombre: string, empresaRuc: string, empresaDireccion: string) {
  const blob = await pdf(
    <InvoicePDFDocument factura={factura} empresaNombre={empresaNombre} empresaRuc={empresaRuc} empresaDireccion={empresaDireccion} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${factura.numero}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

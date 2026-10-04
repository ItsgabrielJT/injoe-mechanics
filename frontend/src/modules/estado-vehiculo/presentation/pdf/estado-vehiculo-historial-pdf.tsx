"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { fechaCorta, type EstadoVehiculo } from "@/modules/estado-vehiculo/domain/entities";

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 8, fontFamily: "Helvetica", color: "#111" },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  meta: { fontSize: 8, color: "#555", marginBottom: 8 },
  ficha: { borderWidth: 1, borderColor: "#222", padding: 8, marginBottom: 10 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: "22%", color: "#555" },
  value: { width: "28%" },
  ot: { marginTop: 8, borderWidth: 1, borderColor: "#222" },
  otHead: { backgroundColor: "#111", color: "#fff", padding: 5, flexDirection: "row", justifyContent: "space-between" },
  otMeta: { padding: 6, borderBottomWidth: 0.5, borderColor: "#999" },
  thead: { flexDirection: "row", backgroundColor: "#F0F0F0", paddingVertical: 3, paddingHorizontal: 4 },
  tr: { flexDirection: "row", borderTopWidth: 0.5, borderColor: "#ccc", paddingVertical: 3, paddingHorizontal: 4 },
  th: { fontSize: 6.5, fontWeight: "bold" },
  td: { fontSize: 7 },
  right: { textAlign: "right" },
  footer: { flexDirection: "row", backgroundColor: "#111", color: "#fff", paddingVertical: 3, paddingHorizontal: 4 },
});

function dinero(valor: number): string {
  return valor.toFixed(2);
}

interface Props {
  historial: EstadoVehiculo;
  empresa: string;
  filtros: string;
}

export function EstadoVehiculoHistorialDocument({ historial, empresa, filtros }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Historial de vehículo — {empresa}</Text>
        <Text style={styles.meta}>{filtros} · Generado {new Date().toLocaleString("es-EC")}</Text>
        <View style={styles.ficha}>
          <View style={styles.row}>
            <Text style={styles.label}>Placa</Text>
            <Text style={styles.value}>{historial.placa}</Text>
            <Text style={styles.label}>Marca / modelo</Text>
            <Text style={styles.value}>{[historial.marca, historial.modelo].filter(Boolean).join(" · ") || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Año / color</Text>
            <Text style={styles.value}>{[historial.anio, historial.color].filter(Boolean).join(" · ") || "—"}</Text>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{historial.clienteNombres}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cédula / RUC</Text>
            <Text style={styles.value}>{historial.clienteIdentificacion || "—"}</Text>
            <Text style={styles.label}>Órdenes</Text>
            <Text style={styles.value}>{historial.ordenesCount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Costo</Text>
            <Text style={styles.value}>{dinero(historial.totalCosto)}</Text>
            <Text style={styles.label}>Utilidad / total</Text>
            <Text style={styles.value}>{dinero(historial.totalUtilidad)} / {dinero(historial.total)}</Text>
          </View>
        </View>
        {historial.ordenes.map((orden) => (
          <View key={orden.id} style={styles.ot} wrap={false}>
            <View style={styles.otHead}>
              <Text>{orden.numero} · {orden.estado === "CERRADA" ? "Cerrada" : "En proceso"}</Text>
              <Text>{dinero(orden.total)}</Text>
            </View>
            <View style={styles.otMeta}>
              <Text>Técnico: {orden.tecnicoNombre || "—"} · Inicio: {fechaCorta(orden.fechaInicio)} · Entrega: {fechaCorta(orden.fechaEntrega)} · Km: {orden.kilometraje ?? "—"}</Text>
              {orden.notasGenerales ? <Text>Notas: {orden.notasGenerales}</Text> : null}
              {orden.notasTecnicas ? <Text>Notas técnicas: {orden.notasTecnicas}</Text> : null}
            </View>
            <View style={styles.thead}>
              <Text style={[styles.th, { width: "46%" }]}>Ítem</Text>
              <Text style={[styles.th, styles.right, { width: "10%" }]}>Cant.</Text>
              <Text style={[styles.th, styles.right, { width: "14%" }]}>Venta</Text>
              <Text style={[styles.th, styles.right, { width: "15%" }]}>Costo</Text>
              <Text style={[styles.th, styles.right, { width: "15%" }]}>Utilidad</Text>
            </View>
            {orden.items.map((item) => (
              <View key={item.id} style={styles.tr}>
                <Text style={[styles.td, { width: "46%" }]}>{item.descripcion}</Text>
                <Text style={[styles.td, styles.right, { width: "10%" }]}>{item.cantidad}</Text>
                <Text style={[styles.td, styles.right, { width: "14%" }]}>{dinero(item.total)}</Text>
                <Text style={[styles.td, styles.right, { width: "15%" }]}>{dinero(item.precioCompra * item.cantidad)}</Text>
                <Text style={[styles.td, styles.right, { width: "15%" }]}>{dinero(item.utilidad)}</Text>
              </View>
            ))}
            <View style={styles.footer}>
              <Text style={[styles.td, { width: "56%", color: "#fff" }]}>Totales de la orden</Text>
              <Text style={[styles.td, styles.right, { width: "14%", color: "#fff" }]}>{dinero(orden.total)}</Text>
              <Text style={[styles.td, styles.right, { width: "15%", color: "#fff" }]}>{dinero(orden.totalCosto)}</Text>
              <Text style={[styles.td, styles.right, { width: "15%", color: "#fff" }]}>{dinero(orden.totalUtilidad)}</Text>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function blobHistorialVehiculo(props: Props): Promise<Blob> {
  return pdf(<EstadoVehiculoHistorialDocument {...props} />).toBlob();
}

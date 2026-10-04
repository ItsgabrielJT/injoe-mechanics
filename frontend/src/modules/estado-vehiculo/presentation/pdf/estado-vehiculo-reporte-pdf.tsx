"use client";

import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { fechaCorta, type EstadoVehiculo, type TotalesEstadoVehiculo } from "@/modules/estado-vehiculo/domain/entities";

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
  placa: "10%",
  marca: "10%",
  modelo: "11%",
  cliente: "16%",
  id: "11%",
  ordenes: "7%",
  fecha: "11%",
  costo: "8%",
  utilidad: "8%",
  total: "8%",
};

function dinero(valor: number): string {
  return valor.toFixed(2);
}

interface Props {
  vehiculos: EstadoVehiculo[];
  totales: TotalesEstadoVehiculo;
  empresa: string;
  filtros: string;
}

export function EstadoVehiculoReporteDocument({ vehiculos, totales, empresa, filtros }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Estado de vehículo — {empresa}</Text>
        <Text style={styles.meta}>{filtros} · {vehiculos.length} vehículos · Generado {new Date().toLocaleString("es-EC")}</Text>
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, { width: cols.placa }]}>Placa</Text>
            <Text style={[styles.th, { width: cols.marca }]}>Marca</Text>
            <Text style={[styles.th, { width: cols.modelo }]}>Modelo</Text>
            <Text style={[styles.th, { width: cols.cliente }]}>Cliente</Text>
            <Text style={[styles.th, { width: cols.id }]}>Cédula</Text>
            <Text style={[styles.th, styles.right, { width: cols.ordenes }]}>OT</Text>
            <Text style={[styles.th, { width: cols.fecha }]}>Última OT</Text>
            <Text style={[styles.th, styles.right, { width: cols.costo }]}>Costo</Text>
            <Text style={[styles.th, styles.right, { width: cols.utilidad }]}>Utilidad</Text>
            <Text style={[styles.th, styles.right, { width: cols.total }]}>Total</Text>
          </View>
          {vehiculos.map((vehiculo) => (
            <View key={vehiculo.vehiculoId} style={styles.tr} wrap={false}>
              <Text style={[styles.td, { width: cols.placa }]}>{vehiculo.placa}</Text>
              <Text style={[styles.td, { width: cols.marca }]}>{vehiculo.marca || "—"}</Text>
              <Text style={[styles.td, { width: cols.modelo }]}>{vehiculo.modelo || "—"}</Text>
              <Text style={[styles.td, { width: cols.cliente }]}>{vehiculo.clienteNombres}</Text>
              <Text style={[styles.td, { width: cols.id }]}>{vehiculo.clienteIdentificacion || "—"}</Text>
              <Text style={[styles.td, styles.right, { width: cols.ordenes }]}>{vehiculo.ordenesCount}</Text>
              <Text style={[styles.td, { width: cols.fecha }]}>{fechaCorta(vehiculo.ultimaFecha)}</Text>
              <Text style={[styles.td, styles.right, { width: cols.costo }]}>{dinero(vehiculo.totalCosto)}</Text>
              <Text style={[styles.td, styles.right, { width: cols.utilidad }]}>{dinero(vehiculo.totalUtilidad)}</Text>
              <Text style={[styles.td, styles.right, { width: cols.total }]}>{dinero(vehiculo.total)}</Text>
            </View>
          ))}
          <View style={styles.footer}>
            <Text style={[styles.td, { width: "58%", color: "#fff" }]}>Total general ({totales.vehiculos} vehículos · {totales.ordenes} OT)</Text>
            <Text style={[styles.td, { width: cols.fecha, color: "#fff" }]} />
            <Text style={[styles.td, styles.right, { width: cols.costo, color: "#fff" }]}>{dinero(totales.totalCosto)}</Text>
            <Text style={[styles.td, styles.right, { width: cols.utilidad, color: "#fff" }]}>{dinero(totales.totalUtilidad)}</Text>
            <Text style={[styles.td, styles.right, { width: cols.total, color: "#fff" }]}>{dinero(totales.total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function blobReporteEstadoVehiculo(props: Props): Promise<Blob> {
  return pdf(<EstadoVehiculoReporteDocument {...props} />).toBlob();
}

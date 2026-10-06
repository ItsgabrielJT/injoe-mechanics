"use client";

import { Circle, Document, Image, Page, Path, StyleSheet, Svg, Text, View, pdf } from "@react-pdf/renderer";
import { LOGO_SISTEMA } from "@/shared/lib/brand";
import type { DatosTallerPdf } from "@/modules/ordenes-trabajo/presentation/pdf/orden-trabajo-pdf";

const GUIA =
  "Guía de kilometraje: revisión y cambio de aceite cada 10.000 km – servicio mayor cada 20.000 km – bujías y banda cerca de los 40.000 km";

const BLOQUES_IZQ: { titulo: string; icono: IconoCheck; items: string[] }[] = [
  {
    titulo: "MOTOR Y ACEITE",
    icono: "motor",
    items: [
      "Nivel y estado del aceite",
      "Filtro de aceite",
      "Filtro de aire",
      "Fugas de aceite",
      "Ruidos o vibraciones",
    ],
  },
  {
    titulo: "FRENOS",
    icono: "frenos",
    items: [
      "Balatas (desgaste)",
      "Discos / tambores",
      "Nivel de líquido de frenos",
      "Pedal firme (sin esponja)",
    ],
  },
  {
    titulo: "SUSPENSIÓN Y DIRECCIÓN",
    icono: "suspension",
    items: [
      "Amortiguadores",
      "Rótulas y terminales",
      "Bujes",
      "Alineación (no jala)",
    ],
  },
  {
    titulo: "LLANTAS",
    icono: "llanta",
    items: [
      "Profundidad de huella",
      "Presión (incluida refacción)",
      "Desgaste parejo",
      "Rotación",
    ],
  },
];

const BLOQUES_DER: { titulo: string; icono: IconoCheck; items: string[] }[] = [
  {
    titulo: "FLUIDOS",
    icono: "fluido",
    items: [
      "Refrigerante / anticongelante",
      "Líquido de transmisión",
      "Dirección hidráulica",
      "Limpia parabrisas",
    ],
  },
  {
    titulo: "BATERÍA Y ELÉCTRICO",
    icono: "bateria",
    items: [
      "Bornes limpios y apretados",
      "Carga de la batería",
      "Alternador",
    ],
  },
  {
    titulo: "LUCES",
    icono: "luces",
    items: [
      "Faros (alta y baja)",
      "Cuartos y direccionales",
      "Stops y reversa",
    ],
  },
  {
    titulo: "AFINACIÓN",
    icono: "llave",
    items: [
      "Bujías",
      "Banda de distribución / accesorios",
      "Sensores",
      "Limpieza del sistema",
    ],
  },
];

type IconoCheck =
  | "motor"
  | "fluido"
  | "frenos"
  | "bateria"
  | "suspension"
  | "luces"
  | "llanta"
  | "llave"
  | "notas"
  | "alerta";

const styles = StyleSheet.create({
  page: {
    padding: 10,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#000",
    backgroundColor: "#fff",
    flexDirection: "column",
  },
  sheet: { width: "100%", flexGrow: 1, flexDirection: "column" },
  header: { flexDirection: "row", width: "100%", borderWidth: 1.2, borderColor: "#000", marginBottom: 6 },
  logoCol: { width: 86, borderRightWidth: 1.2, borderRightColor: "#000", padding: 6, alignItems: "center", justifyContent: "center" },
  logo: { width: 70, height: 40, objectFit: "contain" },
  companyCol: { flex: 1, padding: 8, justifyContent: "center", borderRightWidth: 1.2, borderRightColor: "#000" },
  company: { fontSize: 13, fontWeight: "bold", textTransform: "uppercase" },
  companySub: { fontSize: 8, marginTop: 2 },
  titleCol: { width: 168, padding: 8, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 11, fontWeight: "bold", textAlign: "left", marginLeft: 6 },
  info: { width: "100%", borderWidth: 1.2, borderColor: "#000", padding: 8, marginBottom: 6 },
  infoRow: { flexDirection: "row", marginBottom: 5 },
  campo: { flexDirection: "row", alignItems: "flex-end", flex: 1, marginRight: 8 },
  label: { fontWeight: "bold", fontSize: 9, marginRight: 4 },
  line: { flex: 1, borderBottomWidth: 0.8, borderBottomColor: "#000", minHeight: 12 },
  cols: { flexDirection: "row", width: "100%", flexGrow: 1, marginBottom: 6 },
  col: { width: "50%", flexDirection: "column" },
  colLeft: { paddingRight: 4 },
  colRight: { paddingLeft: 4 },
  bloque: { borderWidth: 1.2, borderColor: "#000", marginBottom: 5, flexGrow: 1 },
  bloqueHead: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1.2, borderBottomColor: "#000", paddingVertical: 4, paddingHorizontal: 6 },
  bloqueTitulo: { fontSize: 9, fontWeight: "bold", marginLeft: 5 },
  item: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 6, paddingVertical: 3 },
  box: { width: 9, height: 9, borderWidth: 1, borderColor: "#000", marginRight: 6, marginBottom: 1 },
  itemTxt: { flex: 1, fontSize: 8.5, borderBottomWidth: 0.5, borderBottomColor: "#000", paddingBottom: 1 },
  notas: { width: "100%", borderWidth: 1.2, borderColor: "#000", marginBottom: 5 },
  notasHead: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1.2, borderBottomColor: "#000", paddingVertical: 4, paddingHorizontal: 6 },
  ruled: { borderBottomWidth: 0.5, borderBottomColor: "#000", minHeight: 14, marginHorizontal: 8 },
  notaBox: { width: "100%", borderWidth: 1.2, borderColor: "#000", padding: 6, marginBottom: 4, flexDirection: "row", alignItems: "flex-start" },
  guia: { fontSize: 7, textAlign: "center", color: "#000" },
});

function Icono({ tipo, size = 14 }: { tipo: IconoCheck; size?: number }) {
  const s = 1.2;
  if (tipo === "motor") {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path d="M4 10 H7 V8 H11 V10 H14 V13 H17 V10 H20 V16 H17 V18 H14 V16 H11 V18 H7 V16 H4 Z" stroke="#000" strokeWidth={s} fill="none" />
        <Path d="M9 8 V5 H13 V8" stroke="#000" strokeWidth={s} fill="none" />
      </Svg>
    );
  }
  if (tipo === "fluido") {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path d="M12 3 C12 3 6 11 6 15 A6 6 0 0 0 18 15 C18 11 12 3 12 3 Z" stroke="#000" strokeWidth={s} fill="none" />
      </Svg>
    );
  }
  if (tipo === "frenos") {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Circle cx="12" cy="12" r="8" stroke="#000" strokeWidth={s} fill="none" />
        <Circle cx="12" cy="12" r="3" stroke="#000" strokeWidth={s} fill="none" />
        <Path d="M12 4 L13 7 M20 12 L17 13 M12 20 L11 17 M4 12 L7 11" stroke="#000" strokeWidth={s} fill="none" />
      </Svg>
    );
  }
  if (tipo === "bateria") {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path d="M5 8 H19 V18 H5 Z" stroke="#000" strokeWidth={s} fill="none" />
        <Path d="M8 8 V6 H11 V8 M13 8 V6 H16 V8" stroke="#000" strokeWidth={s} fill="none" />
        <Path d="M8 13 H11 M9.5 11.5 V14.5 M14 13 H17" stroke="#000" strokeWidth={s} fill="none" />
      </Svg>
    );
  }
  if (tipo === "suspension") {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path d="M12 3 V7 M9 7 H15 M10 7 L14 9 L10 11 L14 13 L10 15 L14 17 M9 17 H15 M12 17 V21" stroke="#000" strokeWidth={s} fill="none" />
      </Svg>
    );
  }
  if (tipo === "luces") {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path d="M14 6 C10 6 8 9 8 12 C8 15 10 18 14 18" stroke="#000" strokeWidth={s} fill="none" />
        <Path d="M16 8 H21 M16 12 H21 M16 16 H21" stroke="#000" strokeWidth={s} fill="none" />
      </Svg>
    );
  }
  if (tipo === "llanta") {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Circle cx="12" cy="12" r="8" stroke="#000" strokeWidth={s} fill="none" />
        <Circle cx="12" cy="12" r="3" stroke="#000" strokeWidth={s} fill="none" />
        <Path d="M12 4 V9 M12 15 V20 M4 12 H9 M15 12 H20" stroke="#000" strokeWidth={s} fill="none" />
      </Svg>
    );
  }
  if (tipo === "llave") {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path d="M8 8 A4 4 0 1 0 12 12 L20 20 L22 18 L14 10" stroke="#000" strokeWidth={s} fill="none" />
        <Circle cx="8" cy="8" r="1.4" stroke="#000" strokeWidth={s} fill="none" />
      </Svg>
    );
  }
  if (tipo === "notas") {
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path d="M7 4 H17 V20 H7 Z" stroke="#000" strokeWidth={s} fill="none" />
        <Path d="M9 4 V2 H15 V4 M9 9 H15 M9 13 H15 M9 17 H13" stroke="#000" strokeWidth={s} fill="none" />
      </Svg>
    );
  }
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="12" cy="12" r="9" stroke="#000" strokeWidth={s} fill="none" />
      <Path d="M12 7 V13 M12 16.5 V17.5" stroke="#000" strokeWidth={s} fill="none" />
    </Svg>
  );
}

function Campo({ etiqueta }: { etiqueta: string }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{etiqueta}</Text>
      <View style={styles.line} />
    </View>
  );
}

function Bloque({ titulo, icono, items }: { titulo: string; icono: IconoCheck; items: string[] }) {
  return (
    <View style={styles.bloque} wrap={false}>
      <View style={styles.bloqueHead}>
        <Icono tipo={icono} />
        <Text style={styles.bloqueTitulo}>{titulo}</Text>
      </View>
      {items.map((item) => (
        <View key={item} style={styles.item}>
          <View style={styles.box} />
          <Text style={styles.itemTxt}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ChecklistMantenimientoDocument({ empresa, logo }: { empresa: DatosTallerPdf; logo: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.logoCol}>
              <Image src={logo} style={styles.logo} />
            </View>
            <View style={styles.companyCol}>
              <Text style={styles.company}>{empresa.nombre}</Text>
              <Text style={styles.companySub}>Taller automotriz / centro de mantenimiento</Text>
              {empresa.telefono ? <Text style={styles.companySub}>Tel. {empresa.telefono}</Text> : null}
              {empresa.direccion ? <Text style={styles.companySub}>{empresa.direccion}</Text> : null}
            </View>
            <View style={styles.titleCol}>
              <Icono tipo="llave" size={22} />
              <Text style={styles.title}>CHECKLIST DE{"\n"}MANTENIMIENTO</Text>
            </View>
          </View>

          <View style={styles.info}>
            <View style={styles.infoRow}>
              <Campo etiqueta="Cliente:" />
              <Campo etiqueta="Teléfono:" />
            </View>
            <View style={styles.infoRow}>
              <Campo etiqueta="Vehículo (marca / modelo / año):" />
              <Campo etiqueta="Placa:" />
            </View>
            <View style={[styles.infoRow, { marginBottom: 0 }]}>
              <Campo etiqueta="Kilometraje:" />
              <Campo etiqueta="Fecha:" />
              <Campo etiqueta="Mecánico:" />
            </View>
          </View>

          <View style={styles.cols}>
            <View style={[styles.col, styles.colLeft]}>
              {BLOQUES_IZQ.map((bloque) => (
                <Bloque key={bloque.titulo} {...bloque} />
              ))}
            </View>
            <View style={[styles.col, styles.colRight]}>
              {BLOQUES_DER.map((bloque) => (
                <Bloque key={bloque.titulo} {...bloque} />
              ))}
            </View>
          </View>

          <View style={styles.notas}>
            <View style={styles.notasHead}>
              <Icono tipo="notas" />
              <Text style={styles.bloqueTitulo}>OBSERVACIONES / PRÓXIMO SERVICIO</Text>
            </View>
            <View style={{ paddingVertical: 4 }}>
              {Array.from({ length: 4 }).map((_, i) => <View key={i} style={styles.ruled} />)}
            </View>
          </View>

          <View style={styles.notaBox}>
            <Icono tipo="alerta" />
            <Text style={[styles.label, { marginLeft: 6, marginRight: 6 }]}>NOTA:</Text>
            <View style={styles.line} />
          </View>

          <Text style={styles.guia}>{GUIA}</Text>
        </View>
      </Page>
    </Document>
  );
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

export async function descargarChecklistMantenimiento(empresa: DatosTallerPdf) {
  const propio = empresa.logoUrl ? await imagenDataUrl(empresa.logoUrl) : null;
  const logo = propio ?? (await imagenDataUrl(LOGO_SISTEMA)) ?? LOGO_SISTEMA;
  const blob = await pdf(<ChecklistMantenimientoDocument empresa={empresa} logo={logo} />).toBlob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "checklist-mantenimiento.pdf";
  enlace.click();
  URL.revokeObjectURL(url);
}

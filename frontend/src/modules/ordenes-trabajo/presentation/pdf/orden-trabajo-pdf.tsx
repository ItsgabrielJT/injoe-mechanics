"use client";

import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { LOGO_SISTEMA } from "@/shared/lib/brand";
import { formatoMoneda, type OrdenTrabajo } from "@/modules/ordenes-trabajo/domain/entities";

export interface DatosTallerPdf {
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  logoUrl?: string | null;
}

export type SiluetasOt = {
  frontal: string;
  posterior: string;
  superior: string;
  lateralIzq: string;
  lateralDer: string;
};

const VISTAS: { clave: keyof SiluetasOt; archivo: string; etiqueta: string }[] = [
  { clave: "frontal", archivo: "vista-frontal.png", etiqueta: "VISTA FRONTAL" },
  { clave: "posterior", archivo: "vista-posterior.png", etiqueta: "VISTA POSTERIOR" },
  { clave: "superior", archivo: "vista-superior.png", etiqueta: "VISTA SUPERIOR" },
  { clave: "lateralIzq", archivo: "vista-lateral-izq.png", etiqueta: "VISTA LATERAL IZQUIERDA" },
  { clave: "lateralDer", archivo: "vista-lateral-der.png", etiqueta: "VISTA LATERAL DERECHA" },
];

const DISCLAIMER =
  "El taller y sus empleados no se hacen responsables de objetos dejados dentro del vehículo que no hayan sido inventariados y entregados a la recepcionista. Autorice expresamente al CENTRO DE MANTENIMIENTO / TALLER AUTOMOTRIZ y a sus trabajadores para que realicen todos los trabajos de reparación, incluyendo mano de obra, repuestos y cualquier gestión adicional. En caso de demora en el retiro del auto, pasados 2 días habrá costo por parqueadero. El taller no da garantía por repuestos traídos por el cliente.";

const styles = StyleSheet.create({
  page: {
    padding: 8,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#000",
    backgroundColor: "#fff",
    flexDirection: "column",
  },
  sheet: { width: "100%", flexGrow: 1, flexDirection: "column" },
  header: { flexDirection: "row", width: "100%", borderWidth: 1.2, borderColor: "#000", marginBottom: 4 },
  logoCol: { width: 86, borderRightWidth: 1.2, borderRightColor: "#000", padding: 5, alignItems: "center", justifyContent: "center" },
  logo: { width: 72, height: 42, objectFit: "contain" },
  companyCol: { flex: 1, padding: 6, justifyContent: "center", borderRightWidth: 1.2, borderRightColor: "#000" },
  company: { fontSize: 14, fontWeight: "bold", textTransform: "uppercase" },
  companySub: { fontSize: 9, marginTop: 2 },
  titleCol: { width: 132, padding: 6, justifyContent: "center", alignItems: "center", borderRightWidth: 1.2, borderRightColor: "#000" },
  title: { fontSize: 14, fontWeight: "bold", textAlign: "center" },
  metaCol: { width: 152, padding: 6, justifyContent: "center" },
  metaRow: { flexDirection: "row", marginBottom: 4, alignItems: "flex-end" },
  metaLabel: { width: 78, fontWeight: "bold", fontSize: 9 },
  metaLine: { flex: 1, borderBottomWidth: 0.8, borderBottomColor: "#000", minHeight: 13, fontSize: 10 },
  clientRow: { flexDirection: "row", width: "100%", borderWidth: 1.2, borderColor: "#000", marginBottom: 4 },
  clientBox: { flex: 1.45, flexDirection: "row", padding: 7, borderRightWidth: 1.2, borderRightColor: "#000", alignItems: "flex-end" },
  phoneBox: { flex: 1, flexDirection: "row", padding: 7, alignItems: "flex-end" },
  fieldLabel: { fontWeight: "bold", fontSize: 10, marginRight: 4 },
  fieldValue: { flex: 1, borderBottomWidth: 0.8, borderBottomColor: "#000", minHeight: 13, fontSize: 10 },
  vehicle: { flexDirection: "row", width: "100%", borderWidth: 1.2, borderColor: "#000", marginBottom: 4 },
  vehicleCell: { flex: 1, padding: 6, borderRightWidth: 1.2, borderRightColor: "#000" },
  vehicleCellLast: { flex: 1, padding: 6 },
  vehicleHead: { fontSize: 9, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  vehicleVal: { fontSize: 10, textAlign: "center", minHeight: 14 },
  section: { width: "100%", borderWidth: 1.2, borderColor: "#000", marginBottom: 4 },
  sectionHead: { borderBottomWidth: 1.2, borderBottomColor: "#000", paddingVertical: 5, paddingHorizontal: 6 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", textAlign: "center" },
  sectionBody: { padding: 6 },
  cars: { flexDirection: "row", width: "100%", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-end" },
  car: { width: "19%", alignItems: "center" },
  carImg: { width: "100%", height: 58, objectFit: "contain" },
  carLabel: { fontSize: 6.5, marginTop: 3, textAlign: "center" },
  notaRow: { flexDirection: "row", alignItems: "flex-start" },
  ruled: { borderBottomWidth: 0.6, borderBottomColor: "#000", minHeight: 15, marginBottom: 1 },
  split: { flexDirection: "row", width: "100%", borderWidth: 1.2, borderColor: "#000", marginBottom: 4, flexGrow: 1 },
  splitLeft: { width: "50%", borderRightWidth: 1.2, borderRightColor: "#000", flexDirection: "column" },
  splitRight: { width: "50%", flexDirection: "column" },
  splitHead: { borderBottomWidth: 1.2, borderBottomColor: "#000", paddingVertical: 5, paddingHorizontal: 4 },
  lista: { flexGrow: 1, flexDirection: "column" },
  itemLine: { fontSize: 9, paddingHorizontal: 6, paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#000", minHeight: 15 },
  extraLine: { flexGrow: 1, borderBottomWidth: 0.5, borderBottomColor: "#000" },
  disclaimer: { fontSize: 7, lineHeight: 1.35, marginBottom: 4, textAlign: "justify", width: "100%" },
  footer: { flexDirection: "row", width: "100%", borderWidth: 1.2, borderColor: "#000" },
  footCell: { padding: 5, borderRightWidth: 1.2, borderRightColor: "#000" },
  footLast: { padding: 5 },
  footTitle: { fontSize: 7.5, fontWeight: "bold", textAlign: "center", marginBottom: 4 },
  signLine: { borderBottomWidth: 0.8, borderBottomColor: "#000", minHeight: 24, marginTop: 12 },
  payRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, fontSize: 9 },
  box: { width: 9, height: 9, borderWidth: 1, borderColor: "#000", marginRight: 5 },
  totRow: { flexDirection: "row", marginBottom: 4, fontSize: 9 },
});

function fechaHoja(valor?: string | null): string {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "short",
  }).format(fecha);
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

function Lineas({ cantidad, texto }: { cantidad: number; texto?: string }) {
  return (
    <View>
      {Array.from({ length: cantidad }).map((_, indice) => (
        <View key={indice} style={styles.ruled}>
          {indice === 0 && texto ? <Text>{texto}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function ListaConLineas({ lineas }: { lineas: string[] }) {
  const extras = Math.max(10, 16 - lineas.length);
  return (
    <View style={styles.lista}>
      {lineas.map((linea, indice) => (
        <Text key={`${linea}-${indice}`} style={styles.itemLine}>{linea}</Text>
      ))}
      {Array.from({ length: extras }).map((_, indice) => (
        <View key={`extra-${indice}`} style={styles.extraLine} />
      ))}
    </View>
  );
}

export function OrdenTrabajoPdfDocument({
  orden,
  empresa,
  logo,
  siluetas,
  celular,
  modo,
}: {
  orden: OrdenTrabajo | null;
  empresa: DatosTallerPdf;
  logo: string;
  siluetas: SiluetasOt;
  celular: string;
  modo: "lleno" | "formato";
}) {
  const datos = modo === "lleno" ? orden : null;
  const trabajos = (datos?.items ?? [])
    .filter((item) => item.servicioId)
    .map((item) => `${item.cantidad}  ${item.descripcion}`);
  const repuestos = (datos?.items ?? [])
    .filter((item) => item.productoId)
    .map((item) => `${item.cantidad}  ${item.descripcion}`);

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
              <Text style={styles.companySub}>Centro de mantenimiento / taller automotriz</Text>
              {empresa.telefono ? <Text style={styles.companySub}>Tel. {empresa.telefono}</Text> : null}
              {empresa.direccion ? <Text style={styles.companySub}>{empresa.direccion}</Text> : null}
            </View>
            <View style={styles.titleCol}>
              <Text style={styles.title}>ORDEN DE{"\n"}TRABAJO</Text>
            </View>
            <View style={styles.metaCol}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>N.°:</Text>
                <Text style={styles.metaLine}>{datos?.numero ?? ""}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Fecha ingreso:</Text>
                <Text style={styles.metaLine}>{fechaHoja(datos?.fechaInicio)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Fecha salida:</Text>
                <Text style={styles.metaLine}>{fechaHoja(datos?.fechaEntrega)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.clientRow}>
            <View style={styles.clientBox}>
              <Text style={styles.fieldLabel}>Nombre del cliente:</Text>
              <Text style={styles.fieldValue}>{datos?.clienteNombres ?? ""}</Text>
            </View>
            <View style={styles.phoneBox}>
              <Text style={styles.fieldLabel}>N.° celular:</Text>
              <Text style={styles.fieldValue}>{datos ? celular : ""}</Text>
            </View>
          </View>

          <View style={styles.vehicle}>
            <View style={styles.vehicleCell}>
              <Text style={styles.vehicleHead}>MARCA</Text>
              <Text style={styles.vehicleVal}>{datos?.vehiculoMarca ?? ""}</Text>
            </View>
            <View style={styles.vehicleCell}>
              <Text style={styles.vehicleHead}>MODELO</Text>
              <Text style={styles.vehicleVal}>{datos?.vehiculoModelo ?? ""}</Text>
            </View>
            <View style={styles.vehicleCell}>
              <Text style={styles.vehicleHead}>PLACA</Text>
              <Text style={styles.vehicleVal}>{datos?.vehiculoPlaca ?? ""}</Text>
            </View>
            <View style={styles.vehicleCellLast}>
              <Text style={styles.vehicleHead}>KM</Text>
              <Text style={styles.vehicleVal}>{datos?.kilometraje != null ? String(datos.kilometraje) : ""}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>OBSERVACIONES</Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.cars}>
                {VISTAS.map((vista) => (
                  <View key={vista.clave} style={styles.car}>
                    <Image src={siluetas[vista.clave]} style={styles.carImg} />
                    <Text style={styles.carLabel}>{vista.etiqueta}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.notaRow}>
                <Text style={styles.fieldLabel}>Nota:</Text>
                <View style={{ flex: 1 }}>
                  <Lineas cantidad={2} texto={datos?.notasGenerales ?? ""} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>DESCRIPCIÓN DE LA FALLA</Text>
            </View>
            <View style={styles.sectionBody}>
              <Lineas cantidad={5} texto={datos?.notasTecnicas ?? ""} />
            </View>
          </View>

          <View style={styles.split}>
            <View style={styles.splitLeft}>
              <View style={styles.splitHead}><Text style={styles.sectionTitle}>TRABAJOS REALIZADOS</Text></View>
              <ListaConLineas lineas={trabajos} />
            </View>
            <View style={styles.splitRight}>
              <View style={styles.splitHead}><Text style={styles.sectionTitle}>REPUESTOS SOLICITADOS</Text></View>
              <ListaConLineas lineas={repuestos} />
            </View>
          </View>

          <Text style={styles.disclaimer}>{DISCLAIMER}</Text>

          <View style={styles.footer}>
            <View style={[styles.footCell, { width: "18%" }]}>
              <Text style={styles.footTitle}>NOMBRE DEL TÉCNICO RESPONSABLE</Text>
              <Text style={{ fontSize: 9, marginTop: 8, textAlign: "center" }}>{datos?.tecnicoNombre ?? ""}</Text>
              <View style={styles.signLine} />
            </View>
            <View style={[styles.footCell, { width: "14%" }]}>
              <Text style={styles.footTitle}>FIRMA</Text>
              <View style={styles.signLine} />
            </View>
            <View style={[styles.footCell, { width: "22%" }]}>
              <Text style={styles.footTitle}>RECIBÍ CONFORME CLIENTE</Text>
              <View style={styles.signLine} />
              <View style={[styles.totRow, { marginTop: 6 }]}>
                <Text style={{ fontWeight: "bold" }}>CI: </Text>
                <Text>{datos?.clienteIdentificacion ?? ""}</Text>
              </View>
            </View>
            <View style={[styles.footCell, { width: "24%" }]}>
              <View style={styles.totRow}>
                <Text style={{ fontWeight: "bold", width: 82 }}>TOTAL A COBRAR:</Text>
                <Text>{datos ? formatoMoneda(datos.total) : ""}</Text>
              </View>
              <View style={styles.totRow}>
                <Text style={{ fontWeight: "bold", width: 82 }}>ABONO:</Text>
                <Text> </Text>
              </View>
              <View style={styles.totRow}>
                <Text style={{ fontWeight: "bold", width: 82 }}>SALDO:</Text>
                <Text> </Text>
              </View>
            </View>
            <View style={[styles.footLast, { width: "22%" }]}>
              <Text style={styles.footTitle}>FORMA DE PAGO</Text>
              <View style={styles.payRow}><View style={styles.box} /><Text>TRANSFERENCIA</Text></View>
              <View style={styles.payRow}><View style={styles.box} /><Text>EFECTIVO</Text></View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

async function logoEmpresa(empresa: DatosTallerPdf): Promise<string> {
  const propio = empresa.logoUrl ? await imagenDataUrl(empresa.logoUrl) : null;
  return propio ?? (await imagenDataUrl(LOGO_SISTEMA)) ?? LOGO_SISTEMA;
}

async function siluetasVehiculo(): Promise<SiluetasOt> {
  const cargadas = await Promise.all(
    VISTAS.map(async (vista) => {
      const src = `/ordenes-trabajo/${vista.archivo}`;
      return (await imagenDataUrl(src)) ?? src;
    }),
  );
  return {
    frontal: cargadas[0],
    posterior: cargadas[1],
    superior: cargadas[2],
    lateralIzq: cargadas[3],
    lateralDer: cargadas[4],
  };
}

function bajar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export async function descargarPdfOrdenTrabajo(
  orden: OrdenTrabajo,
  empresa: DatosTallerPdf,
  celular = "",
) {
  const [logo, siluetas] = await Promise.all([logoEmpresa(empresa), siluetasVehiculo()]);
  const blob = await pdf(
    <OrdenTrabajoPdfDocument
      orden={orden}
      empresa={empresa}
      logo={logo}
      siluetas={siluetas}
      celular={celular}
      modo="lleno"
    />,
  ).toBlob();
  bajar(blob, `${orden.numero}.pdf`);
}

export async function descargarFormatoOrdenTrabajo(empresa: DatosTallerPdf) {
  const [logo, siluetas] = await Promise.all([logoEmpresa(empresa), siluetasVehiculo()]);
  const blob = await pdf(
    <OrdenTrabajoPdfDocument
      orden={null}
      empresa={empresa}
      logo={logo}
      siluetas={siluetas}
      celular=""
      modo="formato"
    />,
  ).toBlob();
  bajar(blob, "formato-orden-trabajo.pdf");
}

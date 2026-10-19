import ExcelJS from "exceljs";
import { etiquetaEstado, nombreCliente, type Factura, type TotalesFactura } from "@/modules/facturacion/domain/entities";

interface Props {
  facturas: Factura[];
  totales: TotalesFactura;
  empresa: string;
  filtros: string;
}

const COLUMNAS = [
  { header: "Número", width: 20 },
  { header: "Cliente", width: 32 },
  { header: "Identificación", width: 16 },
  { header: "Estado", width: 14 },
  { header: "Emisión", width: 12 },
  { header: "Forma de pago", width: 18 },
  { header: "Subtotal", width: 12 },
  { header: "IVA 15%", width: 12 },
  { header: "IVA 5%", width: 12 },
  { header: "IVA 0%", width: 12 },
  { header: "Total", width: 12 },
];
const PRIMERA_COLUMNA_MONTO = 7;
const FORMATO_MONTO = "#,##0.00";

export async function blobReporteFacturasExcel({ facturas, totales, empresa, filtros }: Props): Promise<Blob> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Facturas");
  hoja.columns = COLUMNAS.map(({ width }) => ({ width }));

  hoja.addRow([`Reporte de facturas — ${empresa}`]).font = { bold: true, size: 14 };
  hoja.addRow([`${filtros} · ${facturas.length} documentos · Generado ${new Date().toLocaleString("es-EC")}`]).font = { color: { argb: "FF555555" } };
  hoja.addRow([]);

  const encabezado = hoja.addRow(COLUMNAS.map((col) => col.header));
  encabezado.font = { bold: true };
  encabezado.eachCell((celda) => {
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
    celda.border = { bottom: { style: "thin" } };
  });

  for (const factura of facturas) {
    hoja.addRow([
      factura.numero,
      nombreCliente(factura),
      factura.tipoReceptor === "consumidor_final" ? "9999999999999" : factura.clienteIdentificacion || "—",
      etiquetaEstado(factura.estado),
      factura.fechaEmision,
      factura.formaPagoNombre || "—",
      factura.subtotal,
      factura.iva15,
      factura.iva5,
      factura.iva0,
      factura.total,
    ]);
  }

  const filaTotales = hoja.addRow([
    `Total general (${totales.cantidad})`, "", "", "", "", "",
    totales.subtotal, totales.iva15, totales.iva5, totales.iva0, totales.total,
  ]);
  filaTotales.font = { bold: true, color: { argb: "FFFFFFFF" } };
  filaTotales.eachCell({ includeEmpty: true }, (celda) => {
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
  });

  for (let col = PRIMERA_COLUMNA_MONTO; col <= COLUMNAS.length; col += 1) {
    hoja.getColumn(col).numFmt = FORMATO_MONTO;
  }
  hoja.views = [{ state: "frozen", ySplit: encabezado.number }];

  const buffer = await libro.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

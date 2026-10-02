"use client";

export async function descargarElementoComoPdf(element: HTMLElement, nombreArchivo: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });
  const imagen = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const anchoPagina = pdf.internal.pageSize.getWidth();
  const altoPagina = pdf.internal.pageSize.getHeight();
  const margen = 8;
  const anchoUtil = anchoPagina - margen * 2;
  const altoImagen = (canvas.height * anchoUtil) / canvas.width;
  const altoUtil = altoPagina - margen * 2;
  let altoRestante = altoImagen;
  let posicion = margen;
  pdf.addImage(imagen, "JPEG", margen, posicion, anchoUtil, altoImagen);
  altoRestante -= altoUtil;
  while (altoRestante > 0) {
    posicion = margen - (altoImagen - altoRestante);
    pdf.addPage();
    pdf.addImage(imagen, "JPEG", margen, posicion, anchoUtil, altoImagen);
    altoRestante -= altoUtil;
  }
  pdf.save(nombreArchivo.endsWith(".pdf") ? nombreArchivo : `${nombreArchivo}.pdf`);
}

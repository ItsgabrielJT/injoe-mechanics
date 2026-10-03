from __future__ import annotations

import io
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.core.config import settings
from app.modules.facturacion.domain.entities import CONSUMIDOR_FINAL_IDENTIFICACION, CONSUMIDOR_FINAL_NOMBRE, Factura, TipoReceptor

logger = logging.getLogger(__name__)


def generar_pdf_factura(factura: Factura, empresa, punto) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 20 * mm

    titulo = "PROFORMA" if factura.estado.value == "BORRADOR" else "FACTURA"
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(20 * mm, y, empresa.nombre)
    pdf.drawRightString(width - 20 * mm, y, titulo)
    y -= 6 * mm
    pdf.setFont("Helvetica", 8)
    pdf.drawString(20 * mm, y, f"RUC: {empresa.ruc}")
    pdf.drawRightString(width - 20 * mm, y, f"No. {factura.numero}")
    y -= 4 * mm
    pdf.drawString(20 * mm, y, f"Dir. Matriz: {empresa.direccion}")
    y -= 4 * mm
    pdf.drawString(20 * mm, y, f"Dir. Sucursal: {punto.direccion or empresa.direccion}")
    y -= 4 * mm
    pdf.drawString(20 * mm, y, "OBLIGADO A LLEVAR CONTABILIDAD: NO")
    y -= 6 * mm
    pdf.drawString(20 * mm, y, f"Clave de acceso: {factura.clave_acceso or '-'}")
    y -= 4 * mm
    if factura.fecha_autorizacion:
        pdf.drawString(20 * mm, y, f"Fecha autorización: {factura.fecha_autorizacion}")
        y -= 4 * mm

    if factura.tipo_receptor == TipoReceptor.CONSUMIDOR_FINAL:
        nombre, ident, correo = CONSUMIDOR_FINAL_NOMBRE, CONSUMIDOR_FINAL_IDENTIFICACION, "-"
    else:
        nombre = factura.cliente_nombres or "-"
        ident = factura.cliente_identificacion or "-"
        correo = factura.cliente_correo or "-"
    y -= 4 * mm
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(20 * mm, y, "Cliente")
    y -= 4 * mm
    pdf.setFont("Helvetica", 8)
    pdf.drawString(20 * mm, y, f"Razón social: {nombre}")
    y -= 4 * mm
    pdf.drawString(20 * mm, y, f"Identificación: {ident}")
    y -= 4 * mm
    pdf.drawString(20 * mm, y, f"Correo: {correo}")
    y -= 8 * mm

    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(20 * mm, y, "Cant.")
    pdf.drawString(35 * mm, y, "Descripción")
    pdf.drawRightString(140 * mm, y, "P. Unit")
    pdf.drawRightString(165 * mm, y, "Desc %")
    pdf.drawRightString(190 * mm, y, "Total")
    y -= 4 * mm
    pdf.setFont("Helvetica", 7)
    for item in factura.items:
        if y < 40 * mm:
            pdf.showPage()
            y = height - 20 * mm
        pdf.drawString(20 * mm, y, str(item.cantidad))
        pdf.drawString(35 * mm, y, (item.descripcion or "")[:50])
        pdf.drawRightString(140 * mm, y, f"{item.precio_unitario:.2f}")
        pdf.drawRightString(165 * mm, y, f"{item.descuento_porcentaje:.2f}")
        pdf.drawRightString(190 * mm, y, f"{item.total:.2f}")
        y -= 4 * mm

    y -= 6 * mm
    pdf.setFont("Helvetica", 8)
    filas = [
        ("SUBTOTAL 15%", factura.subtotal_15),
        ("SUBTOTAL 5%", factura.subtotal_5),
        ("SUBTOTAL 0%", factura.subtotal_0),
        ("SUBTOTAL no objeto", factura.subtotal_objeto),
        ("SUBTOTAL exento", factura.subtotal_exento),
        ("IVA 15%", factura.iva_15),
        ("IVA 5%", factura.iva_5),
        ("DESCUENTO", factura.descuento),
        ("TOTAL", factura.total),
    ]
    for etiqueta, valor in filas:
        pdf.drawRightString(165 * mm, y, etiqueta)
        pdf.drawRightString(190 * mm, y, f"{valor:.2f}")
        y -= 4 * mm
    pdf.setFont("Helvetica", 7)
    pdf.drawString(20 * mm, 18 * mm, f"Forma de pago: {factura.forma_pago_nombre or '-'}")
    pdf.save()
    return buffer.getvalue()


def enviar_correo_factura(factura: Factura, xml: str | None, pdf_bytes: bytes) -> None:
    if not (settings.SMTP_HOST and settings.SMTP_PORT and settings.SMTP_USER and settings.SMTP_PASSWORD):
        logger.warning("SMTP no configurado; se omite el envío de la factura %s", factura.numero)
        return
    destino = factura.cliente_correo
    if not destino:
        return
    msg = EmailMessage()
    msg["To"] = destino
    msg["Subject"] = f"Factura {factura.numero}"
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM or settings.SMTP_USER))
    msg.set_content(f"Adjunto encontrará la factura {factura.numero} en PDF y XML.")
    msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename=f"{factura.numero}.pdf")
    if xml:
        msg.add_attachment(xml.encode("utf-8"), maintype="application", subtype="xml", filename=f"{factura.clave_acceso or factura.numero}.xml")
    with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT), timeout=30) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)

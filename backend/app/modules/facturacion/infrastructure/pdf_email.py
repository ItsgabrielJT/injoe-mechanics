from __future__ import annotations

import html
import io
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from pathlib import Path

from reportlab.graphics.barcode import code128
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.pdfgen import canvas

from app.core.config import settings
from app.modules.facturacion.domain.ambiente import etiqueta_ambiente_comprobante
from app.modules.facturacion.domain.entities import CONSUMIDOR_FINAL_IDENTIFICACION, CONSUMIDOR_FINAL_NOMBRE, Factura, TipoReceptor
from app.modules.facturacion.infrastructure.info_adicional import filas_info_adicional

logger = logging.getLogger(__name__)

LOGOS_DIR = Path(__file__).resolve().parents[5] / "frontend" / "public" / "logos"
LOGO_SISTEMA = LOGOS_DIR / "logo_injoe_web.png"
LOGO_BLANCO = LOGOS_DIR / "logo_injoe_white.png"
NOMBRE_SISTEMA = "INJOE Mechanics"


def _dinero(valor) -> str:
    return f"{float(valor or 0):.2f}"


def _ambiente(factura: Factura, empresa) -> str:
    return etiqueta_ambiente_comprobante(
        factura.clave_acceso or factura.numero_autorizacion,
        factura.xml_content,
        getattr(empresa, "entorno_sri", None),
    )


def _logo(empresa) -> Path | None:
    candidatos = []
    ruta = getattr(empresa, "ruta_logo", None)
    if ruta:
        candidatos.append(Path(ruta))
        if isinstance(ruta, str) and ruta.startswith("/"):
            candidatos.append(Path(__file__).resolve().parents[5] / "frontend" / "public" / ruta.lstrip("/"))
    candidatos.append(LOGO_SISTEMA)
    for path in candidatos:
        if path and path.exists() and path.is_file() and path.stat().st_size > 0:
            return path
    return None


def _iva(tipo) -> str:
    valor = getattr(tipo, "value", tipo)
    if valor == "15":
        return "15.00%"
    if valor == "5":
        return "5.00%"
    return "0.00%"


def _partir(texto: str, ancho: float, fuente: str, tamano: int, pdf: canvas.Canvas) -> list[str]:
    return simpleSplit(str(texto or ""), fuente, tamano, ancho) or [""]


def _barcode(clave: str, max_w: float, alto: float):
    if not clave:
        return None
    probe = code128.Code128(clave, barHeight=alto, barWidth=0.35, humanReadable=0, quiet=0)
    if probe.width <= 0:
        return None
    escala = max_w / probe.width
    return code128.Code128(clave, barHeight=alto, barWidth=0.35 * escala, humanReadable=0, quiet=0)


def generar_pdf_factura(factura: Factura, empresa, punto) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margen = 10 * mm
    contenido = width - 2 * margen
    es_borrador = factura.estado.value == "BORRADOR"
    clave = factura.clave_acceso or factura.numero_autorizacion or ""
    sucursal = getattr(punto, "direccion", None) or empresa.direccion
    caja_izq_w = contenido * 0.49
    caja_der_w = contenido * 0.49
    gap = contenido * 0.02
    caja_h = 82 * mm
    y_top = height - margen

    if factura.tipo_receptor == TipoReceptor.CONSUMIDOR_FINAL:
        nombre, ident, correo, direccion, telefono = CONSUMIDOR_FINAL_NOMBRE, CONSUMIDOR_FINAL_IDENTIFICACION, "", "", ""
    else:
        nombre = factura.cliente_nombres or "-"
        ident = factura.cliente_identificacion or "-"
        correo = factura.cliente_correo or ""
        direccion = factura.cliente_direccion or ""
        telefono = factura.cliente_telefono or ""

    x_izq = margen
    x_der = margen + caja_izq_w + gap
    pdf.rect(x_izq, y_top - caja_h, caja_izq_w, caja_h)
    pdf.rect(x_der, y_top - caja_h, caja_der_w, caja_h)

    logo = _logo(empresa)
    if logo:
        try:
            pdf.drawImage(
                ImageReader(str(logo)),
                x_izq + 3 * mm,
                y_top - 24 * mm,
                width=42 * mm,
                height=20 * mm,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception:
            logger.warning("No se pudo dibujar el logo en el RIDE", exc_info=True)
    y_emp = y_top - 28 * mm
    pdf.setFont("Helvetica-Bold", 9)
    for linea in _partir(str(empresa.nombre).upper(), caja_izq_w - 8 * mm, "Helvetica-Bold", 9, pdf):
        pdf.drawString(x_izq + 3 * mm, y_emp, linea)
        y_emp -= 4 * mm
    pdf.setFont("Helvetica", 7)
    for etiqueta, valor in (
        ("Dirección Matriz:", empresa.direccion),
        ("Dirección Sucursal:", sucursal),
        ("Obligado a llevar Contabilidad:", "SI"),
    ):
        for linea in _partir(f"{etiqueta} {valor}", caja_izq_w - 8 * mm, "Helvetica", 7, pdf):
            pdf.drawString(x_izq + 3 * mm, y_emp, linea)
            y_emp -= 3.6 * mm

    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawCentredString(x_der + caja_der_w / 2, y_top - 7 * mm, "PROFORMA" if es_borrador else "FACTURA")
    y_info = y_top - 13 * mm
    inner_w = caja_der_w - 8 * mm

    def fila_der(etiqueta: str, valor: str, wrap: bool = False) -> None:
        nonlocal y_info
        pdf.setFont("Helvetica-Bold", 7)
        if wrap:
            pdf.drawString(x_der + 3 * mm, y_info, etiqueta)
            y_info -= 3.4 * mm
            pdf.setFont("Helvetica", 7)
            for linea in _partir(valor, inner_w, "Helvetica", 7, pdf):
                pdf.drawString(x_der + 3 * mm, y_info, linea)
                y_info -= 3.4 * mm
            return
        pdf.drawString(x_der + 3 * mm, y_info, etiqueta)
        pdf.setFont("Helvetica", 7)
        pdf.drawString(x_der + 38 * mm, y_info, valor)
        y_info -= 4 * mm

    fila_der("R.U.C.:", empresa.ruc)
    fila_der("No.:", factura.numero)
    fila_der("Número de Autorización:", clave or "-", wrap=True)
    fila_der(
        "Fecha y Hora de Autorización:",
        factura.fecha_autorizacion.strftime("%d/%m/%Y %H:%M:%S") if factura.fecha_autorizacion else "-",
        wrap=True,
    )
    fila_der("Ambiente:", _ambiente(factura, empresa))
    fila_der("Emisión:", "NORMAL")

    pdf.setFont("Helvetica", 6)
    pdf.drawCentredString(x_der + caja_der_w / 2, y_info - 1 * mm, "Clave de Acceso")
    barcode_w = caja_der_w - 8 * mm
    barcode_h = 13 * mm
    barcode_y = y_top - caja_h + 7 * mm
    if clave and not es_borrador:
        barcode = _barcode(clave, barcode_w, barcode_h)
        if barcode:
            barcode.drawOn(pdf, x_der + 4 * mm + (barcode_w - barcode.width) / 2, barcode_y)
    pdf.setFont("Courier", 5.5)
    pdf.drawCentredString(x_der + caja_der_w / 2, y_top - caja_h + 3.5 * mm, clave or "-")

    y = y_top - caja_h - 4 * mm
    cliente_h = 26 * mm
    pdf.rect(margen, y - cliente_h, contenido, cliente_h)
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(margen + 3 * mm, y - 5 * mm, "Razón Social / Nombres y Apellidos:")
    pdf.setFont("Helvetica", 7)
    pdf.drawString(margen + 62 * mm, y - 5 * mm, nombre)
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(margen + 3 * mm, y - 10 * mm, "Identificación:")
    pdf.setFont("Helvetica", 7)
    pdf.drawString(margen + 28 * mm, y - 10 * mm, ident)
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(margen + 110 * mm, y - 10 * mm, "Fecha:")
    pdf.setFont("Helvetica", 7)
    pdf.drawString(margen + 122 * mm, y - 10 * mm, factura.fecha_emision.strftime("%d/%m/%Y"))
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(margen + 3 * mm, y - 15 * mm, "Placa / Matrícula:")
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(margen + 110 * mm, y - 15 * mm, "Guía:")
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(margen + 3 * mm, y - 20 * mm, "Dirección:")
    pdf.setFont("Helvetica", 7)
    pdf.drawString(margen + 22 * mm, y - 20 * mm, (direccion or "-")[:80])
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(margen + 3 * mm, y - 25 * mm, "Teléfono:")
    pdf.setFont("Helvetica", 7)
    pdf.drawString(margen + 20 * mm, y - 25 * mm, telefono or "-")
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(margen + 80 * mm, y - 25 * mm, "Email:")
    pdf.setFont("Helvetica", 7)
    pdf.drawString(margen + 92 * mm, y - 25 * mm, correo or "-")

    y = y - cliente_h - 4 * mm
    cols = [22, 52, 24, 18, 16, 24, 20, 24]
    headers = ["Cod. Principal", "Descripción", "Unidad Medida", "Cantidad", "IVA", "P. Unitario", "Descuento", "P. Total"]
    x = margen
    pdf.setFillColorRGB(0.94, 0.94, 0.94)
    pdf.rect(margen, y - 6 * mm, contenido, 6 * mm, fill=1, stroke=1)
    pdf.setFillColorRGB(0, 0, 0)
    pdf.setFont("Helvetica-Bold", 6)
    for header, w in zip(headers, cols, strict=False):
        pdf.drawCentredString(x + (w * mm) / 2, y - 4 * mm, header)
        x += w * mm
    y -= 10 * mm
    pdf.setFont("Helvetica", 6)
    for item in factura.items:
        if y < 78 * mm:
            pdf.showPage()
            y = height - 20 * mm
        valores = [
            (item.codigo or "-")[:14],
            (item.descripcion or "")[:40],
            "UNIDAD",
            _dinero(item.cantidad),
            _iva(item.tipo_impuesto),
            _dinero(item.precio_unitario),
            f"{_dinero(item.descuento_porcentaje)}%",
            _dinero(item.total),
        ]
        x = margen
        for i, (valor, w) in enumerate(zip(valores, cols, strict=False)):
            if i >= 3:
                pdf.drawRightString(x + w * mm - 1 * mm, y, valor)
            else:
                pdf.drawString(x + 1 * mm, y, valor)
            x += w * mm
        y -= 4.2 * mm
    pdf.line(margen, y + 2 * mm, width - margen, y + 2 * mm)

    y -= 6 * mm
    pago_w = 72 * mm
    tot_w = contenido - pago_w - 4 * mm
    tot_h = 68 * mm
    pdf.rect(margen, y - tot_h, pago_w, tot_h)
    pdf.rect(margen + pago_w + 4 * mm, y - tot_h, tot_w, tot_h)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(margen + 3 * mm, y - 6 * mm, "Forma de pago")
    pdf.setFont("Helvetica", 7)
    forma = " - ".join(part for part in [factura.forma_pago_sri_codigo, factura.forma_pago_nombre] if part) or "-"
    pdf.drawString(margen + 3 * mm, y - 12 * mm, forma[:38])
    pdf.drawRightString(margen + pago_w - 3 * mm, y - 12 * mm, f"${_dinero(factura.total)}")

    subtotal_sin = factura.subtotal_15 + factura.subtotal_5 + factura.subtotal_0 + factura.subtotal_objeto + factura.subtotal_exento
    filas_tot = [
        ("SUBTOTAL 15%:", factura.subtotal_15),
        ("SUBTOTAL 5%:", factura.subtotal_5),
        ("SUBTOTAL 0%:", factura.subtotal_0),
        ("SUBTOTAL no objeto de IVA:", factura.subtotal_objeto),
        ("SUBTOTAL exento de IVA:", factura.subtotal_exento),
        ("SUBTOTAL sin impuestos:", subtotal_sin),
        ("TOTAL Descuento:", factura.descuento),
        ("ICE:", 0),
        ("IVA 15%:", factura.iva_15),
        ("IVA 5%:", factura.iva_5),
        ("Total Devolución IVA:", 0),
        ("IRBPNR:", 0),
        ("Propina:", 0),
        ("VALOR TOTAL:", factura.total),
        ("VALOR TOTAL SIN SUBSIDIO:", 0),
        ("AHORRO POR SUBSIDIO:", 0),
    ]
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(margen + pago_w + 7 * mm, y - 6 * mm, "Resumen de Totales e Impuestos")
    ty = y - 11 * mm
    for etiqueta, valor in filas_tot:
        pdf.setFont("Helvetica-Bold" if etiqueta == "VALOR TOTAL:" else "Helvetica", 7)
        pdf.drawString(margen + pago_w + 7 * mm, ty, etiqueta)
        pdf.drawRightString(width - margen - 4 * mm, ty, f"${_dinero(valor)}")
        ty -= 3.3 * mm
    pdf.setFont("Helvetica-Oblique", 6)
    pdf.drawString(margen + pago_w + 7 * mm, y - tot_h + 3 * mm, "(Incluye IVA cuando corresponda)")

    adicionales = filas_info_adicional(factura, empresa, correo, telefono)
    if adicionales:
        ay = y - tot_h - 6 * mm
        info_h = 10 * mm + 4.2 * mm * len(adicionales)
        if ay - info_h < 10 * mm:
            pdf.showPage()
            ay = height - 16 * mm
        pdf.rect(margen, ay - info_h, contenido, info_h)
        pdf.setFont("Helvetica-Bold", 8)
        pdf.drawString(margen + 3 * mm, ay - 5 * mm, "Información Adicional")
        ly = ay - 10 * mm
        for etiqueta, valor in adicionales:
            pdf.setFont("Helvetica-Bold", 7)
            pdf.drawString(margen + 3 * mm, ly, f"{etiqueta}:")
            pdf.setFont("Helvetica", 7)
            pdf.drawString(margen + 40 * mm, ly, str(valor)[:90])
            ly -= 4.2 * mm

    pdf.save()
    return buffer.getvalue()


def _logo_correo() -> tuple[bytes, str] | None:
    for path in (LOGO_BLANCO, LOGO_SISTEMA):
        if path.exists() and path.stat().st_size > 0:
            return path.read_bytes(), "png"
    return None


def _cuerpo_texto_factura(factura: Factura, empresa) -> str:
    cliente = factura.cliente_nombres or CONSUMIDOR_FINAL_NOMBRE
    fecha = factura.fecha_emision.strftime("%d/%m/%Y") if factura.fecha_emision else "-"
    clave = factura.clave_acceso or factura.numero_autorizacion or "-"
    return (
        f"Hola {cliente},\n\n"
        f"{NOMBRE_SISTEMA} te comparte la factura {factura.numero}.\n\n"
        f"Emisor: {empresa.nombre} ({empresa.ruc})\n"
        f"Fecha de emisión: {fecha}\n"
        f"Autorización: {clave}\n"
        f"Total: ${_dinero(factura.total)}\n\n"
        "Adjuntamos el comprobante en PDF y XML. Consérvalo; tiene validez tributaria.\n\n"
        f"Atentamente,\n{NOMBRE_SISTEMA}\n"
    )


def _cuerpo_html_factura(factura: Factura, empresa, cid_logo: str | None) -> str:
    cliente = html.escape(factura.cliente_nombres or CONSUMIDOR_FINAL_NOMBRE)
    emisor = html.escape(empresa.nombre or NOMBRE_SISTEMA)
    ruc = html.escape(empresa.ruc or "")
    numero = html.escape(factura.numero)
    fecha = factura.fecha_emision.strftime("%d/%m/%Y") if factura.fecha_emision else "-"
    clave = html.escape(factura.clave_acceso or factura.numero_autorizacion or "-")
    total = _dinero(factura.total)
    logo_html = (
        f'<img src="cid:{cid_logo}" alt="{NOMBRE_SISTEMA}" width="140" style="display:block;max-width:140px;height:auto;margin:0 auto 10px auto;" />'
        if cid_logo
        else ""
    )
    return f"""\
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Factura {numero}</title>
  </head>
  <body style="margin:0;padding:0;background:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111111;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 24px 22px 24px;background:#161616;text-align:center;">
                {logo_html}
                <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#FF7F50;font-weight:700;">{NOMBRE_SISTEMA}</div>
                <div style="margin-top:8px;font-size:24px;font-weight:700;color:#ffffff;">Nuevo comprobante electrónico</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;">
                <div style="font-size:16px;line-height:24px;color:#111827;">Hola <strong>{cliente}</strong>,</div>
                <div style="margin-top:8px;font-size:14px;line-height:22px;color:#4b5563;">
                  {NOMBRE_SISTEMA} generó tu <strong>factura {numero}</strong>. Aquí tienes el resumen y los archivos adjuntos.
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;background:#faf7f5;border:1px solid #f3e8e2;border-radius:14px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <div style="font-size:11px;color:#9a6b57;text-transform:uppercase;letter-spacing:.08em;">Emisor</div>
                      <div style="margin-top:4px;font-size:16px;font-weight:700;color:#111827;">{emisor}</div>
                      <div style="font-size:13px;color:#6b7280;">RUC: {ruc}</div>
                    </td>
                  </tr>
                  <tr><td style="padding:0 16px;"><div style="height:1px;background:#f3e8e2;"></div></td></tr>
                  <tr>
                    <td style="padding:14px 16px;">
                      <div style="font-size:11px;color:#9a6b57;text-transform:uppercase;letter-spacing:.08em;">Fecha de emisión</div>
                      <div style="margin-top:4px;font-size:16px;font-weight:600;color:#111827;">{fecha}</div>
                    </td>
                  </tr>
                  <tr><td style="padding:0 16px;"><div style="height:1px;background:#f3e8e2;"></div></td></tr>
                  <tr>
                    <td style="padding:14px 16px;">
                      <div style="font-size:11px;color:#9a6b57;text-transform:uppercase;letter-spacing:.08em;">No. Autorización</div>
                      <div style="margin-top:4px;font-size:13px;font-family:Menlo,Consolas,monospace;color:#111827;word-break:break-all;">{clave}</div>
                    </td>
                  </tr>
                  <tr><td style="padding:0 16px;"><div style="height:1px;background:#f3e8e2;"></div></td></tr>
                  <tr>
                    <td style="padding:14px 16px;">
                      <div style="font-size:11px;color:#9a6b57;text-transform:uppercase;letter-spacing:.08em;">Total</div>
                      <div style="margin-top:4px;font-size:26px;font-weight:800;color:#E5673A;">${total}</div>
                    </td>
                  </tr>
                </table>
                <div style="margin-top:22px;background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:14px 16px;">
                  <div style="font-size:13px;color:#9a3412;line-height:20px;">
                    <strong>Importante:</strong> adjuntamos el comprobante en PDF y XML. Guárdalos; tienen validez tributaria.
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#161616;text-align:center;">
                <div style="font-size:12px;color:#d1d5db;">Enviado automáticamente por <strong style="color:#FF7F50;">{NOMBRE_SISTEMA}</strong></div>
                <div style="margin-top:4px;font-size:11px;color:#9ca3af;">Sistema de talleres y facturación electrónica</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def enviar_correo_factura(factura: Factura, xml: str | None, pdf_bytes: bytes, empresa=None, destino: str | None = None) -> None:
    if not (settings.SMTP_HOST and settings.SMTP_PORT and settings.SMTP_USER and settings.SMTP_PASSWORD):
        logger.warning("SMTP no configurado; se omite el envío de la factura %s", factura.numero)
        return
    destinatario = destino or factura.cliente_correo
    if not destinatario:
        return
    emisor = empresa or type("Empresa", (), {"nombre": NOMBRE_SISTEMA, "ruc": ""})()
    logo = _logo_correo()
    cid_logo = make_msgid(domain="injoe.mechanics")[1:-1] if logo else None
    msg = EmailMessage()
    msg["To"] = destinatario
    msg["Subject"] = f"Factura {factura.numero} · {NOMBRE_SISTEMA}"
    msg["From"] = formataddr((NOMBRE_SISTEMA, settings.SMTP_FROM or settings.SMTP_USER))
    msg.set_content(_cuerpo_texto_factura(factura, emisor))
    msg.add_alternative(_cuerpo_html_factura(factura, emisor, cid_logo), subtype="html")
    if logo and cid_logo:
        data, subtype = logo
        for part in msg.iter_parts():
            if part.get_content_subtype() == "html":
                part.add_related(data, maintype="image", subtype=subtype, cid=cid_logo)
                break
    msg.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename=f"{factura.numero}.pdf")
    if xml:
        msg.add_attachment(xml.encode("utf-8"), maintype="application", subtype="xml", filename=f"{factura.clave_acceso or factura.numero}.xml")
    with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT), timeout=30) as smtp:
        if settings.SMTP_USE_TLS:
            smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)
    logger.info("Factura %s enviada a %s", factura.numero, destinatario)

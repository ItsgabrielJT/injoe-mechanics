from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from typing import Any

import httpx

from app.core.config import settings
from app.modules.facturacion.infrastructure.info_adicional import additional_info_sri
from app.modules.facturacion.domain.entities import (
    CONSUMIDOR_FINAL_IDENTIFICACION,
    CONSUMIDOR_FINAL_NOMBRE,
    CONSUMIDOR_FINAL_TIPO_ID,
    Factura,
    TipoReceptor,
    dinero,
)
from app.modules.inventario.domain.entities import TipoImpuesto

_API_KEY: str | None = None


def _fmt(valor: Any) -> str:
    return str(dinero(valor))


def _tipo_id(identificacion: str | None, tipo_receptor: TipoReceptor) -> str:
    if tipo_receptor == TipoReceptor.CONSUMIDOR_FINAL:
        return CONSUMIDOR_FINAL_TIPO_ID
    ident = (identificacion or "").strip()
    if len(ident) == 10:
        return "05"
    if len(ident) == 13:
        return "04"
    return "06"


def _tax_mapping(tipo: TipoImpuesto) -> tuple[str, str, str]:
    if tipo == TipoImpuesto.QUINCE:
        return "2", "4", "15"
    if tipo == TipoImpuesto.CINCO:
        return "2", "5", "5"
    if tipo == TipoImpuesto.NO_OBJETO:
        return "2", "6", "0"
    if tipo == TipoImpuesto.EXENTO_IVA:
        return "2", "7", "0"
    return "2", "0", "0"


def _seq(numero: str) -> str:
    digits = "".join(ch for ch in numero if ch.isdigit())
    return (digits[-9:] if digits else "1").zfill(9)


async def _api_key(client: httpx.AsyncClient) -> str:
    global _API_KEY
    if _API_KEY:
        return _API_KEY
    resp = await client.post(
        f"{settings.SRI_SIGN_URL.rstrip('/')}/api-key/generate",
        json={"secret_key": settings.SRI_SIGN_SECRET_KEY, "expiration": "never"},
        timeout=20,
    )
    resp.raise_for_status()
    key = resp.json().get("api_key")
    if not key:
        raise RuntimeError("SriSignXml no devolvió api_key")
    _API_KEY = key
    return key


def construir_payload(factura: Factura, empresa, punto, environment: str) -> dict[str, Any]:
    emision = factura.fecha_emision or datetime.now().date()
    estab = str(punto.codigo).zfill(3) if str(punto.codigo).isdigit() else str(punto.codigo)
    pto = str(punto.punto_emision).zfill(3) if str(punto.punto_emision).isdigit() else str(punto.punto_emision)
    if factura.tipo_receptor == TipoReceptor.CONSUMIDOR_FINAL:
        nombre = CONSUMIDOR_FINAL_NOMBRE
        dni = CONSUMIDOR_FINAL_IDENTIFICACION
        direccion = empresa.direccion or "N/A"
        correo = ""
    else:
        nombre = factura.cliente_nombres or ""
        dni = factura.cliente_identificacion or ""
        direccion = factura.cliente_direccion or empresa.direccion or "N/A"
        correo = factura.cliente_correo or ""

    details = []
    for item in factura.items:
        tax_type_code, pct, rate = _tax_mapping(item.tipo_impuesto)
        bruto = item.cantidad * item.precio_unitario
        desc = dinero(bruto * (item.descuento_porcentaje or Decimal("0")) / Decimal("100"))
        details.append(
            {
                "productCode": item.codigo or "ITEM",
                "productName": item.descripcion,
                "description": item.descripcion,
                "quantity": float(item.cantidad) if item.cantidad % 1 else int(item.cantidad),
                "price": _fmt(item.precio_unitario),
                "discount": _fmt(desc),
                "subTotal": _fmt(item.subtotal),
                "taxTypeCode": tax_type_code,
                "percentageCode": pct,
                "rate": rate,
                "taxableBaseTax": _fmt(item.subtotal),
                "taxValue": _fmt(item.iva_amount),
            }
        )

    totals = []
    if factura.subtotal_0 > 0:
        totals.append({"taxCode": "2", "percentageCode": "0", "taxableBase": _fmt(factura.subtotal_0), "taxValue": "0.00"})
    if factura.subtotal_5 > 0:
        totals.append({"taxCode": "2", "percentageCode": "5", "taxableBase": _fmt(factura.subtotal_5), "taxValue": _fmt(factura.iva_5)})
    if factura.subtotal_15 > 0:
        totals.append({"taxCode": "2", "percentageCode": "4", "taxableBase": _fmt(factura.subtotal_15), "taxValue": _fmt(factura.iva_15)})
    if factura.subtotal_objeto > 0:
        totals.append({"taxCode": "2", "percentageCode": "6", "taxableBase": _fmt(factura.subtotal_objeto), "taxValue": "0.00"})
    if factura.subtotal_exento > 0:
        totals.append({"taxCode": "2", "percentageCode": "7", "taxableBase": _fmt(factura.subtotal_exento), "taxValue": "0.00"})

    base = factura.subtotal_15 + factura.subtotal_5 + factura.subtotal_0 + factura.subtotal_objeto + factura.subtotal_exento
    additional = additional_info_sri(factura, empresa, correo, factura.cliente_telefono)
    return {
        "invoice": {
            "documentInfo": {
                "accessKey": "",
                "businessName": empresa.nombre,
                "commercialName": empresa.nombre,
                "businessAddress": empresa.direccion,
                "dayEmission": emision.strftime("%d"),
                "monthEmission": emision.strftime("%m"),
                "yearEmission": emision.strftime("%Y"),
                "codDoc": "01",
                "rucBusiness": empresa.ruc,
                "environment": environment,
                "typeEmission": "1",
                "establishment": estab,
                "establishmentAddress": punto.direccion or empresa.direccion,
                "emissionPoint": pto,
                "sequential": _seq(factura.numero),
                "obligatedAccounting": "NO",
            },
            "customer": {
                "identificationType": _tipo_id(dni, factura.tipo_receptor),
                "customerName": nombre,
                "customerDni": dni,
                "customerAddress": direccion,
            },
            "payment": {
                "totalWithoutTaxes": _fmt(base),
                "totalDiscount": _fmt(factura.descuento),
                "gratuity": "0.00",
                "totalAmount": _fmt(factura.total),
                "currency": empresa.moneda or "USD",
                "paymentMethodCode": factura.forma_pago_sri_codigo or "01",
                "totalPayment": _fmt(factura.total),
            },
            "details": details,
            "totalsWithTax": totals,
            "additionalInfo": additional,
        },
        "empresa_id": int(empresa.sri_id),
    }


async def firmar_factura(factura: Factura, empresa, punto) -> dict[str, Any]:
    environment = empresa.entorno_sri or settings.SRI_ENVIRONMENT
    payload = construir_payload(factura, empresa, punto, environment)
    async with httpx.AsyncClient(timeout=90) as client:
        key = await _api_key(client)
        try:
            resp = await client.post(
                f"{settings.SRI_SIGN_URL.rstrip('/')}/invoice/sign",
                json=payload,
                headers={"X-API-Key": key},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            return {
                "result": None,
                "error": f"No se pudo conectar con SriSignXml: {exc}",
                "errorCategory": "sri_reception_network",
                "status": "retryable",
            }


async def consultar_autorizacion(clave_acceso: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=60) as client:
        key = await _api_key(client)
        try:
            resp = await client.post(
                f"{settings.SRI_SIGN_URL.rstrip('/')}/authorization/check",
                json={"accessKey": clave_acceso},
                headers={"X-API-Key": key},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            return {"result": None, "error": f"No se pudo consultar autorización: {exc}"}


async def recuperar_secuencial(empresa_sri_id: int, numero: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=60) as client:
        key = await _api_key(client)
        try:
            resp = await client.post(
                f"{settings.SRI_SIGN_URL.rstrip('/')}/authorization/recover-sequential",
                json={"empresa_id": int(empresa_sri_id), "numero_documento": numero},
                headers={"X-API-Key": key},
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            return {"result": None, "error": f"No se pudo recuperar el secuencial: {exc}"}


def es_secuencial_registrado(respuesta: dict[str, Any] | str | None) -> bool:
    if respuesta is None:
        return False
    if isinstance(respuesta, str):
        texto = respuesta.upper()
        return "SECUENCIAL" in texto and "REGISTRADO" in texto or "SRI_SEQUENTIAL_REGISTERED" in texto
    partes = [
        str(respuesta.get("error") or ""),
        str(respuesta.get("errorCategory") or ""),
        str(respuesta.get("status") or ""),
        str(respuesta.get("errorType") or ""),
    ]
    result = respuesta.get("result") or {}
    if isinstance(result, dict):
        partes.append(str(result.get("error") or ""))
        partes.append(str(result.get("status") or ""))
        mensajes = result.get("sriMessages") or []
    else:
        mensajes = []
    mensajes = respuesta.get("sriMessages") or mensajes or []
    for item in mensajes:
        if isinstance(item, dict):
            partes.append(str(item.get("mensaje") or ""))
            partes.append(str(item.get("informacionAdicional") or ""))
        else:
            partes.append(str(item))
    texto = " ".join(partes).upper()
    return "SRI_SEQUENTIAL_REGISTERED" in texto or ("SECUENCIAL" in texto and "REGISTRADO" in texto)


def resumen_error(respuesta: dict[str, Any]) -> str:
    mensajes = respuesta.get("sriMessages") or []
    if mensajes:
        textos = []
        for item in mensajes:
            if isinstance(item, dict):
                textos.append(item.get("mensaje") or item.get("informacionAdicional") or str(item))
            else:
                textos.append(str(item))
        return " | ".join(textos)
    return respuesta.get("error") or json.dumps(respuesta, ensure_ascii=False)

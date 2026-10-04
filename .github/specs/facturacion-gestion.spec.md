---
id: SPEC-010
status: APPROVED
feature: facturacion-gestion
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: ["SPEC-009"]
---

# Spec: Gestión de facturas (cancelar, detalle, stock, reporte y estadísticas)

## Requerimientos
1. Cancelar factura (`CANCELADA`) desde la tabla, con confirmación.
2. Modal de detalle: cliente (nombre, cédula/RUC, correo, teléfono), número, ítems con código y bodega, desglose y resumen financiero. El número de factura abre el mismo modal.
3. Si la factura queda `AUTORIZADA` y `orden_trabajo_id` es nulo, registrar salidas de stock por bodega. Nota: `Factura: {numero}, Cliente: {nombre}, Total: ${total}, Fecha autorización: {fecha}`.
4. Listado filtrable por nombre, cédula/RUC y número. Columnas: subtotal, IVA 15/5/0, forma de pago. Pie con totales de las columnas numéricas (de todo el filtro, no solo la página).
5. PDF de reporte previsualizable de las facturas visibles según filtros (o todas si no hay filtros).
6. Pestaña de estadísticas por hoy/mes/trimestre/semestre/anual/fechas: conteo y montos por estado, subtotal e IVA 15/5/0.

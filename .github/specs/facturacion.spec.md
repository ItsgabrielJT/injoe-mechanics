---
id: SPEC-009
status: APPROVED
feature: facturacion
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-003", "SPEC-005", "SPEC-007", "SPEC-008"]
---

# Spec: Facturación electrónica

> **Estado:** `APPROVED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
CRUD de facturas en borrador (productos y servicios, descuentos, totales SRI), envío al SRI vía SriSignXml usando `empresas.sri_id`, PDF RIDE, correo al cliente no consumidor final, y facturación desde OT cerradas.

### Requerimiento de Negocio
Clonar Autocare sin vendedor, categoría ni tipo de crédito. Formas de pago SRI + por empresa/punto. Una OT ↔ una factura. Consumidor final o cliente. Inputs numéricos vacíos en UI; vacío → 0 al persistir.

### Historias de Usuario

#### HU-01: Crear factura en borrador

```
Como:        Usuario del taller
Quiero:      Crear una factura con cliente o consumidor final, ítems y forma de pago
Para:        Revisarla antes de enviarla al SRI

Prioridad:   Alta
Estimación:  XL
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: borrador
  Dado que:  hay cliente, forma de pago e ítems
  Cuando:    guardo la factura
  Entonces:  queda BORRADOR con número {codigo}-{punto}-{seq:09d} y factura_seq incrementado
```

#### HU-02: Enviar al SRI

```
Como:        Usuario
Quiero:      Enviar el borrador al SRI
Para:        Autorizar la factura electrónica

Prioridad:   Alta
Estimación:  XL
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: autorizada
  Dado que:  SriSignXml autoriza
  Cuando:    envío la factura
  Entonces:  estado AUTORIZADA, clave_acceso, xml_content y fecha_autorizacion
```

**Error Path**
```gherkin
CRITERIO-2.2: rechazada
  Dado que:  el SRI devuelve DEVUELTA o NO AUTORIZADO
  Cuando:    envío
  Entonces:  RECHAZADA y reason_error legible
```

**Edge Case**
```gherkin
CRITERIO-2.3: pendiente
  Dado que:  el SRI recibió pero no autorizó (caída o NO ENCONTRADO)
  Cuando:    envío
  Entonces:  PENDIENTE_AUTORIZACION y el job consulta /authorization/check
```

```gherkin
CRITERIO-2.4: secuencial registrado
  Dado que:  el SRI responde ERROR SECUENCIAL REGISTRADO
  Cuando:    envío o reintento
  Entonces:  se recupera la clave original, se guarda el XML, queda AUTORIZADA y se procesa inventario
```

#### HU-03: Facturar OT cerrada

```
Como:        Usuario
Quiero:      Facturar una OT cerrada eligiendo el receptor
Para:        Generar el borrador con los ítems de la OT

Prioridad:   Alta
Estimación:  L
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: receptor
  Dado que:  la OT está CERRADA y no facturada
  Cuando:    elijo Consumidor Final, el cliente de la OT u otro cliente
  Entonces:  se crea un borrador con tipo_receptor y cliente_id según la opción
```

### Reglas de Negocio
1. Estados: BORRADOR, ENVIADA, PENDIENTE_AUTORIZACION, AUTORIZADA, RECHAZADA, CANCELADA.
2. Editar BORRADOR o RECHAZADA (al guardar una rechazada vuelve a BORRADOR y conserva clave/XML para recuperar autorización). Si el SRI responde SECUENCIAL REGISTRADO se consulta la clave original, se guarda el XML y se marca AUTORIZADA (con inventario). Eliminar solo BORRADOR.
3. `tipo_receptor`: `cliente` | `consumidor_final`. CF: sin cliente_id; SRI 07 / 9999999999999 / CONSUMIDOR FINAL.
4. Precio: si `aplica_iva` y tasa 5/15, unitario = catálogo / (1+tasa).
5. Totales: subtotal_15/5/0, objeto, exento, iva_15, iva_5.
6. Firma con `empresa_id = empresas.sri_id`. Local: 1.
7. Correo XML+PDF solo si receptor es cliente con correo.
8. Job cada 60s local / 3600s prod para pendiente, rechazo de red y SECUENCIAL REGISTRADO (recupera clave original, XML y autoriza con inventario).
9. Fuera: vendedor, categoría, crédito, CxC, logo real, NC/retenciones.

---

## 2. DISEÑO

### API Endpoints

- `GET/POST /api/v1/facturas`
- `GET/PUT/DELETE /api/v1/facturas/{id}`
- `POST /api/v1/facturas/{id}/enviar-sri`
- `POST /api/v1/facturas/desde-orden/{orden_id}`
- `GET /api/v1/facturas/{id}/xml`
- `GET /api/v1/formas-pago` y `GET /api/v1/formas-pago-sri`

### Frontend

| Página | Ruta |
|--------|------|
| Facturación | `/facturacion` |
| OT (botón Facturar + badge) | `/ordenes-trabajo` |

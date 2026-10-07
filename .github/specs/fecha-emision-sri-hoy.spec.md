---
id: SPEC-014
status: IMPLEMENTED
feature: fecha-emision-sri-hoy
created: 2026-10-06
updated: 2026-10-06
author: spec-generator
version: "1.0"
related-specs: ["SPEC-009"]
---

# Spec: Fecha de emisión al día de envío al SRI

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Al emitir una factura al SRI, `fecha_emision` y `creado_en` se alinean al día actual en Ecuador. El SRI no acepta comprobantes extemporáneos: la fecha del XML debe ser el día del envío, no la de la OT ni la del borrador.

### Requerimiento de Negocio
Si se factura una OT del 03/10/2026 y se emite el 06/10/2026, la factura debe salir con fecha 06/10/2026. Creación y emisión quedan iguales al momento de emitir.

### Historias de Usuario

#### HU-01: Emitir con fecha de hoy

```
Como:        Usuario del taller
Quiero:      Que al enviar al SRI la factura use la fecha de hoy
Para:        Evitar rechazos por fechas extemporáneas

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-009
Capa:        Backend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: fecha al emitir
  Dado que:  el borrador tiene fecha_emision anterior (p. ej. la de la OT)
  Cuando:    envío la factura al SRI
  Entonces:  fecha_emision y creado_en quedan en el día actual America/Guayaquil y el XML usa esa fecha
```

**Error Path**
```gherkin
CRITERIO-1.2: ya autorizada
  Dado que:  la factura está AUTORIZADA
  Cuando:    intento enviarla
  Entonces:  no se cambia la fecha y se rechaza el reenvío
```

**Edge Case**
```gherkin
CRITERIO-1.3: secuencial registrado
  Dado que:  el SRI ya registró el secuencial
  Cuando:    se recupera la autorización original
  Entonces:  no se altera la fecha del comprobante ya emitido
```

### Reglas de Negocio
1. Al firmar un BORRADOR o RECHAZADA se fuerza `fecha_emision = hoy (America/Guayaquil)` y `creado_en = ahora`.
2. No se cambia la fecha si se recupera un secuencial ya autorizado o si solo se consulta un PENDIENTE.
3. El borrador puede conservar la fecha original hasta el envío.

---

## 2. DISEÑO

### Modelos de Datos
Sin migración. Se reutilizan `facturas.fecha_emision` y `facturas.creado_en`.

### API Endpoints
Sin cambios de contrato. `POST /api/v1/facturas/{id}/enviar-sri` persiste y devuelve la fecha actualizada.

### Diseño Frontend
Sin cambios obligatorios. Tras el envío, el listado y el detalle muestran la fecha que devolvió la API.

### Notas de Implementación
Helper de dominio `hoy_sri()` / `alinear_fecha_emision_sri()`. Llamar solo antes de `firmar_factura`.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Helper de fecha SRI en zona America/Guayaquil
- [x] Alinear fecha al emitir BORRADOR o RECHAZADA
- [x] Persistir `creado_en` al guardar si viene en el dominio
- [x] No alterar fecha en recuperación de secuencial

### Frontend

#### Implementación
- [x] Aviso en el formulario y fecha actualizada tras enviar

### QA
- [x] Helper alinea fecha 2026-10-03 a hoy Ecuador
- [x] Actualizar estado spec: `status: IMPLEMENTED`

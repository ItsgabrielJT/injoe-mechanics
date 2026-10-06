---
id: SPEC-013
status: IMPLEMENTED
feature: reporte-ot
created: 2026-10-06
updated: 2026-10-06
author: spec-generator
version: "1.0"
related-specs: ["SPEC-007"]
---

# Spec: PDF de orden de trabajo y número clicable

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
El número de OT en la tabla abre el detalle. Se descarga un PDF tipo hoja de taller (marcos negros, fondo blanco) desde el detalle, desde cada fila y un formato vacío con logo y datos de empresa.

### Requerimiento de Negocio
Clic en el número abre el modal de detalles. Dentro del modal se descarga el reporte de la OT con el layout de la hoja de taller, sin colores de fondo, marcos negros. El mismo reporte se descarga desde un botón de documentos en la fila. Junto a Nueva orden, Descargar formato genera la hoja vacía solo con logo y datos de empresa.

### Historias de Usuario

#### HU-01: Abrir detalle desde el número

```
Como:        Usuario del taller
Quiero:      Hacer clic en el número de la OT
Para:        Ver el detalle sin buscar el icono de ojo

Prioridad:   Alta
Estimación:  XS
Dependencias: SPEC-007
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: clic numero
  Dado que:  hay órdenes en la tabla
  Cuando:    hago clic en el número
  Entonces:  se abre el modal de detalle de esa OT
```

#### HU-02: Descargar reporte y formato

```
Como:        Usuario del taller
Quiero:      Descargar el PDF de la OT o el formato en blanco
Para:        Imprimir la hoja de taller

Prioridad:   Alta
Estimación:  L
Dependencias: SPEC-007
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: pdf lleno
  Dado que:  abro el detalle o pulso documentos en la fila
  Cuando:    descargo el reporte
  Entonces:  el PDF tiene logo, empresa, datos de la OT, trabajos y repuestos, marcos negros y fondo blanco
```

**Happy Path**
```gherkin
CRITERIO-2.2: formato vacio
  Dado que:  estoy en la lista de OT
  Cuando:    pulso Descargar formato
  Entonces:  se descarga la misma hoja en blanco con logo y datos de empresa
```

### Reglas de Negocio
1. Fondo blanco y bordes negros; sin rellenos azules.
2. Trabajos = ítems con servicio; repuestos = ítems con producto.
3. Celular del cliente se obtiene con GET cliente si existe.
4. Formato vacío no incluye datos de OT.
5. Facturar sigue en la fila con otro icono; el documento es un botón nuevo en todas las filas.

---

## 2. DISEÑO

### Modelos de Datos
Sin cambios de esquema.

### API Endpoints
Sin endpoints nuevos. Se reutilizan `GET /ordenes-trabajo/{id}`, `GET /empresa/`, `GET /clientes/{id}`.

### Diseño Frontend

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `OrdenTrabajoPdfDocument` | `frontend/src/modules/ordenes-trabajo/presentation/pdf/orden-trabajo-pdf.tsx` | PDF lleno y formato |
| `OrdenesTrabajoPage` | `pages/ordenes-trabajo-page.tsx` | Número clicable, botones |
| `OrdenDetalleDialog` | `modals/orden-detalle-dialog.tsx` | Descargar reporte |

### Notas de Implementación
> `@react-pdf/renderer`. Siluetas con Svg. Logo via `rutaLogo` o `LOGO_SISTEMA`.

---

## 3. LISTA DE TAREAS

### Backend
- [ ] No aplica

### Frontend

#### Implementación
- [x] PDF lleno y formato vacío
- [x] Número clicable y botón documentos en fila
- [x] Descargar formato junto a Nueva orden
- [x] Botón en el modal de detalle

### QA
- [x] Verificar clic, detalle y las tres descargas
- [x] Actualizar estado spec: `status: IMPLEMENTED`

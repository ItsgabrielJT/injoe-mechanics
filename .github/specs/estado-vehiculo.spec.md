---
id: SPEC-011
status: IMPLEMENTED
feature: estado-vehiculo
created: 2026-10-03
updated: 2026-10-03
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-007"]
---

# Spec: Estado de vehículo

> **Estado:** `APPROVED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Módulo consultivo que lista los vehículos que ya tienen órdenes de trabajo, muestra las OT de cada uno, permite ver el detalle de cada OT y generar reportes PDF (listado filtrado e historial detallado) con preview y descarga.

### Requerimiento de Negocio
Tener el listado de los vehículos ya trabajados; de cada vehículo aparecen las órdenes de trabajo y se puede ver el detalle como en el módulo de OT. Filtrar por placa, modelo, marca, cliente, cédula y fechas. Obtener el reporte de los vehículos filtrados y un reporte a detalle de todos los trabajos de un vehículo, con preview y luego descarga.

### Historias de Usuario

#### HU-01: Listar vehículos trabajados y sus OT

```
Como:        Usuario del taller
Quiero:      Ver los vehículos que ya tienen órdenes de trabajo y expandir cada uno para ver sus OT
Para:        Consultar el historial de trabajo por vehículo

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-002, SPEC-007
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: listado de vehículos con OT
  Dado que:  existen vehículos con al menos una OT en el punto
  Cuando:    abro Estado de vehículo
  Entonces:  veo solo esos vehículos con conteo de OT, última fecha y totales
```

**Happy Path**
```gherkin
CRITERIO-1.2: expandir órdenes
  Dado que:  un vehículo tiene varias OT
  Cuando:    expando la fila
  Entonces:  aparecen esas OT (número, estado, técnico, fechas, totales) y puedo abrir el detalle
```

**Edge Case**
```gherkin
CRITERIO-1.3: sin OT
  Dado que:  un vehículo no tiene órdenes
  Cuando:    cargo el listado
  Entonces:  ese vehículo no aparece
```

#### HU-02: Filtrar por placa, marca, modelo, cliente, cédula y fechas

```
Como:        Usuario del taller
Quiero:      Filtrar el listado por placa, marca, modelo, cliente, cédula y rango de fechas
Para:        Encontrar el historial exacto que necesito

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: filtros combinados
  Dado que:  hay varios vehículos trabajados
  Cuando:    filtro por placa y un rango de fechas
  Entonces:  solo aparecen vehículos con OT en ese rango y el panel muestra solo esas OT
```

**Edge Case**
```gherkin
CRITERIO-2.2: filtro sin resultados
  Dado que:  ningún vehículo coincide
  Cuando:    aplico los filtros
  Entonces:  la tabla queda vacía y los totales son cero
```

#### HU-03: Detalle de OT igual al módulo de Órdenes

```
Como:        Usuario del taller
Quiero:      Ver el detalle de una OT desde este módulo
Para:        Revisar ítems, notas y totales sin salir del historial

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: modal de detalle
  Dado que:  expandí un vehículo
  Cuando:    abro el ojo de una OT
  Entonces:  veo el mismo modal (cliente, vehículo, ítems, notas, totales) en solo lectura
```

#### HU-04: Reportes PDF con preview y descarga

```
Como:        Usuario del taller
Quiero:      Previsualizar y descargar el reporte de vehículos filtrados y el historial detallado de un vehículo
Para:        Entregar o archivar el estado de los trabajos

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01, HU-02
Capa:        Frontend
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: reporte de listado
  Dado que:  apliqué filtros
  Cuando:    abro el reporte de vehículos
  Entonces:  veo un preview PDF del listado filtrado y puedo descargarlo
```

**Happy Path**
```gherkin
CRITERIO-4.2: reporte de historial
  Dado que:  selecciono un vehículo
  Cuando:    abro el reporte detallado
  Entonces:  veo un preview con ficha, OT e ítems del rango y puedo descargarlo
```

### Reglas de Negocio
1. Solo vehículos con al menos una OT en el tenant (`empresa_id` + `punto_emision_id`).
2. Filtros de fecha aplican a `ordenes_trabajo.fecha_inicio`.
3. Si hay fechas, el vehículo entra solo si tiene OT en el rango y el panel/historial muestra solo esas OT.
4. Módulo de solo lectura: no crea, edita ni elimina vehículos u OT.
5. El detalle de OT reutiliza `GET /api/v1/ordenes-trabajo/{id}`.
6. Totales del pie y del PDF son del filtro completo, no solo de la página.
7. Sin tablas nuevas ni migraciones.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Vehiculo` | `vehiculos` | ninguna | Se consulta |
| `Cliente` | `clientes` | ninguna | Se consulta |
| `OrdenTrabajo` | `ordenes_trabajo` | ninguna | Se agrega por vehículo |
| `OrdenTrabajoItem` | `ordenes_trabajo_items` | ninguna | Solo en historial detallado |

#### Campos del agregado `EstadoVehiculo`
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `vehiculo_id` | int | sí | PK del vehículo |
| `placa` / `marca` / `modelo` / `anio` / `color` | str / int | placa sí | Ficha |
| `cliente_id` / `cliente_nombres` / `cliente_identificacion` | int / str | id sí | Dueño |
| `ordenes_count` | int | sí | OT del filtro |
| `ultima_fecha` | datetime | no | Última `fecha_inicio` |
| `total` / `total_costo` / `total_utilidad` | decimal | sí | Suma de OT del filtro |
| `ordenes` | list | sí | Resumen sin ítems en listado; con ítems en historial |

### API Endpoints

#### GET /api/v1/estado-vehiculo/
- **Descripción**: Lista paginada de vehículos trabajados
- **Auth requerida**: sí
- **Query**: `placa`, `marca`, `modelo`, `cliente`, `identificacion`, `fecha_desde`, `fecha_hasta`, `page`, `size`
- **Response 200**: `{ data, total, page, size, pages, totales: { vehiculos, ordenes, total_costo, total_utilidad, total } }`
- **Response 401**: token ausente o expirado

#### GET /api/v1/estado-vehiculo/{vehiculo_id}
- **Descripción**: Historial del vehículo con OT e ítems (respeta fechas)
- **Auth requerida**: sí
- **Response 200**: `{ data: EstadoVehiculo }`
- **Response 404**: vehículo sin OT en el filtro o fuera del tenant

El detalle de una OT concreta reutiliza `GET /api/v1/ordenes-trabajo/{id}`.

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `EstadoVehiculoPage` | `modules/estado-vehiculo/presentation/pages/estado-vehiculo-page.tsx` | Filtros, tabla expandible, reportes |
| `OrdenDetalleDialog` | `modules/ordenes-trabajo/presentation/modals/orden-detalle-dialog.tsx` | Modal extraído; solo lectura aquí |
| `EstadoVehiculoReportePdf` | `modules/estado-vehiculo/presentation/pdf/estado-vehiculo-reporte-pdf.tsx` | PDF listado |
| `EstadoVehiculoHistorialPdf` | `modules/estado-vehiculo/presentation/pdf/estado-vehiculo-historial-pdf.tsx` | PDF historial |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Estado de vehículo | `app/(protegido)/estado-vehiculo/page.tsx` | `/estado-vehiculo` | sí |

#### Services
| Función | Archivo | Endpoint |
|---------|---------|----------|
| `listarEstadoVehiculo` | `estado-vehiculo-api.ts` | `GET /estado-vehiculo/` |
| `obtenerHistorialVehiculo` | `estado-vehiculo-api.ts` | `GET /estado-vehiculo/{id}` |
| `obtenerOrden` | `ordenes-api.ts` | `GET /ordenes-trabajo/{id}` |

### Arquitectura y Dependencias
- Paquetes nuevos: ninguno (`@react-pdf/renderer` ya existe)
- Sin migración Alembic
- Registrar router en `backend/app/main.py` y entrada NAV en `app-shell.tsx`
- Extender `MuiDataTable` con `getDetailPanelContent` / `getDetailPanelHeight` opcionales

### Notas de Implementación
> Módulo de agregación hexagonal que compone modelos existentes. El modal de OT se extrae para no duplicar UI. PDFs con preview iframe + blob, igual que facturación.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Crear módulo `estado_vehiculo` (domain, dto, ports, repository, use cases, schemas, router)
- [x] Endpoints listado e historial con filtros y totales del filtro
- [x] Registrar router y excepción 404 en `main.py`

### Frontend

#### Implementación
- [x] Extender `MuiDataTable` con panel expandible
- [x] Extraer `OrdenDetalleDialog` y usarlo en Órdenes y Estado de vehículo
- [x] Página, API client, ruta y menú
- [x] PDFs de listado e historial con preview y descarga

### QA
- [x] Verificar en navegador con injoedev / admin@techcorp.com
- [x] Actualizar estado spec: `status: IMPLEMENTED`

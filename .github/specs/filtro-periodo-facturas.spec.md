---
id: SPEC-017
status: IMPLEMENTED
feature: filtro-periodo-facturas
created: 2026-10-19
updated: 2026-10-19
author: spec-generator
version: "1.0"
related-specs: ["SPEC-009", "SPEC-010", "SPEC-016"]
---

# Spec: Filtro de periodo en la tabla de Facturación

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
La tabla de facturas solo filtra por búsqueda y estado. Se agrega un filtro de periodo (mes, trimestre, semestre, año o rango de fechas) donde el usuario elige el periodo concreto. El reporte PDF usa exactamente los mismos filtros que la tabla.

### Requerimiento de Negocio
Agregar filtros de periodo en la tabla: si escojo por mes pueda escoger el mes, si es por semestre el semestre. La búsqueda debe funcionar combinada y el reporte PDF debe estar conectado con esos filtros.

### Historias de Usuario

#### HU-01: Filtrar facturas por periodo

```
Como:        Usuario del taller
Quiero:      Elegir un mes, trimestre, semestre, año o rango de fechas en la tabla de facturas
Para:        Ver solo las facturas emitidas en ese periodo y sus totales

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-010
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

```gherkin
CRITERIO-1.1: periodo concreto
  Dado que:  estoy en la pestaña Facturas
  Cuando:    elijo "Mes" y selecciono febrero de 2026
  Entonces:  GET /facturas/ envía fecha_desde=2026-02-01 y fecha_hasta=2026-02-28
  Y:         la tabla y los totales del pie muestran solo ese periodo
  Y:         la paginación vuelve a la página 1

CRITERIO-1.2: combinación con búsqueda y estado
  Dado que:  hay un periodo seleccionado
  Cuando:    escribo en la búsqueda o cambio el estado
  Entonces:  el listado aplica los tres filtros a la vez en servidor

CRITERIO-1.3: sin periodo
  Dado que:  el periodo es "Todos"
  Cuando:    se carga la tabla
  Entonces:  no se envían fecha_desde ni fecha_hasta
```

#### HU-02: Reporte PDF con los filtros de la tabla

```
Como:        Usuario del taller
Quiero:      Que el Reporte PDF use la búsqueda, el estado y el periodo de la tabla
Para:        Obtener un documento coherente con lo que estoy viendo

Prioridad:   Alta
Estimación:  XS
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

```gherkin
CRITERIO-2.1: filas y totales coherentes
  Dado que:  la tabla tiene filtros activos
  Cuando:    genero el Reporte PDF
  Entonces:  las filas y los totales del PDF salen de la misma consulta filtrada
  Y:         el encabezado describe búsqueda, estado y periodo
```

#### HU-03: Descargar el reporte en Excel

```
Como:        Usuario del taller
Quiero:      Descargar el reporte de facturas también en Excel (.xlsx)
Para:        Trabajar los datos en una hoja de cálculo

Prioridad:   Media
Estimación:  XS
Dependencias: HU-02
Capa:        Frontend
```

#### Criterios de Aceptación — HU-03

```gherkin
CRITERIO-3.1: mismo contenido que el PDF
  Dado que:  abrí el Reporte PDF con filtros activos
  Cuando:    pulso "Descargar Excel"
  Entonces:  se descarga reporte-facturas.xlsx con el mismo encabezado de filtros, las mismas filas
  Y:         al final una fila "Total general" con subtotal, IVA 15%, IVA 5%, IVA 0% y total
```

### Reglas de Negocio
1. El periodo filtra por `fecha_emision` (fechas locales `YYYY-MM-DD`, ambos extremos inclusivos).
2. Años disponibles: el actual y los 5 anteriores.
3. En "Fechas" se puede dejar vacío uno de los extremos.
4. Valor inicial "Todos" para no cambiar el listado actual.

---

## 2. DISEÑO

### Modelos de Datos
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| Ninguna | — | sin cambio de esquema | Se reutilizan `fecha_desde`/`fecha_hasta` del listado |

### API Endpoints

#### GET /api/v1/facturas/
- **Descripción**: Ya acepta `fecha_desde` y `fecha_hasta` (`date`) y los aplica al listado paginado y a `totales`. Sin cambio.

### Diseño Frontend

#### Componentes
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `FiltroPeriodo` | `frontend/src/modules/facturacion/presentation/components/filtro-periodo.tsx` | `valor`, `onChange` | Selector de tipo y periodo concreto; exporta `rangoPeriodo` y `etiquetaPeriodo` |
| `FacturacionPage` | `frontend/src/modules/facturacion/presentation/pages/facturacion-page.tsx` | — | Integra el periodo en `filtros` y en el reporte |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `listarFacturas` | `facturacion-api.ts` | `GET /facturas/` |
| `listarFacturasReporte` | `facturacion-api.ts` | `GET /facturas/` (todas las páginas); ahora devuelve `{ data, totales }` |

### Arquitectura y Dependencias
- Paquetes nuevos requeridos: `exceljs` (carga diferida, solo al descargar el Excel)

---

## 3. LISTA DE TAREAS

### Backend
- [x] No aplica: el listado ya filtra por `fecha_emision`

### Frontend

#### Implementación
- [x] Crear `FiltroPeriodo`, `rangoPeriodo` y `etiquetaPeriodo`
- [x] Integrar el periodo en `filtros` de `FacturacionPage` y reiniciar la página
- [x] `listarFacturasReporte` devuelve totales; el PDF usa periodo y esos totales
- [x] Excel del reporte (`exceljs`) en `presentation/excel/factura-reporte-excel.ts` con fila de totales al final

#### Tests Frontend
- [ ] No generar tests (restricción del agente frontend)

### QA
- [x] Verificar en navegador: periodos, búsqueda combinada y PDF coherente con la tabla
- [x] Actualizar estado spec: `status: IMPLEMENTED`

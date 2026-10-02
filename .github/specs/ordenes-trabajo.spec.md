---
id: SPEC-007
status: APPROVED
feature: ordenes-trabajo
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002", "SPEC-003", "SPEC-005", "SPEC-006"]
---

# Spec: Órdenes de trabajo

> **Estado:** `APPROVED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
CRUD de órdenes de trabajo con cliente, vehículo, técnico, fechas Ecuador, km, repuestos, servicios, utilidad y cierre con salida de stock solo si el producto aplica inventario. Alta rápida de cliente+placa para lanzar la OT.

### Requerimiento de Negocio
Clonar la OT de Autocare sin factura, nota de venta ni evidencias. Estados: EN_PROCESO y CERRADA. Buscar vehículo por placa, marca, modelo, nombre o cédula. Crear cliente solo con nombre y placa.

### Historias de Usuario

#### HU-01: Crear y gestionar OT

```
Como:        Usuario del taller
Quiero:      Crear una OT con vehículo, técnico, ítems y notas
Para:        Registrar el trabajo y la utilidad

Prioridad:   Alta
Estimación:  XL
Dependencias: SPEC-006
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: alta
  Dado que:  hay cliente, vehículo y técnico
  Cuando:    guardo la OT con ítems de producto y servicio
  Entonces:  queda EN_PROCESO, fecha_inicio en America/Guayaquil y no hay movimiento de stock
```

**Happy Path**
```gherkin
CRITERIO-1.2: cierre
  Dado que:  la OT está EN_PROCESO
  Cuando:    la cierro
  Entonces:  pasa a CERRADA, fecha_entrega = ahora Ecuador y se crea SALIDA por productos con inventario
```

**Error Path**
```gherkin
CRITERIO-1.3: stock insuficiente
  Dado que:  un ítem aplica inventario y no hay stock
  Cuando:    intento cerrar
  Entonces:  409 y la OT sigue EN_PROCESO
```

#### HU-02: Alta rápida cliente y vehículo

```
Como:        Usuario del taller
Quiero:      Crear cliente y vehículo solo con nombre y placa
Para:        Lanzar la OT y completar la ficha después

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-002
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: nombre y placa
  Dado que:  no encuentro el vehículo
  Cuando:    envío nombres y placa
  Entonces:  se crea cliente sin cédula ni correo y el vehículo; ambos quedan seleccionados
```

**Error Path**
```gherkin
CRITERIO-2.2: placa duplicada
  Dado que:  la placa ya existe en el punto
  Cuando:    intento el alta rápida
  Entonces:  la API responde 409
```

### Reglas de Negocio
1. Estados: `EN_PROCESO`, `CERRADA`. Numeración `OT-000001` por empresa+punto.
2. Fecha inicio automática America/Guayaquil. Fecha entrega editable; al cerrar se pisa.
3. Ítem: producto XOR servicio. Proveedor y precio_compra opcionales (producción propia). Utilidad = total_venta - costo*cantidad.
4. Producto con inventario: bodega obligatoria; SALIDA solo al cerrar.
5. Producto sin inventario: sin bodega ni error de stock.
6. Upsert de precio de compra al guardar ítem solo si hay proveedor; no INGRESO.
7. OT cerrada de solo lectura. Eliminar solo EN_PROCESO.
8. `identificacion` de cliente nullable; unique parcial si no es null.
9. Alta rápida: `nombres` + `placa`, o `cliente_id` + `placa`.
10. Fuera de alcance: factura, evidencias, PDF, billed.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Cliente` | `clientes` | modificada | identificacion nullable |
| `OrdenTrabajo` | `ordenes_trabajo` | nueva | Cabecera |
| `OrdenTrabajoItem` | `ordenes_trabajo_items` | nueva | Líneas |

#### Campos — `ordenes_trabajo`
| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| `numero` | varchar(20) | sí |
| `cliente_id` / `vehiculo_id` / `tecnico_id` | int | sí |
| `estado` | enum | sí |
| `fecha_inicio` / `fecha_entrega` | timestamptz | inicio sí |
| `kilometraje` | numeric | no |
| `notas_generales` / `notas_tecnicas` | text | no |
| `total_productos` / `total_servicios` / `total_costo` / `total_utilidad` / `total` | numeric | sí |

#### Campos — `ordenes_trabajo_items`
| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| `producto_id` o `servicio_id` | int | uno |
| `proveedor_id` | int | no |
| `bodega_id` | int | si producto con inventario |
| `cantidad` / `precio_venta` / `precio_compra` | numeric | sí |
| `aplica_iva` / `tipo_impuesto` | bool / enum | sí |
| `utilidad` / `total` | numeric | sí |

### API Endpoints

- `GET/POST /api/v1/ordenes-trabajo` listado con `totales` del filtro
- `GET/PUT/DELETE /api/v1/ordenes-trabajo/{id}`
- `POST /api/v1/ordenes-trabajo/{id}/cerrar`
- `POST /api/v1/clientes/alta-rapida`
- `GET /api/v1/usuarios` técnicos del punto
- `GET /api/v1/vehiculos` search también por cliente

### Diseño Frontend

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `OrdenesTrabajoPage` | `modules/ordenes-trabajo/presentation/pages/ordenes-trabajo-page.tsx` | Tabla + detalle |
| `OrdenTrabajoFormDrawer` | `modules/ordenes-trabajo/presentation/forms/orden-trabajo-form-drawer.tsx` | Alta/edición |
| `MuiDataTable` | shared | Footer de totales |

#### Páginas
| Página | Ruta | Protegida |
|--------|------|-----------|
| Órdenes | `/ordenes-trabajo` | sí |

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [ ] SQL y migración `0006_ordenes_trabajo`
- [ ] Alta rápida y búsqueda de vehículos
- [ ] Módulo OT + cierre con SALIDA
- [ ] Listado de usuarios

### Frontend

#### Implementación
- [ ] Formulario con alta rápida nombre+placa
- [ ] Detalle, tabla con costo/utilidad/total y fila de totales

### QA
- [ ] Verificar en navegador con injoedev

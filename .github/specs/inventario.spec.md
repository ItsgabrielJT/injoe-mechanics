---
id: SPEC-005
status: IMPLEMENTED
feature: inventario
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: ["SPEC-001", "SPEC-003"]
---

# Spec: Inventario (categorías, bodegas, productos, movimientos)

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Gestionar el inventario del taller por empresa y punto de emisión: categorías, bodegas, productos con IVA, alertas de stock y movimientos agrupados en lotes (ingreso, salida, ajuste, transferencia y stock inicial). Sin ICE, IRBPNR, proveedores, otros precios ni escáner.

### Requerimiento de Negocio
Clonar el inventario de Autocare con las reglas de Mechanics: el producto exige código, nombre, precio de venta y tipo de impuesto; el precio puede incluir IVA o sumarlo; el stock inicial solo se registra al crear; los movimientos de varios productos comparten un código de lote; la transferencia es un tipo propio (no un par salida+ingreso).

### Historias de Usuario

#### HU-01: Registrar categorías y bodegas

```
Como:        Usuario del taller autenticado
Quiero:      Crear, editar y listar categorías y bodegas con buscador
Para:        Tener maestros listos antes de registrar productos

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-001
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: alta de categoría y bodega
  Dado que:  tengo un punto de emisión activo
  Cuando:    registro una categoría con nombre y una bodega con nombre
  Entonces:  quedan disponibles en el punto para asignarlas a productos
```

**Error Path**
```gherkin
CRITERIO-1.2: nombre obligatorio
  Dado que:  el nombre está vacío
  Cuando:    intento guardar categoría o bodega
  Entonces:  la API responde 400 y el formulario muestra el error
```

#### HU-02: Registrar producto

```
Como:        Usuario del taller
Quiero:      Registrar un producto con código, nombre, precio, IVA y categoría
Para:        Tener el catálogo listo para kardex y facturación

Prioridad:   Alta
Estimación:  L
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: alta mínima
  Dado que:  existe al menos una categoría en el punto
  Cuando:    envío código, nombre, precio de venta, tipo de impuesto y categoría
  Entonces:  se crea el producto en esa empresa y punto
```

**Happy Path**
```gherkin
CRITERIO-2.2: precio con IVA
  Dado que:  elijo sumar IVA 15% a un precio base 100
  Cuando:    guardo el producto
  Entonces:  el precio de venta persistido es 115.00
```

**Happy Path**
```gherkin
CRITERIO-2.3: stock inicial solo al crear
  Dado que:  indico bodega y cantidad inicial mayor a 0
  Cuando:    creo el producto
  Entonces:  se registra un movimiento STOCK_INICIAL con código de lote y la existencia en esa bodega
```

**Error Path**
```gherkin
CRITERIO-2.4: sin categoría
  Dado que:  no hay categorías o no envío categoria_id
  Cuando:    intento crear el producto
  Entonces:  la API responde 400
```

**Error Path**
```gherkin
CRITERIO-2.5: código duplicado
  Dado que:  ya existe ese código en el mismo punto
  Cuando:    creo otro producto con el mismo código
  Entonces:  la API responde 409
```

**Edge Case**
```gherkin
CRITERIO-2.6: edición sin stock inicial
  Dado que:  edito un producto existente
  Cuando:    abro el formulario
  Entonces:  no aparece el bloque de inventario inicial y no se crean movimientos
```

#### HU-03: Movimientos de stock en lote

```
Como:        Usuario del taller
Quiero:      Registrar ingreso, salida, ajuste o transferencia de varios productos
Para:        Actualizar existencias por bodega con un mismo código de lote

Prioridad:   Alta
Estimación:  L
Dependencias: HU-02
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: ingreso múltiple
  Dado que:  selecciono bodega y 5 productos con cantidad
  Cuando:    registro un ingreso
  Entonces:  los 5 quedan en un movimiento con el mismo código AAAA-NNNNN y se suma stock
```

**Happy Path**
```gherkin
CRITERIO-3.2: transferencia
  Dado que:  elijo bodega origen, bodega destino distinta y productos
  Cuando:    registro transferencia
  Entonces:  el tipo es TRANSFERENCIA, se resta en origen y se suma en destino, sin crear salida+ingreso
```

**Happy Path**
```gherkin
CRITERIO-3.3: ajuste
  Dado que:  el tipo de ajuste es INGRESO o EGRESO
  Cuando:    registro cantidades
  Entonces:  INGRESO suma y EGRESO resta; el stock no puede quedar negativo
```

**Error Path**
```gherkin
CRITERIO-3.4: stock insuficiente
  Dado que:  la cantidad de salida, egreso o transferencia supera la existencia
  Cuando:    intento guardar
  Entonces:  la API responde 409 y no se altera el stock
```

#### HU-04: Consultar, filtrar y reportar

```
Como:        Usuario del taller
Quiero:      Ver detalle del lote, filtrar movimientos y previsualizar reportes
Para:        Auditar el kardex del punto activo

Prioridad:   Alta
Estimación:  M
Dependencias: HU-03
Capa:        Ambas
```

#### Criterios de Aceptación — HU-04

**Happy Path**
```gherkin
CRITERIO-4.1: detalle de lote
  Dado que:  existe un movimiento con varias líneas
  Cuando:    abro el detalle
  Entonces:  veo código, tipo, bodega(s), nota, fecha y todas las líneas con stock después
```

**Happy Path**
```gherkin
CRITERIO-4.2: filtros
  Dado que:  hay movimientos en el punto
  Cuando:    filtro por productos, bodegas, tipo y periodo (mes, trimestre, semestre, año o rango)
  Entonces:  el listado y el reporte usan el mismo recorte
```

**Happy Path**
```gherkin
CRITERIO-4.3: alertas
  Dado que:  un producto activo tiene stock_minimo > 0 y stock total <= mínimo
  Cuando:    abro la pestaña Alertas
  Entonces:  aparece como warning o critical si stock <= 0 o <= 50% del mínimo
```

### Reglas de Negocio
1. Tenant desde JWT (`empresa_id`, `punto_emision_id`), nunca del body.
2. Una categoría por producto. Categoría y bodega se eligen con buscador.
3. Producto obligatorio: `codigo` (1–20), `nombre` (2–255), `precio_venta` (> 0), `tipo_impuesto`, `categoria_id` activa del punto.
4. `codigo` y `codigo_barras` (si viene) únicos por `(empresa_id, punto_emision_id)`. Código de barras alfanumérico opcional.
5. `tipo_impuesto`: `0`, `5`, `15`, `no_objeto`, `exento_iva`. El front calcula si el precio incluye IVA o se le suma; se persiste solo `precio_venta`.
6. No se persisten ICE, IRBPNR, moneda, proveedores ni otros precios. Precio en USD.
7. Stock inicial solo en creación. Tipo de movimiento `STOCK_INICIAL`.
8. Un lote de movimientos comparte `codigo` `AAAA-NNNNN` único en el punto.
9. Tipos de movimiento: `INGRESO`, `SALIDA`, `AJUSTE`, `TRANSFERENCIA`, `STOCK_INICIAL`.
10. Ajuste: `INGRESO` suma, `EGRESO` resta. Transferencia exige bodegas distintas.
11. Existencia por `(producto_id, bodega_id)` nunca negativa.
12. Fuera de alcance: scanner, proveedores, otros precios, guías de remisión.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `CategoriaProducto` | `categorias_producto` | nueva | Maestro de categorías |
| `Bodega` | `bodegas` | nueva | Maestro de bodegas |
| `Producto` | `productos` | nueva | Catálogo |
| `Existencia` | `existencias` | nueva | Stock por producto y bodega |
| `MovimientoInventario` | `movimientos_inventario` | nueva | Encabezado de lote |
| `LineaMovimientoInventario` | `movimientos_inventario_lineas` | nueva | Detalle del lote |

#### Campos — `productos` (resumen)
| Campo | Tipo | Obligatorio | Validación |
|-------|------|-------------|------------|
| `codigo` | varchar(20) | sí | unique empresa+punto |
| `codigo_barras` | varchar(64) | no | unique empresa+punto si no nulo |
| `nombre` | varchar(255) | sí | min 2 |
| `categoria_id` | int | sí | FK categorías del punto |
| `precio_venta` | numeric(10,2) | sí | > 0 |
| `tipo_impuesto` | enum tipo_impuesto | sí | reutiliza enum de servicios |
| `stock_minimo` | numeric(12,2) | no | ≥ 0, default 0 |

#### Campos — `movimientos_inventario`
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `codigo` | varchar(20) | sí | lote AAAA-NNNNN |
| `tipo` | enum | sí | INGRESO/SALIDA/AJUSTE/TRANSFERENCIA/STOCK_INICIAL |
| `bodega_id` | int | sí | origen |
| `bodega_destino_id` | int | si transferencia | destino distinto |
| `tipo_ajuste` | enum | si ajuste | INGRESO / EGRESO |

#### Índices / Constraints
- UNIQUE categorías/bodegas nombre por punto (case-insensitive vía índice único funcional o unique de nombre)
- UNIQUE productos `(empresa_id, punto_emision_id, codigo)`
- UNIQUE parcial código de barras
- UNIQUE existencias `(producto_id, bodega_id)`
- UNIQUE movimientos `(empresa_id, punto_emision_id, codigo)`

### API Endpoints

#### Categorías
- `GET/POST /api/v1/categorias-producto`
- `GET/PUT/DELETE /api/v1/categorias-producto/{id}`
- Query listado: `page`, `size`, `search`, `activo`

#### Bodegas
- `GET/POST /api/v1/bodegas`
- `GET/PUT/DELETE /api/v1/bodegas/{id}`
- Query: `page`, `size`, `search`, `activo`

#### Productos
- `GET /api/v1/productos` query `page`, `size`, `search`, `categoria_id`, `activo`
- `POST /api/v1/productos` incluye `stock_inicial` opcional `{ bodega_id, cantidad }`
- `GET/PUT/DELETE /api/v1/productos/{id}`
- `GET /api/v1/productos/{id}/existencias`
- `GET /api/v1/productos/{id}/kardex`
- `GET /api/v1/productos/alertas`
- `GET /api/v1/productos/reporte`

#### Movimientos
- `POST /api/v1/movimientos-inventario` body: tipo, bodega_id, bodega_destino_id?, tipo_ajuste?, nota, observacion, items[{producto_id, cantidad}]
- `GET /api/v1/movimientos-inventario` query `producto_ids`, `bodega_ids`, `tipo`, `fecha_desde`, `fecha_hasta`, `page`, `size`
- `GET /api/v1/movimientos-inventario/{id}`
- `GET /api/v1/movimientos-inventario/reporte`

Códigos: 201 alta, 400 validación, 404 no encontrado, 409 duplicado o stock insuficiente o recurso en uso.

### Diseño Frontend

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `ProductosPage` | `modules/inventario/presentation/pages/productos-page.tsx` | Tabs productos/alertas/categorías/bodegas |
| `MovimientosPage` | `modules/inventario/presentation/pages/movimientos-page.tsx` | Listado, filtros, detalle, reportes |
| `ProductoFormDrawer` | `modules/inventario/presentation/forms/producto-form-drawer.tsx` | Alta/edición con IVA y stock inicial |
| `MovimientoFormDrawer` | `modules/inventario/presentation/forms/movimiento-form-drawer.tsx` | Ingreso/salida/transferencia |
| `AjusteFormDrawer` | `modules/inventario/presentation/forms/ajuste-form-drawer.tsx` | Ajuste ingreso/egreso |
| `BuscadorSelect` | `modules/inventario/presentation/components/buscador-select.tsx` | Búsqueda de catálogos |
| `ReportePreview` | `modules/inventario/presentation/components/reporte-preview.tsx` | Modal imprimible |

#### Páginas
| Página | Ruta | Protegida |
|--------|------|-----------|
| Productos | `/productos` | sí |
| Movimientos | `/movimientos` | sí |

### Arquitectura y Dependencias
- Backend: módulo hexagonal `inventario`, Alembic `0004`, SQL `backend/sql/0004_inventario.sql`
- Frontend: MUI DataGrid, react-hook-form, zod, preview print CSS
- Reutiliza enum PG `tipo_impuesto`

### Notas de Implementación
> La transferencia es un encabezado con origen y destino; cada línea guarda `stock_origen_despues` y `stock_destino_despues`.
> `STOCK_INICIAL` solo lo crea el caso de uso de producto, no el endpoint público de movimientos.
> El listado de movimientos es por lote (encabezado), no por línea suelta.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] SQL y migración `0004_inventario`
- [x] Domain, ports, use cases, adapters y routers
- [x] Registrar routers, models y excepciones en `main.py` y `alembic/env.py`

### Frontend

#### Implementación
- [x] Módulo inventario: catálogo, movimientos, reportes
- [x] Rutas `/productos`, `/movimientos` y nav

### QA
- [x] Verificar en navegador con `injoedev` / `admin@techcorp.com` / `admin123`

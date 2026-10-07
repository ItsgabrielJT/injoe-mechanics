---
id: SPEC-016
status: IMPLEMENTED
feature: busqueda-listados-modulos
created: 2026-10-06
updated: 2026-10-06
author: spec-generator
version: "1.0"
related-specs: ["SPEC-012", "SPEC-002", "SPEC-003", "SPEC-005"]
---

# Spec: Búsqueda remota sin recorte en facturación, clientes y productos

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Las barras de listado de Facturación, Estado de vehículo, Productos y Clientes ya filtran en BD. Esta spec corrige los buscadores internos que recortan resultados (`size: 20` en factura, `size: 8` en transferencia, catálogo de 200 en productos) para consultar la API con `search` y acumular todas las páginas.

### Requerimiento de Negocio
Revisar que en facturación, estado de vehículo, productos y clientes las APIs no limiten los resultados al usar la barra de búsqueda, sino que busquen las existencias en BD.

### Historias de Usuario

#### HU-01: Buscar ítems y cliente en factura sin tope

```
Como:        Usuario del taller
Quiero:      Encontrar cualquier cliente, producto o servicio al facturar
Para:        No perder coincidencias que existen en BD fuera de los primeros 20

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-012, SPEC-005
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

```gherkin
CRITERIO-1.1: busqueda remota paginada
  Dado que:  hay más de 20 clientes o productos/servicios activos que coinciden
  Cuando:    escribo 3 o más caracteres en el buscador del drawer de factura
  Entonces:  se consultan las APIs con search y se listan todas las páginas, no solo size 20

CRITERIO-1.2: umbral
  Dado que:  el buscador de cliente o de ítems está abierto
  Cuando:    el texto tiene menos de 3 caracteres
  Entonces:  no se llama a la API y se indica el mínimo de caracteres
```

#### HU-02: Transferir vehículo a cualquier cliente

```
Como:        Usuario del taller
Quiero:      Buscar el cliente destino por nombre o cédula sin tope de 8
Para:        Transferir el vehículo al cliente correcto aunque no esté en los primeros resultados

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-002
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

```gherkin
CRITERIO-2.1: destino completo
  Dado que:  abro la transferencia de vehículos
  Cuando:    escribo 3 o más caracteres en el selector de destino
  Entonces:  GET /clientes/?search= recorre todas las páginas y muestra todas las coincidencias salvo el origen
```

#### HU-03: Filtrar productos en proveedores y reporte

```
Como:        Usuario del taller
Quiero:      Buscar cualquier producto al asignar costos o filtrar el reporte
Para:        No quedar limitado a los primeros 200 del catálogo

Prioridad:   Media
Estimación:  S
Dependencias: SPEC-003
Capa:        Frontend
```

#### Criterios de Aceptación — HU-03

```gherkin
CRITERIO-3.1: sin precarga
  Dado que:  abro la pestaña Proveedores o el modal de reporte
  Cuando:    escribo 3 o más caracteres
  Entonces:  no se precarga size 200; la API filtra por search y se acumulan todas las páginas
```

### Reglas de Negocio
1. Mínimo 3 caracteres (`trim`) antes de llamar API en los buscadores internos de esta spec.
2. El filtrado ocurre en servidor con `search`; el frontend acumula páginas (`size` 200) hasta `pages`.
3. Las barras de listado de Facturación, Estado de vehículo, Productos y Clientes no cambian: ya buscan en BD.
4. Un ítem o cliente ya seleccionado sigue visible aunque no esté en la última búsqueda.
5. Estado de vehículo no se modifica (barra ya es server-side; OT expandidas vienen completas).

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| Ninguna | — | sin cambio de esquema | Solo consumo frontend de APIs existentes |

#### Índices / Constraints
- Sin índices nuevos. Se reutilizan `ILIKE` de productos, servicios y clientes.

### API Endpoints

#### GET /api/v1/productos/
- **Descripción**: Listado con `search`, `page`, `size` (máx. 1000). Sin cambio.

#### GET /api/v1/servicios/
- **Descripción**: Listado con `search`, `page`, `size`. Sin cambio.

#### GET /api/v1/clientes/
- **Descripción**: Listado con `search`, `page`, `size`. Sin cambio.

### Diseño Frontend

#### Componentes modificados
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `listarTodasLasPaginas` | `frontend/src/shared/lib/listar-todas-las-paginas.ts` | `fetchPage`, `size` | Helper compartido; OT reexporta |
| `FacturaFormDrawer` | `frontend/src/modules/facturacion/presentation/forms/factura-form-drawer.tsx` | token | Cliente e ítems sin `size: 20` |
| `SelectorCliente` | `frontend/src/modules/clientes/presentation/modals/vehiculos-dialog.tsx` | token, search | Destino sin `size: 8` |
| `BuscadorMultiple` | `frontend/src/modules/inventario/presentation/components/buscador-select.tsx` | `onBuscar`, `minCaracteres` | Búsqueda remota |
| `ProductosPage` | `frontend/src/modules/inventario/presentation/pages/productos-page.tsx` | — | Sin precarga de 200 |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `listarProductos` | `inventario-api.ts` | `GET /productos/` |
| `listarServicios` | `servicios-api.ts` | `GET /servicios/` |
| `listarClientes` | `clientes-api.ts` | `GET /clientes/` |

### Arquitectura y Dependencias
- Paquetes nuevos requeridos: ninguno
- Servicios externos: ninguno

### Notas de Implementación
> Extraer `listarTodasLasPaginas` a `shared/lib` y reexportar desde OT. `BuscadorMultiple` con `onBuscar` no hace `slice(0, 8)` de resultados remotos.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Backend

#### Implementación
- [x] No aplica: las APIs de listado ya filtran con `search` antes de paginar

#### Tests Backend
- [ ] No aplica

### Frontend

#### Implementación
- [x] Mover `listarTodasLasPaginas` a `frontend/src/shared/lib/listar-todas-las-paginas.ts` y reexportar en OT
- [x] Drawer factura: clientes/productos/servicios con helper + umbral 3
- [x] Selector transferencia: search paginado completo
- [x] `BuscadorMultiple`: `onBuscar` + `minCaracteres`
- [x] Productos: pestaña proveedores y reporte sin precarga 200

#### Tests Frontend
- [ ] No generar tests (restricción del agente frontend)

### QA
- [x] Verificar en navegador: factura, transferencia y productos encuentran coincidencias fuera del tope previo
- [x] Actualizar estado spec: `status: IMPLEMENTED`

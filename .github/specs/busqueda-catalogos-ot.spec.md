---
id: SPEC-012
status: IMPLEMENTED
feature: busqueda-catalogos-ot
created: 2026-10-06
updated: 2026-10-06
author: spec-generator
version: "1.0"
related-specs: ["SPEC-007", "SPEC-002", "SPEC-003", "SPEC-005", "SPEC-006"]
---

# Spec: Búsqueda remota de catálogos en órdenes de trabajo

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Al crear o editar una orden de trabajo, los selectores de producto, servicio, proveedor, cliente, placa y modelo no precargan el catálogo. Listan coincidencias solo después de tres caracteres, consultando la API con `search` y acumulando todas las páginas.

### Requerimiento de Negocio
Dentro del módulo de órdenes de trabajo, al crear uno nuevo, buscar productos o servicios no lista todos los resultados porque está limitado a los primeros 100. La API debe listar solo cuando el usuario escriba después de los tres primeros caracteres e ir listando todos los productos o servicios sin limitarle. Lo mismo aplica a la búsqueda por cliente, placa y modelo. En facturación el mismo error ya se resolvió con búsqueda remota.

### Historias de Usuario

#### HU-01: Buscar productos, servicios y proveedores al tipear

```
Como:        Usuario del taller
Quiero:      Buscar productos, servicios y proveedores escribiendo al menos 3 caracteres
Para:        Encontrar ítems aunque el catálogo tenga más de 100 registros

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-007
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: busqueda remota
  Dado que:  hay más de 100 productos o servicios activos
  Cuando:    escribo 3 o más caracteres en el buscador de la línea
  Entonces:  la API filtra por search y se listan todas las coincidencias, no solo los primeros 100 del catálogo
```

**Error Path**
```gherkin
CRITERIO-1.2: menos de tres caracteres
  Dado que:  el buscador de producto, servicio o proveedor está abierto
  Cuando:    el texto tiene menos de 3 caracteres
  Entonces:  no se llama a la API y se indica que hay que escribir al menos 3 caracteres
```

**Edge Case**
```gherkin
CRITERIO-1.3: mas de una pagina
  Dado que:  el término coincide con más de 200 registros
  Cuando:    se completa la búsqueda
  Entonces:  el frontend acumula todas las páginas hasta agotar pages
```

#### HU-02: Buscar cliente, placa y modelo sin recorte

```
Como:        Usuario del taller
Quiero:      Buscar vehículo por placa, marca, modelo, cliente o cédula con 3 caracteres
Para:        Encontrar el vehículo correcto aunque haya muchos registros

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-002, SPEC-007
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: vehiculo y cliente
  Dado que:  el drawer de OT está abierto
  Cuando:    escribo 3 o más caracteres en el campo de placa/cliente
  Entonces:  se consultan GET /vehiculos y GET /clientes con search y se muestran todas las coincidencias
```

**Error Path**
```gherkin
CRITERIO-2.2: umbral
  Dado que:  el campo de búsqueda de vehículo está vacío o con 1-2 caracteres
  Cuando:    dejo de escribir
  Entonces:  no hay llamados a la API ni listas de resultados
```

### Reglas de Negocio
1. Mínimo 3 caracteres (`trim`) antes de listar o llamar API en producto, servicio, proveedor, cliente, placa, marca y modelo.
2. No precargar catálogos de productos, servicios ni proveedores al abrir el módulo de OT.
3. El filtrado ocurre en servidor con el query `search` existente; el frontend acumula páginas (`size` 200) hasta `pages`.
4. Un ítem ya seleccionado (edición o línea en curso) sigue visible aunque no esté en la última búsqueda.
5. El tope de `size` por request en vehículos y proveedores sube a 1000, alineado con productos, servicios y clientes.
6. Facturación no cambia en este ciclo.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| Ninguna | — | sin cambio de esquema | Solo query `size` y consumo frontend |

#### Índices / Constraints
- Sin índices nuevos. Se reutilizan `ILIKE` existentes en productos, servicios, clientes, vehículos y proveedores.

### API Endpoints

#### GET /api/v1/productos/
- **Descripción**: Listado con `search`, `page`, `size` (máx. 1000, ya existente)
- **Auth requerida**: sí

#### GET /api/v1/servicios/
- **Descripción**: Listado con `search`, `page`, `size` (máx. 1000, ya existente)
- **Auth requerida**: sí

#### GET /api/v1/clientes/
- **Descripción**: Listado con `search`, `page`, `size` (máx. 1000, ya existente)
- **Auth requerida**: sí

#### GET /api/v1/vehiculos/
- **Descripción**: Listado con `search` (placa, marca, modelo, cliente, cédula)
- **Auth requerida**: sí
- **Cambio**: `size` máx. de 100 a 1000

#### GET /api/v1/clientes/{id}/vehiculos
- **Descripción**: Vehículos de un cliente
- **Auth requerida**: sí
- **Cambio**: `size` máx. de 100 a 1000

#### GET /api/v1/proveedores/
- **Descripción**: Listado con `search`
- **Auth requerida**: sí
- **Cambio**: `size` máx. de 200 a 1000

### Diseño Frontend

#### Componentes modificados
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `BuscadorSelect` | `frontend/src/modules/inventario/presentation/components/buscador-select.tsx` | `onBuscar`, `minCaracteres`, `opcionFija` | Gate de 3 caracteres y resultados remotos sin slice |
| `OrdenTrabajoFormDrawer` | `frontend/src/modules/ordenes-trabajo/presentation/forms/orden-trabajo-form-drawer.tsx` | token, técnicos, bodegas, categorías | Búsqueda remota paginada |
| `OrdenesTrabajoPage` | `frontend/src/modules/ordenes-trabajo/presentation/pages/ordenes-trabajo-page.tsx` | — | Deja de precargar productos/servicios/proveedores |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `listarProductos` | `inventario-api.ts` | `GET /productos/` |
| `listarServicios` | `servicios-api.ts` | `GET /servicios/` |
| `listarProveedores` | `proveedores-api.ts` | `GET /proveedores/` |
| `listarVehiculos` | `clientes-api.ts` | `GET /vehiculos/` |
| `listarClientes` | `clientes-api.ts` | `GET /clientes/` |

### Arquitectura y Dependencias
- Paquetes nuevos requeridos: ninguno
- Servicios externos: ninguno

### Notas de Implementación
> Helper `listarTodasLasPaginas` en el módulo de OT. Cache `Map` de productos/servicios hallados para `elegirProducto`/`elegirServicio`. Facturación no se modifica.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Backend

#### Implementación
- [x] Subir `size` máx. a 1000 en `GET /vehiculos/` y `GET /clientes/{id}/vehiculos`
- [x] Subir `size` máx. a 1000 en `GET /proveedores/`

#### Tests Backend
- [ ] No aplica: cambio de tope Query, sin lógica nueva de dominio

### Frontend

#### Implementación
- [x] `BuscadorSelect`: `minCaracteres`, mensaje de umbral, sin slice remoto
- [x] Drawer OT: `onBuscar` producto/servicio/proveedor + cache + `opcionFija`
- [x] Drawer OT: búsqueda cliente/placa/modelo con umbral 3 y paginación completa
- [x] Página OT: quitar precarga de productos, servicios y proveedores

#### Tests Frontend
- [ ] No generar tests (restricción del agente frontend)

### QA
- [x] Verificar en navegador: 1–2 caracteres no listan; 3+ listan coincidencias fuera del top 100
- [x] Editar OT existente muestra el ítem ya seleccionado
- [x] Actualizar estado spec: `status: IMPLEMENTED`

---
id: SPEC-003
status: IMPLEMENTED
feature: servicios
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: ["SPEC-001", "SPEC-002"]
---

# Spec: Catálogo de servicios

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Permitir registrar y gestionar los servicios del taller por empresa y punto de emisión. El formulario exige solo nombre, precio de venta (USD) y tipo de impuesto. El código se genera de forma aleatoria con formato `AAAA-NNNNN` (ej. `LRCT-00212`) y no se repite en el mismo punto. No se persisten ICE, IRBPNR, moneda ni costo externo.

### Requerimiento de Negocio
Clonar el catálogo de servicios de Autocare sin ICE, IRBPNR ni selector de moneda (siempre USD). El costo externo no va en la misma tabla; se manejará después. Tabla con MUI DataGrid. Validaciones visibles en el formulario, alineadas a los límites de BD.

### Historias de Usuario

#### HU-01: Registrar servicio

```
Como:        Usuario del taller autenticado
Quiero:      Registrar un servicio con nombre, precio y tipo de impuesto
Para:        Tener el catálogo del punto activo listo para órdenes y facturación

Prioridad:   Alta
Estimación:  L
Dependencias: SPEC-001
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: alta mínima
  Dado que:  tengo un punto de emisión activo
  Cuando:    envío nombre, precio de venta mayor a 0 y tipo de impuesto
  Entonces:  se crea el servicio en esa empresa y punto con código generado AAAA-NNNNN
```

**Happy Path**
```gherkin
CRITERIO-1.2: código personalizado
  Dado que:  el formulario permite editar o regenerar el código
  Cuando:    guardo un código propio único en el punto
  Entonces:  se persiste ese código
```

**Error Path**
```gherkin
CRITERIO-1.3: campos obligatorios
  Dado que:  falta nombre, precio o tipo de impuesto
  Cuando:    intento guardar
  Entonces:  la API responde 400 y el formulario muestra el error bajo el campo
```

**Error Path**
```gherkin
CRITERIO-1.4: código duplicado en el mismo punto
  Dado que:  ya existe ese código en la misma empresa y punto
  Cuando:    intento crear otro servicio con el mismo código
  Entonces:  la API responde 409
```

**Edge Case**
```gherkin
CRITERIO-1.5: mismo código en otro punto
  Dado que:  el código existe en el punto 001
  Cuando:    lo registro en el punto 002 de la misma empresa
  Entonces:  se crea el servicio porque la unicidad es por empresa y punto
```

#### HU-02: Listar, buscar y filtrar servicios

```
Como:        Usuario del taller
Quiero:      Buscar por código, nombre o descripción y filtrar por categoría y estado
Para:        Encontrar un servicio rápido en el punto activo

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: búsqueda y filtros
  Dado que:  hay servicios en el punto activo
  Cuando:    busco o filtro por categoría o estado
  Entonces:  la tabla muestra solo coincidencias de ese punto
```

#### HU-03: Editar y eliminar servicio

```
Como:        Usuario del taller
Quiero:      Editar o eliminar un servicio del catálogo
Para:        Mantener precios e impuestos actualizados

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: edición
  Dado que:  existe un servicio
  Cuando:    cambio el precio o el nombre
  Entonces:  se actualiza y permanece en el mismo punto
```

**Happy Path**
```gherkin
CRITERIO-3.2: eliminación
  Dado que:  confirmo eliminar un servicio
  Cuando:    acepto el diálogo
  Entonces:  se elimina de forma permanente
```

### Reglas de Negocio
1. Obligatorios: `nombre` (2–255), `precio_venta` (> 0, máximo 99999999.99), `tipo_impuesto`.
2. `codigo` se genera si viene vacío: 4 letras mayúsculas + guion + 5 dígitos (`LRCT-00212`). Único por `(empresa_id, punto_emision_id, codigo)`. Máximo 20 caracteres.
3. Opcionales: `descripcion` (máx. 500), `categoria`, `aplica_iva` (default true), `peso` (≥ 0), `activo` (default true).
4. No se persisten ICE, IRBPNR, moneda ni costo externo. El precio siempre se interpreta en USD.
5. Tenant desde JWT (`empresa_id`, `punto_emision_id`), nunca del body.
6. El listado solo muestra los servicios del punto activo.
7. `tipo_impuesto`: `0`, `5`, `15`, `no_objeto`, `exento_iva`.
8. `categoria`: `consultoria`, `desarrollo`, `mantenimiento`, `soporte`, `capacitacion`, `otros`.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Servicio` | `servicios` | nueva | Catálogo de servicio por empresa y punto |

#### Campos — `servicios`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | int | sí | PK | Identificador |
| `empresa_id` | int | sí | FK empresas | Tenant |
| `punto_emision_id` | int | sí | FK puntos_emision | Punto operativo |
| `codigo` | varchar(20) | sí (auto) | unique por empresa+punto | Código del servicio |
| `nombre` | varchar(255) | sí | min 2 | Nombre |
| `descripcion` | varchar(500) | no | max 500 | Descripción |
| `categoria` | enum categoria_servicio | no | valores del enum | Categoría |
| `precio_venta` | numeric(10,2) | sí | > 0 | Precio de venta en USD |
| `aplica_iva` | bool | no | default true | Si aplica IVA |
| `tipo_impuesto` | enum tipo_impuesto | sí | 0 / 5 / 15 / no_objeto / exento_iva | Tipo de impuesto |
| `peso` | numeric(10,2) | no | ≥ 0 | Peso opcional |
| `activo` | bool | sí | default true | Estado |
| `creado_en` / `actualizado_en` | timestamptz | sí | | Auditoría |

#### Índices / Constraints
- UNIQUE(`servicios.empresa_id`, `servicios.punto_emision_id`, `servicios.codigo`)
- INDEX búsqueda por `codigo` y `nombre`

### API Endpoints

#### GET /api/v1/servicios
- **Auth**: sí (contexto de punto)
- **Query**: `page`, `size`, `search`, `categoria`, `activo`
- **Response 200**: lista paginada

#### POST /api/v1/servicios
- **Auth**: sí
- **Request**: nombre, precio_venta, tipo_impuesto; resto opcional
- **Response 201**: servicio creado
- **Response 400**: validación
- **Response 409**: código duplicado en el punto

#### GET /api/v1/servicios/{id}
- **Response 200 / 404**

#### PUT /api/v1/servicios/{id}
- **Response 200 / 404 / 409**

#### DELETE /api/v1/servicios/{id}
- **Response 204 / 404**

### Diseño Frontend

#### Componentes
| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `MuiDataTable` | `shared/components/MuiDataTable.tsx` | DataGrid reutilizable |
| `ServiciosPage` | `modules/servicios/presentation/pages/servicios-page.tsx` | Listado |
| `ServicioFormDrawer` | `modules/servicios/presentation/forms/servicio-form-drawer.tsx` | Alta/edición |

#### Páginas
| Página | Ruta | Protegida |
|--------|------|-----------|
| Servicios | `/servicios` | sí |

#### Validaciones no funcionales (UX)
- Errores bajo cada campo y resumen al enviar.
- `maxLength` alineado a BD; contador en descripción.
- Debounce de búsqueda, loading/error/éxito.
- No enviar `empresa_id` / `punto_emision_id` desde el body.

### Arquitectura y Dependencias
- Backend: módulo hexagonal `servicios`, Alembic `0003`, SQL en `backend/sql`
- Frontend: MUI X DataGrid, react-hook-form, zod
- Costo externo: fuera de alcance

### Notas de Implementación
> El código NO es único solo por empresa: es único por `(empresa_id, punto_emision_id, codigo)`.
> Si el código llega vacío, el backend lo genera y reintenta colisiones.
> El listado de servicios se filtra siempre por el punto activo del JWT.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] SQL y migración `0003_servicios`
- [x] Domain, ports, use cases, adapters y router de servicios
- [x] Registrar router y excepciones en `main.py`

### Frontend

#### Implementación
- [x] Módulo servicios: tabla, drawer, API
- [x] Ruta `/servicios` y nav en layout protegido

### QA
- [x] Verificar en navegador con `admin@techcorp.com` / `admin123`

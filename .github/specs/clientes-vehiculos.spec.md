---
id: SPEC-002
status: IMPLEMENTED
feature: clientes-vehiculos
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: ["SPEC-001"]
---

# Spec: Clientes con vehículos

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Permitir registrar y gestionar clientes del taller junto con sus vehículos. El formulario exige solo cédula/RUC, nombres y al menos un correo. Se pueden guardar varios correos, teléfonos y direcciones. Desde la tabla se ven y registran vehículos de forma rápida. La unicidad de identificación y de placa es por empresa **y** punto de emisión.

### Requerimiento de Negocio
Clonar los datos de Autocare (sin categoría, tipo de crédito, % retención ni contribuyente). Tabla con MUI DataGrid reutilizable. Color primario naranja en login, selector de punto y el resto de la app.

### Historias de Usuario

#### HU-01: Registrar cliente

```
Como:        Usuario del taller autenticado
Quiero:      Registrar un cliente con cédula, nombres y correo
Para:        Tener su ficha y asociarle vehículos

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
  Cuando:    envío identificación, nombres y al menos un correo válido
  Entonces:  se crea el cliente en esa empresa y punto
```

**Happy Path**
```gherkin
CRITERIO-1.2: contactos múltiples
  Dado que:  el formulario permite varios correos, teléfonos y direcciones
  Cuando:    agrego más de uno y marco un principal
  Entonces:  se persisten las listas JSON con el índice principal
```

**Error Path**
```gherkin
CRITERIO-1.3: campos obligatorios
  Dado que:  falta cédula, nombres o correo
  Cuando:    intento guardar
  Entonces:  la API responde 400 y el formulario muestra el error
```

**Error Path**
```gherkin
CRITERIO-1.4: identificación duplicada en el mismo punto
  Dado que:  ya existe esa cédula en la misma empresa y punto
  Cuando:    intento crear otro cliente con la misma identificación
  Entonces:  la API responde 409
```

**Edge Case**
```gherkin
CRITERIO-1.5: misma cédula en otro punto
  Dado que:  la cédula existe en el punto 001
  Cuando:    la registro en el punto 002 de la misma empresa
  Entonces:  se crea el cliente porque la unicidad es por empresa y punto
```

#### HU-02: Listar, buscar y filtrar clientes

```
Como:        Usuario del taller
Quiero:      Buscar por nombres, correo o cédula, filtrar columnas y ocultarlas
Para:        Encontrar un cliente rápido

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: búsqueda
  Dado que:  hay clientes en el punto activo
  Cuando:    busco por nombre, correo o cédula
  Entonces:  la tabla muestra solo coincidencias de ese punto
```

#### HU-03: Vehículos del cliente

```
Como:        Usuario del taller
Quiero:      Ver y registrar vehículos desde la tabla o el formulario
Para:        Asociar placas sin salir del flujo de clientes

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: alta rápida
  Dado que:  existe un cliente
  Cuando:    registro un vehículo solo con placa
  Entonces:  queda asociado al cliente y aparece en la columna de vehículos
```

**Error Path**
```gherkin
CRITERIO-3.2: placa duplicada en el mismo punto
  Dado que:  la placa ya existe en la misma empresa y punto
  Cuando:    intento registrarla de nuevo
  Entonces:  la API responde 409
```

### Reglas de Negocio
1. Obligatorios de cliente: `identificacion`, `nombres`, al menos un correo válido.
2. Obligatorio de vehículo: `placa`.
3. Unicidad de `identificacion`: `(empresa_id, punto_emision_id, identificacion)`.
4. Unicidad de `placa`: `(empresa_id, punto_emision_id, placa)`.
5. Tenant desde JWT (`empresa_id`, `punto_emision_id`), nunca del body.
6. No se persisten categoría, tipo de crédito, % retención ni contribuyente.
7. Identificación: 10 dígitos (cédula) o 13 (RUC).
8. El listado de clientes solo muestra los del punto activo.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Cliente` | `clientes` | nueva | Ficha de cliente por empresa y punto |
| `Vehiculo` | `vehiculos` | nueva | Vehículo asociado a un cliente |

#### Campos — `clientes`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | int | sí | PK | Identificador |
| `empresa_id` | int | sí | FK empresas | Tenant |
| `punto_emision_id` | int | sí | FK puntos_emision | Punto operativo |
| `identificacion` | varchar(13) | sí | 10 o 13 dígitos | Cédula o RUC |
| `tipo_cliente` | varchar(30) | sí | PERSONA_NATURAL / PERSONA_JURIDICA | Tipo |
| `nombres` | varchar(255) | sí | min 2 | Nombres o razón social de factura |
| `razon_social` | varchar(255) | no | | Nombre comercial |
| `fecha_nacimiento` | date | no | | Fecha de nacimiento |
| `provincia` / `canton` / `parroquia` | varchar(100) | no | | Ubicación |
| `direcciones` / `telefonos` / `correos` | jsonb | no | correos: al menos 1 | Contactos múltiples |
| `indice_*_principal` | int | no | | Índice del valor principal |
| `direccion_fiscal` / `telefono_fiscal` / `correo_fiscal` | text/varchar | no | | Datos fiscales |
| `notas` | text | no | | Observaciones |
| `activo` | bool | sí | default true | Estado |
| `creado_en` / `actualizado_en` | timestamptz | sí | | Auditoría |

#### Campos — `vehiculos`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | int | sí | PK | Identificador |
| `empresa_id` | int | sí | FK empresas | Tenant |
| `punto_emision_id` | int | sí | FK puntos_emision | Punto operativo |
| `cliente_id` | int | sí | FK clientes | Dueño |
| `placa` | varchar(20) | sí | unique por empresa+punto | Placa |
| `marca` / `modelo` / `anio` / `tipo` / `color` / `combustible` / `cilindrada` / `transmision` / `notas` | varios | no | | Datos opcionales |
| `activo` | bool | sí | default true | Estado |

#### Índices / Constraints
- UNIQUE(`clientes.empresa_id`, `clientes.punto_emision_id`, `clientes.identificacion`)
- UNIQUE(`vehiculos.empresa_id`, `vehiculos.punto_emision_id`, `vehiculos.placa`)
- INDEX búsqueda por nombres, identificación
- ON DELETE CASCADE de vehículos al eliminar cliente

### API Endpoints

#### GET /api/v1/clientes
- **Auth**: sí (contexto de punto)
- **Query**: `page`, `size`, `search`, `tipo_cliente`, `activo`
- **Response 200**: lista paginada con `total_vehiculos` y `placas`

#### POST /api/v1/clientes
- **Auth**: sí
- **Request**: identificación, nombres, correos[], campos opcionales
- **Response 201**: cliente creado
- **Response 400**: validación
- **Response 409**: identificación duplicada en el punto

#### GET /api/v1/clientes/{id}
- **Response 200 / 404**

#### PUT /api/v1/clientes/{id}
- **Response 200 / 404 / 409**

#### DELETE /api/v1/clientes/{id}
- **Response 204 / 404**

#### GET /api/v1/clientes/{id}/vehiculos
- **Response 200**: vehículos del cliente

#### GET /api/v1/vehiculos
- **Query**: `cliente_id`, `search`, `page`, `size`

#### POST /api/v1/vehiculos
- **Request**: `cliente_id`, `placa`, resto opcional
- **Response 201 / 404 cliente / 409 placa**

#### GET/PUT/DELETE /api/v1/vehiculos/{id}

### Diseño Frontend

#### Componentes
| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `MuiDataTable` | `shared/components/MuiDataTable.tsx` | DataGrid reutilizable |
| `ClientesPage` | `modules/clientes/presentation/pages/clientes-page.tsx` | Listado |
| `ClienteFormDrawer` | `modules/clientes/presentation/forms/cliente-form-drawer.tsx` | Alta/edición |
| `VehiculosDialog` | `modules/clientes/presentation/modals/vehiculos-dialog.tsx` | Vista y alta rápida |

#### Páginas
| Página | Ruta | Protegida |
|--------|------|-----------|
| Clientes | `/clientes` | sí |

### Arquitectura y Dependencias
- Backend: módulo hexagonal `clientes`, Alembic `0002`, SQL en `backend/sql`
- Frontend: MUI X DataGrid, react-hook-form, zod
- Tema naranja en tokens CSS, login y selector de punto

### Notas de Implementación
> La identificación NO es única solo por empresa: es única por `(empresa_id, punto_emision_id, identificacion)`.
> La placa es única por `(empresa_id, punto_emision_id, placa)`.
> El listado de clientes se filtra siempre por el punto activo del JWT.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] SQL y migración `0002_clientes_vehiculos`
- [x] Domain, ports, use cases, adapters y router de clientes/vehículos
- [x] Registrar router y excepciones en `main.py`

### Frontend

#### Implementación
- [x] Tema naranja (login, selector, tokens)
- [x] `MuiDataTable` reutilizable
- [x] Módulo clientes: tabla, drawer, dialog de vehículos
- [x] Ruta `/clientes` y nav en layout protegido

### QA
- [x] Verificar en navegador con `admin@techcorp.com` / `admin123`

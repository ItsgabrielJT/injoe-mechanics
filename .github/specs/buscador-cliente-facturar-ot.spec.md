---
id: SPEC-022
status: IN_PROGRESS
feature: buscador-cliente-facturar-ot
created: 2026-11-05
updated: 2026-11-05
author: spec-generator
version: "1.0"
related-specs: ["SPEC-012", "SPEC-007"]
---

# Spec: Buscador de cliente existente en el modal de facturar OT

> **Estado:** `IN_PROGRESS`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
En el modal de facturar una orden de trabajo, al elegir “Otro cliente / empresa”, el selector de cliente existente deja de ser un `<select>` limitado a 100 registros. Pasa a un buscador remoto con mínimo 3 caracteres que lista coincidencias de cliente y vehículo, igual que el buscador de crear OT y el de facturación.

### Requerimiento de Negocio
Dentro del módulo, cuando se da el botón de facturar y aparece la opción de buscar cliente existente, el selector simple limita búsquedas. Debe buscar por los primeros tres dígitos/caracteres y tomar coincidencias como el buscador de orden de trabajo (cliente y vehículo) en el modal de facturas.

### Historias de Usuario

#### HU-01: No precargar el catálogo de clientes

```
Como:        Usuario del taller
Quiero:      Escribir al menos 3 caracteres para buscar un cliente existente al facturar
Para:        No depender de los primeros 100 clientes del catálogo

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-012
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: umbral de busqueda
  Dado que:  el modal de facturar está abierto en “Otro cliente / empresa”
  Cuando:    abro el buscador de cliente existente
  Entonces:  no se precarga el listado y se indica que hay que escribir al menos 3 caracteres
```

**Error Path**
```gherkin
CRITERIO-1.2: menos de tres caracteres
  Dado que:  el buscador de cliente existente está abierto
  Cuando:    el texto tiene menos de 3 caracteres
  Entonces:  no se llama a la API de clientes ni de vehículos
```

#### HU-02: Coincidencias de cliente y vehículo

```
Como:        Usuario del taller
Quiero:      Buscar por nombre, cédula, placa, marca o modelo
Para:        Encontrar al receptor aunque no recuerde el nombre exacto

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: cliente y vehiculo
  Dado que:  hay clientes y vehículos que coinciden con el término
  Cuando:    escribo 3 o más caracteres
  Entonces:  se consultan GET /clientes y GET /vehiculos con search, se unifican por cliente_id y se listan todas las páginas
```

**Edge Case**
```gherkin
CRITERIO-2.2: match de vehiculo
  Dado que:  el término coincide con una placa
  Cuando:    elijo el resultado
  Entonces:  queda seleccionado el cliente dueño del vehículo (cliente_id)
```

#### HU-03: Alta rápida sin selección

```
Como:        Usuario del taller
Quiero:      Seguir creando un cliente nuevo si no elijo uno existente
Para:        Facturar a un receptor que aún no está en el catálogo

Prioridad:   Media
Estimación:  XS
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: alta rapida
  Dado que:  “Otro cliente / empresa” está activo y no hay cliente existente seleccionado
  Cuando:    completo cédula, nombre y correo y confirmo
  Entonces:  se crea el cliente y el borrador de factura usa ese cliente_id
```

### Reglas de Negocio
1. Mínimo 3 caracteres (`trim`) antes de llamar API.
2. No precargar clientes al abrir el modal de facturar.
3. El filtrado ocurre en servidor con `search`; el frontend acumula páginas hasta `pages`.
4. Un resultado de vehículo selecciona `vehiculo.clienteId`.
5. Consumidor Final y cliente de la OT no cambian.
6. El payload de `POST /facturas/desde-orden/{id}` no cambia.
7. Backend sin cambios de esquema ni de endpoints.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| Ninguna | — | sin cambio de esquema | Reutiliza `search` de clientes y vehículos |

#### Índices / Constraints
- Sin índices nuevos.

### API Endpoints

#### GET /api/v1/clientes/
- **Descripción**: Listado con `search` (nombres, razón social, identificación, correos, placa/marca/modelo de vehículos)
- **Auth requerida**: sí
- **Cambio**: ninguno

#### GET /api/v1/vehiculos/
- **Descripción**: Listado con `search` (placa, marca, modelo, cliente, cédula)
- **Auth requerida**: sí
- **Cambio**: ninguno

#### POST /api/v1/facturas/desde-orden/{orden_id}
- **Descripción**: Crea factura en borrador desde OT
- **Auth requerida**: sí
- **Cambio**: ninguno

### Diseño Frontend

#### Componentes modificados
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `OrdenesTrabajoPage` | `frontend/src/modules/ordenes-trabajo/presentation/pages/ordenes-trabajo-page.tsx` | — | Reemplaza `<select>` por `BuscadorSelect` remoto |
| `BuscadorSelect` | `frontend/src/modules/inventario/presentation/components/buscador-select.tsx` | `onBuscar`, `minCaracteres` | Reutilizado, sin cambios |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `listarClientes` | `clientes-api.ts` | `GET /clientes/` |
| `listarVehiculos` | `clientes-api.ts` | `GET /vehiculos/` |
| `listarTodasLasPaginas` | `listar-todas-las-paginas.ts` | helper de paginación |

### Arquitectura y Dependencias
- Paquetes nuevos requeridos: ninguno
- Servicios externos: ninguno

### Notas de Implementación
> Unificar resultados por `cliente.id` / `vehiculo.clienteId`. En `extra` mostrar identificación y placa/marca/modelo. Alta rápida permanece si `otroClienteId` es null.

---

## 3. LISTA DE TAREAS

> Checklist accionable para todos los agentes. Marcar cada ítem (`[x]`) al completarlo.

### Backend

#### Implementación
- [x] Sin cambios

#### Tests Backend
- [x] No aplica

### Frontend

#### Implementación
- [ ] Quitar precarga de 100 clientes en `abrirFacturar`
- [ ] `BuscadorSelect` con `minCaracteres=3` y búsqueda paralela clientes + vehículos
- [ ] Unificar por `cliente_id` y mostrar coincidencia de vehículo en `extra`
- [ ] Conservar alta rápida si no hay selección

#### Tests Frontend
- [ ] No generar tests (restricción del agente frontend)

### QA
- [ ] Verificar: 1–2 caracteres no listan; 3+ listan por nombre, cédula y placa
- [ ] Verificar: Consumidor Final y cliente de la OT siguen iguales
- [ ] Actualizar estado spec: `status: IMPLEMENTED`

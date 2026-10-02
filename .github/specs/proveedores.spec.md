---
id: SPEC-006
status: APPROVED
feature: proveedores
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: ["SPEC-003", "SPEC-005"]
---

# Spec: Proveedores y precios de compra

> **Estado:** `APPROVED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Maestro de proveedores por empresa y punto, más precios de compra múltiples en productos y servicios. El producto puede no aplicar inventario. Registrar un costo de proveedor no genera ingreso de stock.

### Requerimiento de Negocio
Clonar proveedores de Autocare sin retención. Obligatorios: RUC/cédula y nombre. Pestaña de proveedores en productos y servicios. Flag `aplica_inventario` en producto.

### Historias de Usuario

#### HU-01: Registrar proveedor

```
Como:        Usuario del taller autenticado
Quiero:      Crear un proveedor solo con RUC/cédula y nombre
Para:        Asignarle precios de compra a productos y servicios

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-001
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: alta mínima
  Dado que:  tengo un punto activo
  Cuando:    envío identificacion (10 o 13 dígitos) y nombres
  Entonces:  se crea el proveedor en esa empresa y punto
```

**Error Path**
```gherkin
CRITERIO-1.2: ruc duplicado
  Dado que:  ya existe esa identificación en el punto
  Cuando:    intento crear otro proveedor igual
  Entonces:  la API responde 409
```

#### HU-02: Precios de compra y flag de inventario

```
Como:        Usuario del taller
Quiero:      Asociar varios proveedores con precio de compra a un producto o servicio
Para:        Ver el costo al armar una orden sin mover stock

Prioridad:   Alta
Estimación:  L
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: upsert de precio
  Dado que:  existe un producto y un proveedor
  Cuando:    registro precio_compra
  Entonces:  queda el par y no se crea movimiento INGRESO
```

**Happy Path**
```gherkin
CRITERIO-2.2: sin inventario
  Dado que:  creo o edito un producto con aplica_inventario=false
  Cuando:    intento un movimiento de stock
  Entonces:  la API responde 400 y no altera existencias
```

### Reglas de Negocio
1. Obligatorios proveedor: `identificacion` (10 o 13 dígitos), `nombres` (min 2).
2. Unicidad `(empresa_id, punto_emision_id, identificacion)`.
3. Sin retención ni `retention_percentage`.
4. Par único producto-proveedor y servicio-proveedor. Upsert actualiza `precio_compra`.
5. `productos.aplica_inventario` default true. Si es false: no alertas, no movimientos, no stock inicial, no salida al cerrar OT.
6. Tenant desde JWT.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Proveedor` | `proveedores` | nueva | Maestro |
| `ProductoProveedor` | `productos_proveedores` | nueva | Precio de compra |
| `ServicioProveedor` | `servicios_proveedores` | nueva | Precio de compra |
| `Producto` | `productos` | modificada | `aplica_inventario` |

#### Campos — `proveedores`
| Campo | Tipo | Obligatorio | Validación |
|-------|------|-------------|------------|
| `identificacion` | varchar(13) | sí | 10 o 13 dígitos |
| `nombres` | varchar(255) | sí | min 2 |
| `tipo_persona` | enum tipo_cliente | no | default PERSONA_NATURAL |
| `razon_social` | varchar(255) | no | |
| `direccion` / `telefono` / `correo` | varios | no | |
| `direccion_fiscal` / `telefono_fiscal` / `correo_fiscal` | varios | no | |
| `notas` | text | no | |
| `activo` | bool | sí | default true |

#### Índices / Constraints
- UNIQUE proveedores `(empresa_id, punto_emision_id, identificacion)`
- UNIQUE productos_proveedores `(producto_id, proveedor_id)`
- UNIQUE servicios_proveedores `(servicio_id, proveedor_id)`

### API Endpoints

- `GET/POST /api/v1/proveedores` query `page`, `size`, `search`, `activo`
- `GET/PUT/DELETE /api/v1/proveedores/{id}`
- `PATCH /api/v1/proveedores/{id}/activar` y `/desactivar`
- `GET/POST /api/v1/productos/{id}/proveedores`
- `PUT/DELETE /api/v1/productos/{id}/proveedores/{relacion_id}`
- `GET/POST /api/v1/servicios/{id}/proveedores`
- `PUT/DELETE /api/v1/servicios/{id}/proveedores/{relacion_id}`

Códigos: 201 alta, 400 validación, 404 no encontrado, 409 duplicado.

### Diseño Frontend

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `ProveedoresPage` | `modules/proveedores/presentation/pages/proveedores-page.tsx` | Listado CRUD |
| `ProveedorFormDrawer` | `modules/proveedores/presentation/forms/proveedor-form-drawer.tsx` | Alta/edición |
| Pestaña proveedores | productos-page y servicios-page | Precios de compra |

#### Páginas
| Página | Ruta | Protegida |
|--------|------|-----------|
| Proveedores | `/proveedores` | sí |

### Notas de Implementación
> Registrar costo de proveedor nunca crea INGRESO.
> Productos existentes quedan con `aplica_inventario=true`.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [ ] SQL y migración `0005_proveedores`
- [ ] Módulo hexagonal proveedores
- [ ] Flag `aplica_inventario` en producto y rechazo en movimientos
- [ ] Registrar routers y excepciones

### Frontend

#### Implementación
- [ ] Módulo proveedores + nav
- [ ] Pestañas de precios en productos y servicios
- [ ] Switch aplica inventario en form de producto

### QA
- [ ] Verificar CRUD y precios sin movimiento de stock

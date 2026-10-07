---
id: SPEC-015
status: IMPLEMENTED
feature: ux-formulario-ot
created: 2026-10-06
updated: 2026-10-06
author: spec-generator
version: "1.0"
related-specs: ["SPEC-007"]
---

# Spec: Correcciones UX del formulario de OT

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Ajustar el formulario de órdenes para no validar bodega/stock al guardar, listar ítems debajo del alta, autoseleccionar la primera bodega, limpiar la búsqueda al usar “no existe”, mostrar errores flotantes, recalcular totales al editar y alinear Cancelar/Guardar a la izquierda.

### Historias de Usuario

#### HU-01: Guardar sin validar stock

```
Como:        Usuario del taller
Quiero:      Guardar una OT nueva o en edición sin validar stock ni exigir bodega
Para:        Registrar el trabajo y descontar inventario solo al cerrar

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-007
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

```gherkin
CRITERIO-1.1: guardar sin bodega
  Dado que:  agrego un producto con inventario sin validar existencias
  Cuando:    guardo la OT
  Entonces:  se crea o actualiza EN_PROCESO y no se exige stock; al cerrar sí se exige bodega y stock
```

#### HU-02: UX del formulario

```
Como:        Usuario del taller
Quiero:      Agregar ítems arriba, ver errores sin scroll y ver totales al instante
Para:        Completar la OT sin perder el contexto

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-007
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

```gherkin
CRITERIO-2.1: lista y bodega
  Dado que:  pulso Producto o Servicio o elijo un producto con inventario
  Cuando:    se agrega la línea
  Entonces:  queda arriba, las anteriores abajo, y la bodega es la primera creada de la empresa

CRITERIO-2.2: busqueda, errores y totales
  Dado que:  escribo en el buscador o cambio cantidad/precio o falla el guardado
  Cuando:    pulso no existe, edito importes o hay error
  Entonces:  el buscador se limpia (el nombre pasa al alta), el error flota sin scroll, los totales se recalculan y Cancelar/Guardar quedan a la izquierda
```

### Reglas de Negocio
1. Crear/editar no valida stock ni exige bodega.
2. Cerrar y facturar siguen exigiendo bodega y stock.
3. Primera bodega = menor `id` entre las activas del punto.
4. Errores del formulario y de la API de guardar se muestran en el drawer.

---

## 2. DISEÑO

### Backend

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `GuardarOrdenUseCase` | `application/use_cases/ordenes.py` | Permite `bodega_id` nulo al guardar |

### Frontend

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `OrdenTrabajoFormDrawer` | `forms/orden-trabajo-form-drawer.tsx` | Lista, bodega, alerta, totales, botones |
| `BuscadorSelect` | `inventario/.../buscador-select.tsx` | Reset del texto de búsqueda |
| `OrdenesTrabajoPage` | `pages/ordenes-trabajo-page.tsx` | Relanza el error de guardar |

---

## 3. LISTA DE TAREAS

### Backend
- [x] Quitar `BodegaRequerida` al guardar; mantenerla al cerrar

### Frontend
- [x] Ítems al inicio, primera bodega, reset de búsqueda
- [x] Alerta flotante, totales al editar, botones a la izquierda

### QA
- [x] Verificar en navegador con injoedev
- [x] Actualizar estado spec: `status: IMPLEMENTED`

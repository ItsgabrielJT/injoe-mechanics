---
id: SPEC-014
status: IN_PROGRESS
feature: checklist-mantenimiento
created: 2026-10-06
updated: 2026-10-06
author: spec-generator
version: "1.0"
related-specs: ["SPEC-013"]
---

# Spec: PDF checklist de mantenimiento

> **Estado:** `IN_PROGRESS`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Junto a Descargar formato, un botón Descargar checklist genera la hoja de inspección en blanco con logo y datos de empresa.

### Historias de Usuario

#### HU-01: Descargar checklist

```
Como:        Usuario del taller
Quiero:      Descargar el checklist de mantenimiento
Para:        Imprimir la hoja de inspección

Prioridad:   Alta
Estimación:  M
Dependencias: SPEC-013
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

```gherkin
CRITERIO-1.1: checklist vacio
  Dado que:  estoy en la lista de OT
  Cuando:    pulso Descargar checklist
  Entonces:  se descarga el PDF con logo, empresa, iconos de secciones, casillas vacías y marcos negros
```

### Reglas de Negocio
1. Fondo blanco y bordes negros.
2. Solo datos de empresa y logo; campos de cliente/vehículo en blanco.
3. El botón vive al lado de Descargar formato.

---

## 2. DISEÑO

### Frontend

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `ChecklistMantenimientoPdf` | `presentation/pdf/checklist-mantenimiento-pdf.tsx` | Hoja de checklist |
| `OrdenesTrabajoPage` | `pages/ordenes-trabajo-page.tsx` | Botón Descargar checklist |

---

## 3. LISTA DE TAREAS

### Frontend
- [ ] PDF checklist con iconos, logo y empresa
- [ ] Botón junto a Descargar formato

### QA
- [ ] Verificar descarga
- [ ] Actualizar estado spec: `status: IMPLEMENTED`

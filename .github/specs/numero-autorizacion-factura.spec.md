---
id: SPEC-013
status: IMPLEMENTED
feature: numero-autorizacion-factura
created: 2026-10-06
updated: 2026-10-06
author: spec-generator
version: "1.0"
related-specs: ["SPEC-009"]
---

# Spec: Número de autorización SRI en detalle de factura

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
En el modal de detalles de una factura, el usuario debe ver el número de autorización SRI una vez emitida y autorizada, y poder copiarlo con un clic.

### Requerimiento de Negocio
En el modal de detalles de facturación debería poder verse el número de autorización una vez emitida al SRI, y que sea fácil de copiar.

### Historias de Usuario

#### HU-01: Ver y copiar el número de autorización

```
Como:        Usuario del taller
Quiero:      Ver el número de autorización SRI en el detalle de la factura y copiarlo
Para:        Consultarlo o pegarlo sin transcribirlo a mano

Prioridad:   Alta
Estimación:  XS
Dependencias: SPEC-009
Capa:        Frontend
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: visible tras autorizar
  Dado que:  la factura está AUTORIZADA o tiene numero_autorizacion / fecha_autorizacion
  Cuando:    abro el modal de detalles
  Entonces:  se muestra el N° autorización SRI en monoespaciado y un botón Copiar
```

**Error Path**
```gherkin
CRITERIO-1.2: sin autorizar
  Dado que:  la factura está en BORRADOR y no tiene número de autorización
  Cuando:    abro el modal de detalles
  Entonces:  no se muestra el bloque de N° autorización SRI
```

**Edge Case**
```gherkin
CRITERIO-1.3: copiar
  Dado que:  el modal muestra el N° autorización
  Cuando:    pulso Copiar o el propio número
  Entonces:  el valor queda en el portapapeles y el botón indica Copiado
```

### Reglas de Negocio
1. El número a mostrar es `numero_autorizacion`, o `clave_acceso` si la factura ya está autorizada y el primero viene vacío.
2. La fecha de autorización se etiqueta como "Fecha de autorización", no como el número.
3. No hay cambios de API ni de persistencia: el GET de factura ya entrega ambos campos.

---

## 2. DISEÑO

### Modelos de Datos

Sin cambios. Se reutilizan `numero_autorizacion`, `clave_acceso` y `fecha_autorizacion` de `Factura`.

### API Endpoints

Sin cambios. `GET /api/v1/facturas/{id}` ya incluye `numero_autorizacion`.

### Diseño Frontend

#### Componentes modificados
| Componente | Archivo | Cambio |
|------------|---------|--------|
| `FacturaDetalleDialog` | `frontend/src/modules/facturacion/presentation/modals/factura-detalle-dialog.tsx` | Bloque N° autorización + copiar |

### Notas de Implementación
Mostrar el número en `font-mono` con `break-all`. Feedback visual "Copiado" ~2s. Fallback `document.execCommand("copy")` si Clipboard API no está disponible.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Sin cambios — el campo ya existe en el GET de factura

### Frontend

#### Implementación
- [x] Mostrar N° autorización SRI en el modal de detalle cuando exista
- [x] Botón Copiar con feedback "Copiado"
- [x] Renombrar la fecha a "Fecha de autorización"

### QA
- [x] Verificar modal en factura autorizada: número visible y copiable
- [x] Verificar modal en borrador: no aparece el bloque
- [x] Actualizar estado spec: `status: IMPLEMENTED`

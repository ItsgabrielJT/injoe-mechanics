---
id: SPEC-008
status: APPROVED
feature: configuracion
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: ["SPEC-001"]
---

# Spec: Configuración de empresa

> **Estado:** `APPROVED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Permitir al admin editar los datos locales de la empresa, vincular el certificado electrónico contra SriSignXml (sin guardar el `.p12` en Mechanics) y gestionar puntos de emisión con secuenciales editables.

### Requerimiento de Negocio
Clonar el módulo de configuración de Autocare. Mechanics solo persiste `empresas.sri_id` (id de la fila en `sri_db`). El certificado y la contraseña viven cifrados en SriSignXml. En local, injoedev usa `sri_id = 1`.

### Historias de Usuario

#### HU-01: Editar datos de empresa

```
Como:        Admin de la empresa
Quiero:      Actualizar razón social, RUC, dirección, teléfono, correo y entorno SRI
Para:        Que las facturas salgan con los datos correctos

Prioridad:   Alta
Estimación:  M
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: actualizar empresa
  Dado que:  estoy autenticado en un punto de injoedev
  Cuando:    guardo nombre, RUC de 13 dígitos, dirección, teléfono, correo y entorno 1
  Entonces:  se persisten en empresas y el GET /empresa los devuelve
```

#### HU-02: Vincular certificado SRI

```
Como:        Admin
Quiero:      Subir el .p12 y la contraseña a SriSignXml
Para:        Que Mechanics guarde solo el sri_id y pueda firmar facturas

Prioridad:   Alta
Estimación:  M
Capa:        Frontend + SriSignXml
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: upload y sri_id
  Dado que:  SriSignXml responde id
  Cuando:    el front sube certificate, password, ruc y razon_social
  Entonces:  Mechanics guarda empresas.sri_id con ese id y GET /empresa lo muestra
```

**Error Path**
```gherkin
CRITERIO-2.2: sin certificado
  Dado que:  empresas.sri_id es null
  Cuando:    intento enviar una factura al SRI
  Entonces:  400 con mensaje de subir el certificado en Configuración
```

#### HU-03: Puntos de emisión y secuenciales

```
Como:        Admin
Quiero:      Crear y editar puntos con factura_seq
Para:        Que la siguiente factura continúe desde el último número usado

Prioridad:   Alta
Estimación:  M
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: secuencial inicial
  Dado que:  el punto tiene factura_seq = 5
  Cuando:    creo una factura
  Entonces:  el número termina en 000000006 y factura_seq queda en 6
```

### Reglas de Negocio
1. Mechanics no almacena `.p12` ni password.
2. `sri_id` se escribe solo tras respuesta de SriSignXml o seed local (`1` para injoedev).
3. `factura_seq` = último número usado. Siguiente = seq + 1.
4. Al crear un punto se siembran las formas de pago por defecto.
5. Entorno SRI: `"1"` pruebas / `"2"` producción.
6. Logo y “lleva contabilidad” fuera de alcance (hardcode al firmar).

---

## 2. DISEÑO

### API Endpoints

- `GET/PUT /api/v1/empresa`
- `PATCH /api/v1/empresa/sri-id` body `{ sri_id }`
- `GET/POST /api/v1/puntos-emision`
- `GET/PUT/DELETE /api/v1/puntos-emision/{id}`

### Frontend

| Página | Ruta |
|--------|------|
| Configuración | `/configuracion` |

Certificado: front → `POST {SRI_SIGN_URL}/empresas/certificado` con `X-API-Key`.

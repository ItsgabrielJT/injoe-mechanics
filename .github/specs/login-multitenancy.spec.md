---
id: SPEC-001
status: IMPLEMENTED
feature: login-multitenancy
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: []
---

# Spec: Login multi-tenant con puntos de emisión

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Permitir que un usuario inicie sesión en INJOE Mecánicos, elija el punto de emisión al que tiene acceso y opere dentro de ese contexto. Si solo tiene un punto, entra directo. Dentro del sistema puede cambiar de punto sin cerrar sesión.

### Requerimiento de Negocio
Sistema de login funcional sobre una base nueva (`mecanicos_db`) con tablas en español (`empresas`, `puntos_emision`, `usuarios`, `roles`, `permisos` y relaciones). Multi-tenant: una empresa tiene varios puntos de emisión; un usuario puede acceder a varios puntos; cada punto es un acceso distinto. Sembrar datos existentes de `autocare_db` y copiar solo el diseño visual de Autocare.

### Historias de Usuario

#### HU-01: Iniciar sesión

```
Como:        Usuario del taller
Quiero:      Entrar con correo o nombre de usuario y contraseña
Para:        Acceder a los puntos de emisión que me corresponden

Prioridad:   Alta
Estimación:  M
Dependencias: Ninguna
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: login exitoso
  Dado que:  existe un usuario activo con al menos un punto de emisión
  Cuando:    envío correo o nombre_usuario y contraseña correctos
  Entonces:  recibo tokens, datos del usuario y la lista de empresas/puntos autorizados
```

**Error Path**
```gherkin
CRITERIO-1.2: credenciales inválidas
  Dado que:  el identificador o la contraseña son incorrectos
  Cuando:    intento iniciar sesión
  Entonces:  la API responde 401 con mensaje en español
```

**Error Path**
```gherkin
CRITERIO-1.3: sin puntos de emisión
  Dado que:  las credenciales son válidas pero el usuario no tiene puntos
  Cuando:    intento iniciar sesión
  Entonces:  la API responde 403 y no se entrega contexto operativo
```

#### HU-02: Seleccionar o entrar al punto de emisión

```
Como:        Usuario autenticado
Quiero:      Elegir el punto de emisión si tengo varios, o entrar directo si tengo uno
Para:        Trabajar solo en el contexto de ese punto

Prioridad:   Alta
Estimación:  M
Dependencias: HU-01
Capa:        Ambas
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: un solo punto
  Dado que:  el login devolvió un único punto autorizado
  Cuando:    el frontend procesa la respuesta
  Entonces:  selecciona ese punto y navega al dashboard sin mostrar selector
```

**Happy Path**
```gherkin
CRITERIO-2.2: varios puntos
  Dado que:  el usuario admin de INJOE tiene puntos 001 y 002
  Cuando:    inicia sesión
  Entonces:  ve el selector y al elegir un punto recibe un token con empresa_id y punto_emision_id
```

**Error Path**
```gherkin
CRITERIO-2.3: punto no autorizado
  Dado que:  estoy autenticado
  Cuando:    pido un punto_emision_id que no me pertenece
  Entonces:  la API responde 403
```

#### HU-03: Cambiar punto sin cerrar sesión

```
Como:        Usuario autenticado con varios puntos
Quiero:      Cambiar el punto de emisión desde el sistema
Para:        Operar en otro acceso de la misma empresa sin volver a loguearme

Prioridad:   Alta
Estimación:  S
Dependencias: HU-02
Capa:        Ambas
```

#### Criterios de Aceptación — HU-03

**Happy Path**
```gherkin
CRITERIO-3.1: cambio de punto
  Dado que:  estoy en el dashboard con un punto activo
  Cuando:    elijo otro punto autorizado en el switcher
  Entonces:  se reemite el token con el nuevo contexto y la UI refleja el cambio
```

### Reglas de Negocio
1. El tenant (`empresa_id`, `punto_emision_id`) se obtiene del JWT, nunca del body como fuente de verdad.
2. Un usuario solo entra si está activo y tiene al menos un punto de emisión activo de una empresa activa.
3. Roles del sistema: `superadmin`, `admin`, `vendedor`, `mecanico`.
4. El rol no vive en `usuarios`; se asigna por `usuarios_roles`.
5. Nombres de tablas, columnas, JSON y copy de UI en español.
6. `admin@techcorp.com` es `admin` + `superadmin` y tiene ambos puntos de INJOE DEV.
7. Usuarios `CONTADOR` de Autocare se migran como `mecanico`.
8. No se modifica `autocare_db`.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| `Empresa` | `empresas` | nueva | Tenant raíz, clon de `companies` |
| `PuntoEmision` | `puntos_emision` | nueva | Acceso operativo, clon de `establishments` |
| `Usuario` | `usuarios` | nueva | Identidad, hashes copiados de Autocare |
| `Rol` | `roles` | nueva | Roles de sistema |
| `Permiso` | `permisos` | nueva | Permisos de sistema |
| `RolPermiso` | `roles_permisos` | nueva | Relación rol-permiso |
| `UsuarioRol` | `usuarios_roles` | nueva | Relación usuario-rol |
| `UsuarioPuntoEmision` | `usuarios_puntos_emision` | nueva | Accesos autorizados |

#### Campos — `empresas`
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `id` | int | sí | PK | Identificador |
| `nombre` | varchar(255) | sí | | Nombre comercial |
| `slug` | varchar(100) | sí | unique | Identificador URL |
| `ruc` | varchar(13) | sí | unique | RUC |
| `direccion` | text | sí | | Dirección |
| `telefono` | varchar(20) | no | | Teléfono |
| `correo` | varchar(255) | no | | Correo |
| `sri_id` | int | no | | ID SRI |
| `moneda` | varchar(3) | sí | default USD | Moneda |
| `idioma` | varchar(5) | sí | default es | Idioma |
| `zona_horaria` | varchar(50) | sí | default America/Guayaquil | Zona |
| `entorno_sri` | varchar(1) | sí | 1 o 2 | Ambiente SRI |
| `ruta_logo` | varchar(255) | no | | Logo |
| `activa` | bool | sí | default true | Estado |
| `verificada` | bool | sí | default false | Verificación |
| `plan_suscripcion` | varchar(50) | sí | default basic | Plan |
| `creado_en` / `actualizado_en` | timestamptz | sí | | Auditoría |

#### Campos — `puntos_emision`
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | int | sí | PK |
| `empresa_id` | int | sí | FK empresas |
| `punto_emision` | varchar(20) | sí | Código SRI del punto |
| `codigo` | varchar(20) | sí | Código de establecimiento |
| `direccion` | varchar(255) | sí | Dirección del punto |
| `factura_seq` | bigint | sí | Secuencial facturas |
| `nota_credito_seq` | bigint | sí | Secuencial NC |
| `nota_debito_seq` | bigint | sí | Secuencial ND |
| `retencion_seq` | bigint | sí | Secuencial retenciones |
| `liquidacion_compra_seq` | bigint | sí | Secuencial liquidaciones |
| `guia_remision_seq` | bigint | sí | Secuencial guías |
| `info` | text | no | Etiqueta visible |
| `creado_en` / `actualizado_en` | timestamptz | sí | Auditoría |

#### Campos — `usuarios`
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | int | sí | PK |
| `empresa_id` | int | sí | Empresa principal |
| `correo` | varchar | sí | Correo |
| `nombre_usuario` | varchar | sí | Usuario |
| `nombre_completo` | varchar | sí | Nombre |
| `contrasena_hash` | varchar | sí | Hash bcrypt_sha256 |
| `activo` | bool | sí | Estado |
| `verificado` | bool | sí | Verificación |
| `ultimo_acceso` | timestamptz | no | Último login |
| `creado_en` / `actualizado_en` | timestamptz | sí | Auditoría |

#### Índices / Constraints
- UNIQUE(`empresas.slug`), UNIQUE(`empresas.ruc`)
- UNIQUE(`usuarios.correo`, `usuarios.empresa_id`)
- UNIQUE(`usuarios.nombre_usuario`, `usuarios.empresa_id`)
- UNIQUE(`usuarios_puntos_emision.usuario_id`, `punto_emision_id`)
- UNIQUE(`usuarios_roles.usuario_id`, `rol_id`)
- UNIQUE(`roles.codigo`)
- UNIQUE(`permisos.codigo`)
- CHECK `empresas.entorno_sri` IN ('1', '2')

### API Endpoints

#### POST /api/v1/auth/login
- **Descripción**: Autentica y devuelve tokens + accesos
- **Auth requerida**: no
- **Request Body**:
  ```json
  { "identificador": "string", "contrasena": "string" }
  ```
- **Response 200**: tokens, usuario, empresas con puntos
- **Response 401**: credenciales inválidas
- **Response 403**: usuario inactivo o sin puntos
- **Response 422**: validación

#### POST /api/v1/auth/seleccionar-contexto
- **Descripción**: Fija empresa y punto en un nuevo access token
- **Auth requerida**: sí (token de login, con o sin contexto)
- **Request Body**: `{ "punto_emision_id": 1 }`
- **Response 200**: tokens con `empresa_id` y `punto_emision_id`
- **Response 403**: punto no autorizado

#### POST /api/v1/auth/cambiar-punto
- **Descripción**: Cambia el punto activo sin cerrar sesión
- **Auth requerida**: sí
- **Request Body**: `{ "punto_emision_id": 2 }`
- **Response 200**: tokens actualizados
- **Response 403**: punto no autorizado

#### POST /api/v1/auth/refresh
- **Descripción**: Renueva tokens
- **Auth requerida**: refresh token
- **Response 200**: nuevos tokens

#### GET /api/v1/auth/me
- **Descripción**: Usuario actual, roles, empresa y punto activos, accesos
- **Auth requerida**: sí
- **Response 200**: perfil + contexto

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `LoginForm` | `modules/acceso/presentation/forms/login-form.tsx` | — | Formulario glass |
| `SelectorPuntoEmision` | `modules/acceso/presentation/components/selector-punto-emision.tsx` | `empresas, onSelect` | Cards de puntos |
| `SwitcherPunto` | `modules/acceso/presentation/components/switcher-punto.tsx` | — | Cambio interno |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| Login | `login-page.tsx` | `/login` | no |
| Seleccionar punto | `seleccionar-punto-page.tsx` | `/seleccionar-punto` | sesión sin contexto |
| Dashboard | `dashboard-page.tsx` | `/dashboard` | sí |

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `useSesion` | `use-sesion.ts` | `{ usuario, contexto, login, seleccionar, cambiarPunto, cerrar }` | Sesión cliente |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `iniciarSesion` | `auth-api.ts` | `POST /api/v1/auth/login` |
| `seleccionarContexto` | `auth-api.ts` | `POST /api/v1/auth/seleccionar-contexto` |
| `cambiarPunto` | `auth-api.ts` | `POST /api/v1/auth/cambiar-punto` |
| `obtenerMe` | `auth-api.ts` | `GET /api/v1/auth/me` |

### Arquitectura y Dependencias
- Backend: FastAPI, SQLAlchemy 2 async, Alembic, PostgreSQL, passlib bcrypt_sha256, python-jose
- Frontend: Next.js App Router, Tailwind, shadcn, framer-motion
- Impacto: bootstrap completo de `backend/` y `frontend/`

### Notas de Implementación
> Hexagonal obligatorio. Domain sin FastAPI/SQLAlchemy. Tenant desde JWT.
> Seed lee `autocare_db` y escribe `mecanicos_db` sin modificar el origen.
> INJOE DEV recibe punto `002` extra. `admin@techcorp.com` accede a 001 y 002.
> Diseño visual de Autocare; copy INJOE MECÁNICOS. Verificar flujo en el navegador.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Bootstrap FastAPI, Alembic, `.env`, venv
- [x] Crear `mecanicos_db` y SQL/migración de identidad
- [x] Modelos y repositorios de empresas, puntos, usuarios, roles
- [x] Use cases de login, seleccionar contexto y cambiar punto
- [x] Router `/api/v1/auth` y seed desde Autocare

#### Tests Backend
- [x] Login happy path, 401 y 403 sin puntos (verificación manual / curl)

### Frontend

#### Implementación
- [x] Bootstrap Next.js + tokens de diseño Autocare
- [x] Login, selector y dashboard con switcher
- [x] Entrada directa cuando hay un solo punto

#### Tests Frontend
- [x] Verificar en navegador login, selector y cambio de punto

### QA
- [x] Cubrir criterios 1.1–3.1
- [x] Actualizar estado spec: `status: IMPLEMENTED`

---
id: SPEC-004
status: IMPLEMENTED
feature: sesion-refresh-guard
created: 2026-10-02
updated: 2026-10-02
author: spec-generator
version: "1.0"
related-specs: [SPEC-001]
---

# Spec: Guard de sesión, refresh token 24h y redirección al login

> **Estado:** `IMPLEMENTED`
> **Ciclo de vida:** DRAFT → APPROVED → IN_PROGRESS → IMPLEMENTED → DEPRECATED

---

## 1. REQUERIMIENTOS

### Descripción
Mantener la sesión de INJOE Mecánicos con un refresh token de 24 horas. Si el access token expira dentro del sistema, renovarlo en silencio. Si no hay token, el refresh también expiró o la renovación falla, redirigir siempre al login. Cualquier URL protegida sin sesión válida entra por `/login`.

### Requerimiento de Negocio
Si el usuario está dentro del sistema y el token expira, debe ir al login. Si entra a otra URL sin token, siempre redirigir al login. Implementar refresh token por 24 horas.

### Historias de Usuario

#### HU-01: Renovar sesión con refresh de 24 horas

```
Como:        Usuario autenticado
Quiero:      Que mi sesión se renueve con un refresh token de 24 horas
Para:        Seguir trabajando sin volver a escribir la contraseña mientras el refresh siga vigente

Prioridad:   Alta
Estimación:  S
Dependencias: SPEC-001
Capa:        Ambas
```

#### Criterios de Aceptación — HU-01

**Happy Path**
```gherkin
CRITERIO-1.1: refresh vigente
  Dado que:  tengo un refresh token emitido hace menos de 24 horas
  Cuando:    el access token expira o una API responde 401
  Entonces:  el cliente llama POST /api/v1/auth/refresh, guarda los nuevos tokens y reintenta la petición
```

**Error Path**
```gherkin
CRITERIO-1.2: refresh expirado o inválido
  Dado que:  el refresh token expiró, es inválido o no existe
  Cuando:    el sistema intenta renovar la sesión
  Entonces:  se limpia el almacenamiento local y se redirige a /login
```

#### HU-02: Redirigir al login si la sesión no es válida

```
Como:        Visitante o usuario con sesión vencida
Quiero:      Ser enviado al login si no hay token o el token ya no sirve
Para:        No ver pantallas internas ni errores de "token inválido o expirado"

Prioridad:   Alta
Estimación:  S
Dependencias: HU-01
Capa:        Frontend
```

#### Criterios de Aceptación — HU-02

**Happy Path**
```gherkin
CRITERIO-2.1: URL protegida sin token
  Dado que:  no hay access token ni refresh token
  Cuando:    abro /clientes, /servicios, /dashboard u otra ruta distinta de /login
  Entonces:  el sistema me redirige a /login
```

**Error Path**
```gherkin
CRITERIO-2.2: token expirado dentro del sistema
  Dado que:  estoy en una pantalla interna y el access token ya no es válido
  Cuando:    una petición recibe 401 y el refresh no puede renovar
  Entonces:  no se muestra el error en la tabla; se limpia la sesión y se navega a /login
```

### Reglas de Negocio
1. El access token sigue durando 60 minutos.
2. El refresh token dura 24 horas y se rota en cada renovación.
3. `/login` es la única ruta pública de la aplicación.
4. `/seleccionar-punto` exige sesión, no contexto de punto.
5. El tenant sigue saliendo del JWT, nunca del body.
6. No se modifica `autocare_db`.

---

## 2. DISEÑO

### Modelos de Datos

#### Entidades afectadas
| Entidad | Almacén | Cambios | Descripción |
|---------|---------|---------|-------------|
| Sesión JWT | memoria / localStorage | modificada | Access 60 min, refresh 24 h, timestamps de emisión |
| Cookie `mecanicos.auth` | cookie | nueva | Marca de sesión para el middleware de Next.js |

#### Campos del modelo
| Campo | Tipo | Obligatorio | Validación | Descripción |
|-------|------|-------------|------------|-------------|
| `access_token` | string | sí | JWT type=access | Token de API |
| `refresh_token` | string | sí | JWT type=refresh | Renovación, 24 h |
| `expira_en` | int | sí | segundos | Vida del access token |
| `refresh_expira_en` | int | sí | 86400 | Vida del refresh token |
| `accessTokenCreadoEn` | number | sí | epoch ms | Emisión en el cliente |

#### Índices / Constraints
- El refresh JWT debe llevar `type=refresh` y `sub` del usuario.
- Si el refresh trae `punto_emision_id`, se revalida que el usuario siga autorizado.

### API Endpoints

#### POST /api/v1/auth/refresh
- **Descripción**: Emite un access token nuevo y rota el refresh (24 h)
- **Auth requerida**: no (usa el refresh token en el body)
- **Request Body**:
  ```json
  { "refresh_token": "string" }
  ```
- **Response 200**:
  ```json
  {
    "access_token": "string",
    "refresh_token": "string",
    "token_type": "bearer",
    "expira_en": 3600,
    "refresh_expira_en": 86400,
    "usuario": {},
    "empresas": [],
    "empresa_id": 1,
    "punto_emision_id": 1,
    "requiere_seleccion": false
  }
  ```
- **Response 401**: refresh ausente, inválido o expirado

### Diseño Frontend

#### Componentes nuevos
| Componente | Archivo | Props principales | Descripción |
|------------|---------|------------------|-------------|
| `AuthGuard` | `modules/acceso/presentation/guards/auth-guard.tsx` | `children` | Redirige según sesión y ruta |

#### Páginas nuevas
| Página | Archivo | Ruta | Protegida |
|--------|---------|------|-----------|
| — | — | — | Se reutilizan login, selector y rutas internas |

#### Hooks y State
| Hook | Archivo | Retorna | Descripción |
|------|---------|---------|-------------|
| `useSesion` | `use-sesion.ts` | sesión, login, renovar, cerrar | Persistencia, refresh silencioso y cierre |
| `sesion-storage` | `sesion-storage.ts` | leer/guardar/limpiar | localStorage + cookie + listeners |

#### Services (llamadas API)
| Función | Archivo | Endpoint |
|---------|---------|---------|
| `refrescarSesion` | `auth-api.ts` | `POST /api/v1/auth/refresh` |
| `httpClient` | `http-client.ts` | Intercepta 401, renueva y reintenta |

### Arquitectura y Dependencias
- Paquetes nuevos requeridos: ninguno
- Servicios externos: ninguno
- Impacto: `config.py` cambia la vida del refresh a 24 h; el frontend añade middleware y guard global

### Notas de Implementación
> El httpClient no debe importar `auth-api` para evitar ciclos: la renovación usa `fetch` directo.
> Una sola renovación en vuelo (single-flight) para peticiones concurrentes.
> Tras fallar el refresh: limpiar storage, borrar cookie y `window.location.assign('/login')`.
> Verificar en navegador: ruta sin token, 401 con refresh vigente y 401 con refresh vencido.

---

## 3. LISTA DE TAREAS

### Backend

#### Implementación
- [x] Cambiar `REFRESH_TOKEN_EXPIRE_HOURS` a 24 y emitir JWT refresh con esa vida
- [x] Exponer `refresh_expira_en` en la respuesta de sesión
- [x] Mantener `POST /api/v1/auth/refresh` validando `type=refresh`

#### Tests Backend
- [x] Verificar con curl que un refresh válido renueva tokens
- [x] Verificar que un refresh inválido responde 401

### Frontend

#### Implementación
- [x] Persistencia de sesión con timestamps y cookie `mecanicos.auth`
- [x] `httpClient` renueva en 401 y redirige al login si falla
- [x] `AuthGuard` + middleware: cualquier URL sin sesión va a `/login`
- [x] Refresh silencioso al montar y cuando el access está por expirar

#### Tests Frontend
- [x] Entrar a `/clientes` sin token redirige a login
- [x] Sesión vigente permanece en clientes/servicios
- [x] Token expirado con refresh inválido sale al login

### QA
- [x] Cubrir criterios 1.1, 1.2, 2.1 y 2.2
- [x] Actualizar estado spec: `status: IMPLEMENTED`

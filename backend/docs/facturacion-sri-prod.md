# Facturación SRI en producción

## Variables de entorno (Mechanics)

```
SRI_SIGN_URL=https://sri.injoe.dev/sri
SRI_SIGN_SECRET_KEY=<secret de SriSignXml>
SRI_ENVIRONMENT=2
SRI_RETRY_INTERVAL_SECONDS=3600
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=facturas@empresa.com
SMTP_FROM_NAME=INJOE Mecánicos
SMTP_USE_TLS=true
```

En local el job corre cada 60 segundos. En producción debe quedar en 3600 (1 hora).

## Certificado

El `.p12` y la contraseña se suben desde Configuración hacia SriSignXml. Mechanics solo guarda `empresas.sri_id`.

SriSignXml debe apuntar a PostgreSQL:

```
DATABASE_URL=postgresql://usuario:clave@host:5432/sri_db
```

## Reintentos

El scheduler consulta facturas `PENDIENTE_AUTORIZACION` y rechazos por fallo de red del SRI. No reintenta `DEVUELTA` ni `NO AUTORIZADO` de validación.

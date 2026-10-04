---
id: SPEC-004
status: IMPLEMENTED
feature: transferencia-vehiculos
created: 2026-10-04
updated: 2026-10-04
author: spec-generator
version: "1.0"
related-specs: ["SPEC-002"]
---

# Spec: Filtros, paginación y transferencia de vehículos

> **Estado:** `IMPLEMENTED`

## Requerimiento
En el diálogo de vehículos de un cliente: buscar por placa, marca, modelo y año; paginar; transferir uno o varios vehículos a uno o varios clientes del mismo punto.

## API
- `GET /clientes/{id}/vehiculos?page&size&placa&marca&modelo&anio`
- `POST /vehiculos/transferir` body `{ asignaciones: [{ vehiculo_id, cliente_destino_id }] }`

## UI
- Filtros explícitos + MuiDataTable paginada
- Transferencia simple (un destino) o por vehículo (destinos distintos)
- Confirmación con origen, placa y destino

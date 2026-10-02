-- Proveedor opcional en líneas de OT: producción propia sin compra externa.
-- Idempotente.

ALTER TABLE ordenes_trabajo_items ALTER COLUMN proveedor_id DROP NOT NULL;

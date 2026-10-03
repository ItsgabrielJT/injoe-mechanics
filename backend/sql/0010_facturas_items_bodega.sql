-- Bodega de origen por línea de producto en facturas. Idempotente.

ALTER TABLE facturas_items
    ADD COLUMN IF NOT EXISTS bodega_id INTEGER REFERENCES bodegas(id);

CREATE INDEX IF NOT EXISTS ix_facturas_items_bodega_id ON facturas_items (bodega_id);

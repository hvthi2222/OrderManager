-- Fix orders_status_check constraint to include COMPLETED and CANCELLED
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text = ANY(ARRAY['PENDING','PACKED','COMPLETED','CANCELLED','RETURNED','RETURN_CHECKED']));

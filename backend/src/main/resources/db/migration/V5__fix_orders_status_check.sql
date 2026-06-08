-- Ensure SHIPPING status is in orders_status_check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text = ANY(ARRAY['PENDING','PACKED','SHIPPING','COMPLETED','CANCELLED','RETURNED','RETURN_CHECKED']));
-- Add display_order column to stores table
-- This allows users to customize the order of their stores in the dashboard

ALTER TABLE stores 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for faster sorting
CREATE INDEX idx_stores_user_display_order ON stores(user_id, display_order);

-- Update existing stores with sequential order (based on created_at)
WITH numbered_stores AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS order_num
  FROM stores
)
UPDATE stores
SET display_order = numbered_stores.order_num
FROM numbered_stores
WHERE stores.id = numbered_stores.id;

COMMENT ON COLUMN stores.display_order IS 'Display order for user dashboard (0-based)';

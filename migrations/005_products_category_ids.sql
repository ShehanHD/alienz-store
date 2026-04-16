-- Add multi-category support
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids UUID[] NOT NULL DEFAULT '{}';

-- Populate from existing single category_id
UPDATE products SET category_ids = ARRAY[category_id] WHERE category_id IS NOT NULL;

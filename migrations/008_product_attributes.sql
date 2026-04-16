-- Generic attribute reference table (Model, Fit, Material, Accessory Style)
CREATE TABLE IF NOT EXISTS ref_attributes (
    id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
    type       TEXT  NOT NULL,
    name       TEXT  NOT NULL,
    sort_order INT   NOT NULL DEFAULT 0,
    UNIQUE(type, name)
);

CREATE INDEX IF NOT EXISTS idx_ref_attributes_type ON ref_attributes(type);

-- Add attribute arrays to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS models           TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS fits             TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS materials        TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS accessory_styles TEXT[] NOT NULL DEFAULT '{}';

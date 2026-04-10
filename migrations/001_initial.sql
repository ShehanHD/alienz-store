-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types (safe to re-run)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'admin', 'owner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE enquiry_status AS ENUM ('new', 'read', 'replied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- users
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT        UNIQUE NOT NULL,
    hashed_password TEXT        NOT NULL,
    role            user_role   NOT NULL DEFAULT 'client',
    first_name      TEXT        NOT NULL DEFAULT '',
    last_name       TEXT        NOT NULL DEFAULT '',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- addresses
CREATE TABLE IF NOT EXISTS addresses (
    id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    street      TEXT    NOT NULL DEFAULT '',
    city        TEXT    NOT NULL DEFAULT '',
    country     TEXT    NOT NULL DEFAULT '',
    postal_code TEXT    NOT NULL DEFAULT '',
    is_default  BOOLEAN NOT NULL DEFAULT FALSE
);

-- categories
CREATE TABLE IF NOT EXISTS categories (
    id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT    NOT NULL,
    slug       TEXT    UNIQUE NOT NULL,
    sort_order INT     NOT NULL DEFAULT 0
);

-- products
CREATE TABLE IF NOT EXISTS products (
    id          UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT           NOT NULL,
    slug        TEXT           UNIQUE NOT NULL,
    description TEXT           NOT NULL DEFAULT '',
    price       NUMERIC(10,2)  NOT NULL,
    category_id UUID           REFERENCES categories(id) ON DELETE SET NULL,
    sizes       TEXT[]         NOT NULL DEFAULT '{}',
    colors      TEXT[]         NOT NULL DEFAULT '{}',
    is_active   BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- product_images
CREATE TABLE IF NOT EXISTS product_images (
    id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id    UUID    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url           TEXT    NOT NULL,
    thumbnail_url TEXT    NOT NULL,
    storage_path  TEXT    NOT NULL,      -- e.g. "products/abc123/image.webp"
    thumb_path    TEXT    NOT NULL,      -- e.g. "products/abc123/image_thumb.webp"
    is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order    INT     NOT NULL DEFAULT 0
);

-- wishlist_items
CREATE TABLE IF NOT EXISTS wishlist_items (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- enquiries
CREATE TABLE IF NOT EXISTS enquiries (
    id         UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID            REFERENCES users(id) ON DELETE SET NULL,
    product_id UUID            REFERENCES products(id) ON DELETE SET NULL,
    name       TEXT            NOT NULL,
    email      TEXT            NOT NULL,
    message    TEXT            NOT NULL,
    status     enquiry_status  NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- site_config  (key/value, owner-only writes)
CREATE TABLE IF NOT EXISTS site_config (
    key        TEXT        PRIMARY KEY,
    value      TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- setup_flags  (tracks one-time /setup completion)
CREATE TABLE IF NOT EXISTS setup_flags (
    key   TEXT    PRIMARY KEY,
    value BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed default site_config (idempotent)
INSERT INTO site_config (key, value) VALUES
    ('max_products',          '15'),
    ('max_images_per_product','6'),
    ('storage_quota_mb',      '10240'),
    ('max_upload_size_mb',    '10'),
    ('image_output_max_width','1200'),
    ('enquiry_email',         ''),
    ('maintenance_mode',      'false'),
    ('max_wishlist_items',    '50'),
    ('allow_registrations',   'true')
ON CONFLICT (key) DO NOTHING;

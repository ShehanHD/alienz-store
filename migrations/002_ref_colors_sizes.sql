CREATE TABLE IF NOT EXISTS ref_colors (
    id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT  UNIQUE NOT NULL,
    hex        TEXT  NOT NULL DEFAULT '#000000',
    sort_order INT   NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ref_sizes (
    id         UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT  UNIQUE NOT NULL,
    sort_order INT   NOT NULL DEFAULT 0
);

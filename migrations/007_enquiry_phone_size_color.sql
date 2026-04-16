-- Add phone to users profile
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';

-- Add phone, size, color to enquiries; make message optional
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS size  TEXT NOT NULL DEFAULT '';
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '';
ALTER TABLE enquiries ALTER COLUMN message SET DEFAULT '';

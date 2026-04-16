ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enquiries_quantity_check') THEN
    ALTER TABLE enquiries ADD CONSTRAINT enquiries_quantity_check CHECK (quantity >= 1);
  END IF;
END $$;

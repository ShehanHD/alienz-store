-- Extend the enquiry_status enum and add rejection_reason column.
-- Postgres enums can only add new values (not remove), so we rename the type,
-- create a new one with the correct values, migrate the column, then drop the old type.

ALTER TYPE enquiry_status RENAME TO enquiry_status_old;

CREATE TYPE enquiry_status AS ENUM ('new', 'read', 'accepted', 'rejected');

ALTER TABLE enquiries
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE enquiries
  ALTER COLUMN status TYPE enquiry_status
    USING CASE status::text
      WHEN 'replied' THEN 'accepted'::enquiry_status
      ELSE status::text::enquiry_status
    END;

ALTER TABLE enquiries
  ALTER COLUMN status SET DEFAULT 'new';

DROP TYPE enquiry_status_old;

ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Adds hex column to ref_colors for existing installs that already ran 002
ALTER TABLE ref_colors ADD COLUMN IF NOT EXISTS hex TEXT NOT NULL DEFAULT '#000000';

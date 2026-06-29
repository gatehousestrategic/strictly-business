-- Run this in Supabase SQL Editor first
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS subcategory text;
CREATE INDEX IF NOT EXISTS recommendations_subcategory_idx ON recommendations (subcategory);

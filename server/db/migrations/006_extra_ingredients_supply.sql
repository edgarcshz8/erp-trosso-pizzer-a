ALTER TABLE extra_ingredients ADD COLUMN IF NOT EXISTS supply_id INT REFERENCES supplies(id);
ALTER TABLE extra_ingredients ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,4) DEFAULT 1;

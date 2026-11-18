-- Add emoji field to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS emoji VARCHAR(10) DEFAULT '';

-- Set default emojis for existing seeded categories
UPDATE categories SET emoji = '🍕' WHERE name = 'Pizzas'    AND emoji = '';
UPDATE categories SET emoji = '🍪' WHERE name = 'Galletones' AND emoji = '';
UPDATE categories SET emoji = '🥟' WHERE name = 'Empanadas'  AND emoji = '';
UPDATE categories SET emoji = '☕' WHERE name = 'Café'       AND emoji = '';
UPDATE categories SET emoji = '🥤' WHERE name = 'Bebestibles' AND emoji = '';
UPDATE categories SET emoji = '🍿' WHERE name = 'Snacks'     AND emoji = '';
UPDATE categories SET emoji = '📦' WHERE name = 'Otros'      AND emoji = '';

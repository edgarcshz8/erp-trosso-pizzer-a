-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','cashier')),
  pin VARCHAR(10),
  password_hash VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) DEFAULT '',
  sort_order INT DEFAULT 0
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category_id INT REFERENCES categories(id),
  image_url VARCHAR(500),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(10,2),
  type VARCHAR(20) NOT NULL CHECK (type IN ('elaborado','reventa')),
  indirect_cost NUMERIC(10,2) DEFAULT 0,
  is_pizza BOOLEAN DEFAULT false,
  half_half_rule VARCHAR(20) DEFAULT 'expensive' CHECK (half_half_rule IN ('expensive','average')),
  active BOOLEAN DEFAULT true,
  stock NUMERIC(10,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product sizes (optional, for mediana/familiar)
CREATE TABLE IF NOT EXISTS product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  wholesale_price NUMERIC(10,2)
);

-- Extra ingredients (for pizzas)
CREATE TABLE IF NOT EXISTS extra_ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_type VARCHAR(20) DEFAULT 'fixed' CHECK (price_type IN ('fixed','by_size')),
  supply_id INT REFERENCES supplies(id),
  quantity NUMERIC(12,4) DEFAULT 1,
  active BOOLEAN DEFAULT true
);

-- Supplies (insumos)
CREATE TABLE IF NOT EXISTS supplies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  unit VARCHAR(20) NOT NULL CHECK (unit IN ('g','ml','unidad')),
  stock NUMERIC(12,3) DEFAULT 0,
  min_stock NUMERIC(12,3) DEFAULT 0,
  avg_cost NUMERIC(10,4) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  size_id INT REFERENCES product_sizes(id) ON DELETE CASCADE,
  supply_id INT REFERENCES supplies(id),
  quantity NUMERIC(12,4) NOT NULL
);

-- Stock movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  supply_id INT REFERENCES supplies(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('compra','venta','merma','ajuste')),
  quantity NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(10,4),
  reason VARCHAR(500),
  reference_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT REFERENCES users(id)
);

-- Promotions
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('discount','2x1','percentage')),
  value NUMERIC(10,2),
  applies_to VARCHAR(20) DEFAULT 'all',
  product_id INT REFERENCES products(id),
  start_date DATE,
  end_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts (turnos de caja)
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  opening_amount NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  counted_cash NUMERIC(10,2),
  counted_transfer NUMERIC(10,2) DEFAULT 0,
  counted_card NUMERIC(10,2) DEFAULT 0,
  counted_junaeb NUMERIC(10,2) DEFAULT 0,
  notes VARCHAR(500)
);

-- Shift movements (ingresos/retiros)
CREATE TABLE IF NOT EXISTS shift_movements (
  id SERIAL PRIMARY KEY,
  shift_id INT REFERENCES shifts(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('ingreso','retiro')),
  amount NUMERIC(10,2) NOT NULL,
  reason VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  shift_id INT REFERENCES shifts(id),
  channel VARCHAR(20) NOT NULL DEFAULT 'paso' CHECK (channel IN ('paso','delivery')),
  status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('pending','paid')),
  payment_method VARCHAR(20) CHECK (payment_method IN ('efectivo','transferencia','tarjeta','junaeb')),
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  cash_received NUMERIC(10,2),
  change_given NUMERIC(10,2),
  wholesale BOOLEAN DEFAULT false,
  customer_name VARCHAR(200),
  customer_address VARCHAR(500),
  promotion_id INT REFERENCES promotions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_by INT REFERENCES users(id)
);

-- Sale items
CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INT REFERENCES sales(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  size_id INT REFERENCES product_sizes(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  is_half_half BOOLEAN DEFAULT false,
  half1_product_id INT REFERENCES products(id),
  half2_product_id INT REFERENCES products(id),
  notes VARCHAR(500)
);

-- Sale item extras
CREATE TABLE IF NOT EXISTS sale_item_extras (
  id SERIAL PRIMARY KEY,
  sale_item_id INT REFERENCES sale_items(id) ON DELETE CASCADE,
  extra_id INT REFERENCES extra_ingredients(id),
  quantity INT DEFAULT 1,
  unit_price NUMERIC(10,2)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT REFERENCES users(id)
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

-- Default admin user (password: admin123)
INSERT INTO users (name, role, pin, password_hash) VALUES
  ('Administrador', 'admin', NULL, '$2b$10$YkqRJE8DnBLDVCxFbIr0O.4oP4hZ2vJXbKQTe3pSzJnFcBpfbgPTa')
ON CONFLICT DO NOTHING;

INSERT INTO settings (key, value) VALUES
  ('business_name', 'Trosso Colosso'),
  ('voucher_text', 'Gracias por su compra'),
  ('half_half_rule', 'expensive'),
  ('business_day_end', '04:00')
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, emoji, sort_order) VALUES
  ('Pizzas', '🍕', 1), ('Galletones', '🍪', 2), ('Empanadas', '🥟', 3),
  ('Café', '☕', 4), ('Bebestibles', '🥤', 5), ('Snacks', '🍿', 6), ('Otros', '📦', 7)
ON CONFLICT DO NOTHING;

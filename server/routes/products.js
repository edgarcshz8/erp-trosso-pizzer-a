const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const { uploadToR2, deleteFromR2 } = require('../lib/r2');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/products
router.get('/', requireAuth, async (req, res) => {
  try {
    const { category_id, active, is_pizza } = req.query;
    let query = `
      SELECT p.*, c.name as category_name,
        json_agg(DISTINCT jsonb_build_object('id', ps.id, 'name', ps.name, 'price', ps.price, 'wholesale_price', ps.wholesale_price))
          FILTER (WHERE ps.id IS NOT NULL) as sizes,
        CASE
          WHEN p.type = 'reventa' THEN (p.stock > 0)
          WHEN NOT EXISTS (SELECT 1 FROM recipes r WHERE r.product_id = p.id AND r.size_id IS NULL) THEN true
          WHEN EXISTS (
            SELECT 1 FROM recipes r
            JOIN supplies s ON r.supply_id = s.id
            WHERE r.product_id = p.id AND r.size_id IS NULL AND s.stock < r.quantity
          ) THEN false
          ELSE true
        END as in_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_sizes ps ON ps.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (category_id) { query += ` AND p.category_id = $${idx++}`; params.push(category_id); }
    if (active !== undefined) { query += ` AND p.active = $${idx++}`; params.push(active === 'true'); }
    if (is_pizza !== undefined) { query += ` AND p.is_pizza = $${idx++}`; params.push(is_pizza === 'true'); }

    query += ' GROUP BY p.id, c.id ORDER BY c.sort_order ASC, p.name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/products/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name,
        json_agg(DISTINCT jsonb_build_object('id', ps.id, 'name', ps.name, 'price', ps.price, 'wholesale_price', ps.wholesale_price))
          FILTER (WHERE ps.id IS NOT NULL) as sizes
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_sizes ps ON ps.product_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.id
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/products
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category_id, price, wholesale_price, type, indirect_cost, is_pizza, half_half_rule, description, stock } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Nombre y tipo requeridos' });

    const image_url = req.file
      ? await uploadToR2(req.file.buffer, req.file.originalname, 'products')
      : null;

    const result = await pool.query(`
      INSERT INTO products (name, category_id, image_url, price, wholesale_price, type, indirect_cost, is_pizza, half_half_rule, description, stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
    `, [name, category_id || null, image_url, price || 0, wholesale_price || null,
        type, indirect_cost || 0, is_pizza === 'true' || is_pizza === true, half_half_rule || 'expensive',
        description || null, stock || 0]);

    // Handle sizes
    const sizes = req.body.sizes ? JSON.parse(req.body.sizes) : [];
    for (const size of sizes) {
      await pool.query(
        'INSERT INTO product_sizes (product_id, name, price, wholesale_price) VALUES ($1, $2, $3, $4)',
        [result.rows[0].id, size.name, size.price, size.wholesale_price || null]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// PUT /api/products/:id
router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, price, wholesale_price, type, indirect_cost, is_pizza, half_half_rule, active, description, stock } = req.body;

    const existing = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });

    let image_url = existing.rows[0].image_url;
    if (req.file) {
      await deleteFromR2(existing.rows[0].image_url);
      image_url = await uploadToR2(req.file.buffer, req.file.originalname, 'products');
    }

    const result = await pool.query(`
      UPDATE products SET
        name = COALESCE($1, name),
        category_id = $2,
        image_url = $3,
        price = COALESCE($4, price),
        wholesale_price = $5,
        type = COALESCE($6, type),
        indirect_cost = COALESCE($7, indirect_cost),
        is_pizza = COALESCE($8, is_pizza),
        half_half_rule = COALESCE($9, half_half_rule),
        active = COALESCE($10, active),
        description = $11,
        stock = COALESCE($13, stock)
      WHERE id = $12 RETURNING *
    `, [name, category_id || null, image_url, price, wholesale_price || null,
        type, indirect_cost, is_pizza !== undefined ? (is_pizza === 'true' || is_pizza === true) : existing.rows[0].is_pizza,
        half_half_rule, active !== undefined ? (active === 'true' || active === true) : existing.rows[0].active,
        description !== undefined ? (description || null) : existing.rows[0].description, id,
        stock !== undefined ? parseFloat(stock) : null]);

    // Update sizes if provided
    if (req.body.sizes) {
      const sizes = JSON.parse(req.body.sizes);
      await pool.query('DELETE FROM product_sizes WHERE product_id = $1', [id]);
      for (const size of sizes) {
        await pool.query(
          'INSERT INTO product_sizes (product_id, name, price, wholesale_price) VALUES ($1, $2, $3, $4)',
          [id, size.name, size.price, size.wholesale_price || null]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE products SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

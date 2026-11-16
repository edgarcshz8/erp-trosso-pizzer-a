const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/recipes/:productId
router.get('/:productId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, s.name as supply_name, s.unit, ps.name as size_name
      FROM recipes r
      LEFT JOIN supplies s ON r.supply_id = s.id
      LEFT JOIN product_sizes ps ON r.size_id = ps.id
      WHERE r.product_id = $1
      ORDER BY r.id ASC
    `, [req.params.productId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/recipes - create recipe line
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { product_id, size_id, supply_id, quantity } = req.body;
    if (!product_id || !supply_id || !quantity) {
      return res.status(400).json({ error: 'product_id, supply_id y quantity requeridos' });
    }
    const result = await pool.query(
      'INSERT INTO recipes (product_id, size_id, supply_id, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
      [product_id, size_id || null, supply_id, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// PUT /api/recipes/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { quantity, supply_id, size_id } = req.body;
    const result = await pool.query(
      'UPDATE recipes SET quantity = COALESCE($1, quantity), supply_id = COALESCE($2, supply_id), size_id = $3 WHERE id = $4 RETURNING *',
      [quantity, supply_id, size_id || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Receta no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// DELETE /api/recipes/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM recipes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/recipes/bulk/:productId - replace all recipes for a product
router.post('/bulk/:productId', requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { recipes } = req.body;

    await pool.query('DELETE FROM recipes WHERE product_id = $1', [productId]);

    const inserted = [];
    for (const r of recipes) {
      const result = await pool.query(
        'INSERT INTO recipes (product_id, size_id, supply_id, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
        [productId, r.size_id || null, r.supply_id, r.quantity]
      );
      inserted.push(result.rows[0]);
    }

    res.json(inserted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

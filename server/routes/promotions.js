const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/promotions
router.get('/', requireAuth, async (req, res) => {
  try {
    const { active_only } = req.query;
    let query = `
      SELECT p.*, pr.name as product_name
      FROM promotions p
      LEFT JOIN products pr ON p.product_id = pr.id
      WHERE 1=1
    `;
    if (active_only === 'true') {
      query += ` AND p.active = true
        AND (p.start_date IS NULL OR p.start_date <= CURRENT_DATE)
        AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)`;
    }
    query += ' ORDER BY p.created_at DESC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/promotions
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, type, value, applies_to, product_id, start_date, end_date } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Nombre y tipo requeridos' });
    const result = await pool.query(
      `INSERT INTO promotions (name, type, value, applies_to, product_id, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, type, value || null, applies_to || 'all', product_id || null, start_date || null, end_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// PUT /api/promotions/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, value, applies_to, product_id, start_date, end_date, active } = req.body;
    const result = await pool.query(
      `UPDATE promotions SET
        name = COALESCE($1, name), type = COALESCE($2, type), value = $3,
        applies_to = COALESCE($4, applies_to), product_id = $5,
        start_date = $6, end_date = $7, active = COALESCE($8, active)
       WHERE id = $9 RETURNING *`,
      [name, type, value, applies_to, product_id || null, start_date || null, end_date || null, active, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Promoción no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// DELETE /api/promotions/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE promotions SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

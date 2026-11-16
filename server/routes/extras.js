const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/extras
router.get('/', requireAuth, async (req, res) => {
  try {
    const { active } = req.query;
    let query = 'SELECT * FROM extra_ingredients WHERE 1=1';
    const params = [];
    if (active !== undefined) {
      query += ' AND active = $1';
      params.push(active === 'true');
    }
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/extras
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, price, price_type } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const result = await pool.query(
      'INSERT INTO extra_ingredients (name, price, price_type) VALUES ($1, $2, $3) RETURNING *',
      [name, price || 0, price_type || 'fixed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// PUT /api/extras/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, price_type, active } = req.body;
    const result = await pool.query(
      'UPDATE extra_ingredients SET name = COALESCE($1, name), price = COALESCE($2, price), price_type = COALESCE($3, price_type), active = COALESCE($4, active) WHERE id = $5 RETURNING *',
      [name, price, price_type, active, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Extra no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// DELETE /api/extras/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE extra_ingredients SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/expenses
router.get('/', requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = `
      SELECT e.*, u.name as user_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM e.date) = $${idx++} AND EXTRACT(YEAR FROM e.date) = $${idx++}`;
      params.push(month, year);
    } else if (year) {
      query += ` AND EXTRACT(YEAR FROM e.date) = $${idx++}`;
      params.push(year);
    }

    query += ' ORDER BY e.date DESC, e.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/expenses
router.post('/', requireAuth, async (req, res) => {
  try {
    const { category, description, amount, date } = req.body;
    if (!category || !amount || !date) {
      return res.status(400).json({ error: 'Categoría, monto y fecha requeridos' });
    }
    const result = await pool.query(
      'INSERT INTO expenses (category, description, amount, date, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category, description || null, amount, date, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description, amount, date } = req.body;
    const result = await pool.query(
      `UPDATE expenses SET category = COALESCE($1, category), description = $2,
       amount = COALESCE($3, amount), date = COALESCE($4, date)
       WHERE id = $5 RETURNING *`,
      [category, description, amount, date, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

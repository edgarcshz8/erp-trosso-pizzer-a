const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/supplies
router.get('/', requireAuth, async (req, res) => {
  try {
    const { active } = req.query;
    let query = 'SELECT *, stock <= min_stock AND min_stock > 0 as low_stock FROM supplies WHERE 1=1';
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

// GET /api/supplies/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM supplies WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/supplies
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, unit, stock, min_stock, avg_cost } = req.body;
    if (!name || !unit) return res.status(400).json({ error: 'Nombre y unidad requeridos' });
    const result = await pool.query(
      'INSERT INTO supplies (name, unit, stock, min_stock, avg_cost) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, unit, stock || 0, min_stock || 0, avg_cost || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// PUT /api/supplies/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, min_stock, active } = req.body;
    const result = await pool.query(
      `UPDATE supplies SET name = COALESCE($1, name), unit = COALESCE($2, unit),
       min_stock = COALESCE($3, min_stock), active = COALESCE($4, active)
       WHERE id = $5 RETURNING *`,
      [name, unit, min_stock, active, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Insumo no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// DELETE /api/supplies/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE supplies SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/supplies/:id/movements
router.get('/:id/movements', requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await pool.query(`
      SELECT sm.*, u.name as user_name
      FROM stock_movements sm
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.supply_id = $1
      ORDER BY sm.created_at DESC
      LIMIT $2
    `, [req.params.id, limit]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/supplies/:id/purchase - register a purchase (compra)
router.post('/:id/purchase', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unit_cost, reason } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Cantidad inválida' });

    const supply = await pool.query('SELECT * FROM supplies WHERE id = $1', [id]);
    if (!supply.rows[0]) return res.status(404).json({ error: 'Insumo no encontrado' });

    const s = supply.rows[0];
    const qty = parseFloat(quantity);
    const cost = parseFloat(unit_cost) || 0;

    // Weighted average cost
    const newStock = parseFloat(s.stock) + qty;
    const newAvgCost = newStock > 0
      ? (parseFloat(s.stock) * parseFloat(s.avg_cost) + qty * cost) / newStock
      : cost;

    // Update stock
    await pool.query(
      'UPDATE supplies SET stock = $1, avg_cost = $2 WHERE id = $3',
      [newStock, newAvgCost, id]
    );

    // Record movement
    const mov = await pool.query(
      'INSERT INTO stock_movements (supply_id, type, quantity, unit_cost, reason, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, 'compra', qty, cost, reason || null, req.user.id]
    );

    res.json({ supply: { ...s, stock: newStock, avg_cost: newAvgCost }, movement: mov.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/supplies/:id/adjust - register shrinkage/adjustment
router.post('/:id/adjust', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;
    // type: 'merma' or 'ajuste'
    if (!quantity) return res.status(400).json({ error: 'Cantidad requerida' });

    const supply = await pool.query('SELECT * FROM supplies WHERE id = $1', [id]);
    if (!supply.rows[0]) return res.status(404).json({ error: 'Insumo no encontrado' });

    const qty = parseFloat(quantity);
    const newStock = Math.max(0, parseFloat(supply.rows[0].stock) + qty);

    await pool.query('UPDATE supplies SET stock = $1 WHERE id = $2', [newStock, id]);

    const mov = await pool.query(
      'INSERT INTO stock_movements (supply_id, type, quantity, reason, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, type || 'ajuste', qty, reason || null, req.user.id]
    );

    res.json({ supply: { ...supply.rows[0], stock: newStock }, movement: mov.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/shifts
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name as user_name,
        COALESCE(SUM(CASE WHEN sa.payment_method = 'efectivo' AND sa.status = 'paid' THEN sa.total ELSE 0 END), 0) as sales_cash,
        COALESCE(SUM(CASE WHEN sa.payment_method = 'transferencia' AND sa.status = 'paid' THEN sa.total ELSE 0 END), 0) as sales_transfer,
        COALESCE(SUM(CASE WHEN sa.payment_method = 'tarjeta' AND sa.status = 'paid' THEN sa.total ELSE 0 END), 0) as sales_card,
        COALESCE(SUM(CASE WHEN sa.payment_method = 'junaeb' AND sa.status = 'paid' THEN sa.total ELSE 0 END), 0) as sales_junaeb,
        COALESCE(SUM(CASE WHEN sa.status = 'paid' THEN sa.total ELSE 0 END), 0) as total_sales,
        COUNT(CASE WHEN sa.status = 'paid' THEN 1 END) as sale_count
      FROM shifts s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN sales sa ON sa.shift_id = s.id
      GROUP BY s.id, u.name
      ORDER BY s.opened_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/shifts/current
router.get('/current', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name as user_name
      FROM shifts s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status = 'open'
      ORDER BY s.opened_at DESC
      LIMIT 1
    `);
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/shifts/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const shiftResult = await pool.query(`
      SELECT s.*, u.name as user_name
      FROM shifts s LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [req.params.id]);

    if (!shiftResult.rows[0]) return res.status(404).json({ error: 'Turno no encontrado' });

    const salesResult = await pool.query(`
      SELECT sa.*, u.name as cashier_name
      FROM sales sa
      LEFT JOIN users u ON sa.created_by = u.id
      WHERE sa.shift_id = $1
      ORDER BY sa.created_at DESC
    `, [req.params.id]);

    const movResult = await pool.query(
      'SELECT * FROM shift_movements WHERE shift_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    // Calculate totals
    const sales = salesResult.rows;
    const totalsByCash = sales.filter(s => s.status === 'paid').reduce((acc, s) => {
      const method = s.payment_method || 'efectivo';
      acc[method] = (acc[method] || 0) + parseFloat(s.total);
      return acc;
    }, {});

    const ingresos = movResult.rows.filter(m => m.type === 'ingreso').reduce((s, m) => s + parseFloat(m.amount), 0);
    const retiros = movResult.rows.filter(m => m.type === 'retiro').reduce((s, m) => s + parseFloat(m.amount), 0);

    // Products sold in this shift
    const itemsResult = await pool.query(`
      SELECT p.name, SUM(si.quantity) as qty_sold,
        SUM(si.unit_price * si.quantity - COALESCE(si.discount, 0)) as revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales sa ON si.sale_id = sa.id
      WHERE sa.shift_id = $1 AND sa.status = 'paid'
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
    `, [req.params.id]);

    res.json({
      shift: shiftResult.rows[0],
      sales: salesResult.rows,
      movements: movResult.rows,
      items_summary: itemsResult.rows,
      totals: {
        by_method: totalsByCash,
        total_sales: Object.values(totalsByCash).reduce((s, v) => s + v, 0),
        ingresos,
        retiros,
        expected_cash: parseFloat(shiftResult.rows[0].opening_amount || 0) + (totalsByCash.efectivo || 0) + ingresos - retiros
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/shifts/open
router.post('/open', requireAuth, async (req, res) => {
  try {
    // Check no open shift exists
    const existing = await pool.query("SELECT id FROM shifts WHERE status = 'open' LIMIT 1");
    if (existing.rows[0]) {
      return res.status(400).json({ error: 'Ya existe un turno abierto', shift_id: existing.rows[0].id });
    }

    const { opening_amount } = req.body;
    const result = await pool.query(
      'INSERT INTO shifts (user_id, opening_amount, status) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, opening_amount || 0, 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/shifts/:id/close
router.post('/:id/close', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { counted_cash, counted_transfer, counted_card, counted_junaeb, notes } = req.body;

    const shift = await pool.query("SELECT * FROM shifts WHERE id = $1 AND status = 'open'", [id]);
    if (!shift.rows[0]) return res.status(404).json({ error: 'Turno no encontrado o ya cerrado' });

    const result = await pool.query(`
      UPDATE shifts SET
        status = 'closed', closed_at = NOW(),
        counted_cash = $1, counted_transfer = $2, counted_card = $3, counted_junaeb = $4, notes = $5
      WHERE id = $6 RETURNING *
    `, [counted_cash || 0, counted_transfer || 0, counted_card || 0, counted_junaeb || 0, notes || null, id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/shifts/:id/movements
router.post('/:id/movements', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, reason } = req.body;
    if (!type || !amount) return res.status(400).json({ error: 'Tipo y monto requeridos' });

    const shift = await pool.query("SELECT * FROM shifts WHERE id = $1 AND status = 'open'", [id]);
    if (!shift.rows[0]) return res.status(404).json({ error: 'Turno no encontrado o cerrado' });

    const result = await pool.query(
      'INSERT INTO shift_movements (shift_id, type, amount, reason) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, type, amount, reason || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

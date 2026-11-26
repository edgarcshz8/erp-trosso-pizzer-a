const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAdmin } = require('../middleware/auth');
const XLSX = require('xlsx');

// GET /api/reports/sales
router.get('/sales', requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const params = [];
    let idx = 1;
    let dateFilter = '';

    if (date_from) { dateFilter += ` AND sa.created_at >= $${idx++}`; params.push(date_from); }
    if (date_to) { dateFilter += ` AND sa.created_at <= $${idx++}`; params.push(date_to + ' 23:59:59'); }

    // Total and by payment method
    const totalResult = await pool.query(`
      SELECT
        COUNT(*) as sale_count,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(discount), 0) as total_discount,
        COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN payment_method = 'transferencia' THEN total ELSE 0 END), 0) as transfer,
        COALESCE(SUM(CASE WHEN payment_method = 'tarjeta' THEN total ELSE 0 END), 0) as card,
        COALESCE(SUM(CASE WHEN payment_method = 'junaeb' THEN total ELSE 0 END), 0) as junaeb,
        COALESCE(SUM(CASE WHEN channel = 'paso' THEN total ELSE 0 END), 0) as paso,
        COALESCE(SUM(CASE WHEN channel = 'delivery' THEN total ELSE 0 END), 0) as delivery,
        COUNT(CASE WHEN channel = 'paso' THEN 1 END) as paso_count,
        COUNT(CASE WHEN channel = 'delivery' THEN 1 END) as delivery_count
      FROM sales sa
      WHERE sa.status = 'paid' ${dateFilter}
    `, params);

    // Top products (all, ordered by revenue)
    const topProducts = await pool.query(`
      SELECT p.name, SUM(si.quantity) as qty_sold, SUM(si.unit_price * si.quantity - si.discount) as revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales sa ON si.sale_id = sa.id
      WHERE sa.status = 'paid' ${dateFilter}
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
    `, params);

    // Daily breakdown
    const dailyResult = await pool.query(`
      SELECT DATE(sa.created_at) as date, COUNT(*) as count, SUM(total) as total
      FROM sales sa
      WHERE sa.status = 'paid' ${dateFilter}
      GROUP BY DATE(sa.created_at)
      ORDER BY date ASC
    `, params);

    // Extras sold
    const extrasResult = await pool.query(`
      SELECT ei.name, SUM(sie.quantity) as qty_sold, SUM(sie.quantity * sie.unit_price) as revenue
      FROM sale_item_extras sie
      JOIN extra_ingredients ei ON sie.extra_id = ei.id
      JOIN sale_items si ON sie.sale_item_id = si.id
      JOIN sales sa ON si.sale_id = sa.id
      WHERE sa.status = 'paid' ${dateFilter}
      GROUP BY ei.id, ei.name
      ORDER BY qty_sold DESC
    `, params);

    res.json({
      summary: totalResult.rows[0],
      top_products: topProducts.rows,
      daily: dailyResult.rows,
      top_extras: extrasResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/reports/costs
router.get('/costs', requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const params = [];
    let idx = 1;
    let dateFilter = '';
    if (date_from) { dateFilter += ` AND sa.created_at >= $${idx++}`; params.push(date_from); }
    if (date_to) { dateFilter += ` AND sa.created_at <= $${idx++}`; params.push(date_to + ' 23:59:59'); }

    // Cost per product (using recipes and avg_cost)
    const costsResult = await pool.query(`
      SELECT
        p.id, p.name, p.price, p.indirect_cost,
        COALESCE(SUM(r.quantity * s.avg_cost), 0) as recipe_cost,
        COALESCE(SUM(r.quantity * s.avg_cost), 0) + COALESCE(p.indirect_cost, 0) as total_cost,
        p.price - (COALESCE(SUM(r.quantity * s.avg_cost), 0) + COALESCE(p.indirect_cost, 0)) as margin,
        CASE WHEN p.price > 0 THEN
          ROUND(((p.price - (COALESCE(SUM(r.quantity * s.avg_cost), 0) + COALESCE(p.indirect_cost, 0))) / p.price * 100)::numeric, 1)
        ELSE 0 END as margin_pct
      FROM products p
      LEFT JOIN recipes r ON r.product_id = p.id AND r.size_id IS NULL
      LEFT JOIN supplies s ON r.supply_id = s.id
      WHERE p.active = true
      GROUP BY p.id, p.name, p.price, p.indirect_cost
      ORDER BY p.name ASC
    `);

    // Inventory valuation
    const inventoryResult = await pool.query(`
      SELECT name, unit, stock, avg_cost, stock * avg_cost as value
      FROM supplies WHERE active = true ORDER BY value DESC
    `);
    const totalInventoryValue = inventoryResult.rows.reduce((s, r) => s + parseFloat(r.value || 0), 0);

    res.json({
      products: costsResult.rows,
      inventory: inventoryResult.rows,
      total_inventory_value: totalInventoryValue
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/reports/income-statement
router.get('/income-statement', requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).toISOString().split('T')[0];

    // Revenue
    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as revenue, COALESCE(SUM(discount), 0) as discounts
      FROM sales WHERE status = 'paid' AND created_at >= $1 AND created_at <= $2
    `, [startDate, endDate + ' 23:59:59']);

    // COGS from recipes (stock movements of type venta)
    const cogsResult = await pool.query(`
      SELECT COALESCE(SUM(ABS(quantity) * COALESCE(unit_cost, 0)), 0) as cogs
      FROM stock_movements
      WHERE type = 'venta' AND created_at >= $1 AND created_at <= $2
    `, [startDate, endDate + ' 23:59:59']);

    // COGS from extras sold (supply cost × quantity used)
    const extrasCogs = await pool.query(`
      SELECT COALESCE(SUM(sie.quantity * ei.quantity * s.avg_cost), 0) as cogs
      FROM sale_item_extras sie
      JOIN extra_ingredients ei ON sie.extra_id = ei.id
      JOIN supplies s ON ei.supply_id = s.id
      JOIN sale_items si ON sie.sale_item_id = si.id
      JOIN sales sa ON si.sale_id = sa.id
      WHERE sa.status = 'paid' AND sa.created_at >= $1 AND sa.created_at <= $2
      AND ei.supply_id IS NOT NULL
    `, [startDate, endDate + ' 23:59:59']);

    // Expenses
    const expTotal = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= $1 AND date <= $2',
      [startDate, endDate]
    );

    const revenue = parseFloat(revenueResult.rows[0].revenue);
    const discounts = parseFloat(revenueResult.rows[0].discounts);
    const cogs = parseFloat(cogsResult.rows[0].cogs) + parseFloat(extrasCogs.rows[0].cogs);
    const expenses = parseFloat(expTotal.rows[0].total);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;

    res.json({
      period: { month: m, year: y, start: startDate, end: endDate },
      revenue,
      discounts,
      net_revenue: revenue - discounts,
      cogs,
      gross_profit: grossProfit,
      gross_margin_pct: revenue > 0 ? Math.round(grossProfit / revenue * 100) : 0,
      expenses,
      net_profit: netProfit,
      net_margin_pct: revenue > 0 ? Math.round(netProfit / revenue * 100) : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/reports/balance
router.get('/balance', requireAdmin, async (req, res) => {
  try {
    // Cash in open shifts
    const cashResult = await pool.query(`
      SELECT COALESCE(SUM(opening_amount), 0) as opening_cash
      FROM shifts WHERE status = 'open'
    `);

    // Sales in open shifts
    const salesResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END), 0) as cash_sales
      FROM sales
      WHERE status = 'paid' AND shift_id IN (SELECT id FROM shifts WHERE status = 'open')
    `);

    // Inventory value
    const invResult = await pool.query(
      'SELECT COALESCE(SUM(stock * avg_cost), 0) as total FROM supplies WHERE active = true'
    );

    // Shift movements in open shifts
    const movResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'ingreso' THEN amount ELSE 0 END), 0) as ingresos,
        COALESCE(SUM(CASE WHEN type = 'retiro' THEN amount ELSE 0 END), 0) as retiros
      FROM shift_movements
      WHERE shift_id IN (SELECT id FROM shifts WHERE status = 'open')
    `);

    const cashInRegister = parseFloat(cashResult.rows[0].opening_cash) +
      parseFloat(salesResult.rows[0].cash_sales) +
      parseFloat(movResult.rows[0].ingresos) -
      parseFloat(movResult.rows[0].retiros);

    const inventoryValue = parseFloat(invResult.rows[0].total);

    res.json({
      cash_in_register: cashInRegister,
      inventory_value: inventoryValue,
      total_assets: cashInRegister + inventoryValue,
      details: {
        opening_cash: parseFloat(cashResult.rows[0].opening_cash),
        cash_sales: parseFloat(salesResult.rows[0].cash_sales),
        ingresos: parseFloat(movResult.rows[0].ingresos),
        retiros: parseFloat(movResult.rows[0].retiros)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/reports/export
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const params = [];
    let idx = 1;
    let dateFilter = '';
    if (date_from) { dateFilter += ` AND sa.created_at >= $${idx++}`; params.push(date_from); }
    if (date_to) { dateFilter += ` AND sa.created_at <= $${idx++}`; params.push(date_to + ' 23:59:59'); }

    const salesResult = await pool.query(`
      SELECT sa.id, sa.created_at, sa.channel, sa.status, sa.payment_method,
        sa.subtotal, sa.discount, sa.total, sa.wholesale, sa.customer_name,
        u.name as cashier
      FROM sales sa
      LEFT JOIN users u ON sa.created_by = u.id
      WHERE sa.status = 'paid' ${dateFilter}
      ORDER BY sa.created_at ASC
    `, params);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(salesResult.rows.map(s => ({
      'ID': s.id,
      'Fecha': new Date(s.created_at).toLocaleString('es-CL'),
      'Canal': s.channel,
      'Método Pago': s.payment_method,
      'Subtotal': parseFloat(s.subtotal),
      'Descuento': parseFloat(s.discount),
      'Total': parseFloat(s.total),
      'Mayorista': s.wholesale ? 'Sí' : 'No',
      'Cliente': s.customer_name || '',
      'Cajero': s.cashier || ''
    })));

    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ventas_${date_from || 'all'}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

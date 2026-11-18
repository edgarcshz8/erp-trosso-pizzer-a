const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

async function deductStock(client, productId, sizeId, quantity, saleId, userId, isHalfHalf = false) {
  // Get product type
  const prodResult = await client.query('SELECT * FROM products WHERE id = $1', [productId]);
  if (!prodResult.rows[0]) return;
  const product = prodResult.rows[0];

  if (product.type === 'elaborado') {
    // Get recipe
    let recipeQuery = 'SELECT r.*, s.stock FROM recipes r JOIN supplies s ON r.supply_id = s.id WHERE r.product_id = $1';
    const recipeParams = [productId];
    if (sizeId) {
      recipeQuery += ' AND (r.size_id = $2 OR r.size_id IS NULL)';
      recipeParams.push(sizeId);
    } else {
      recipeQuery += ' AND r.size_id IS NULL';
    }

    const recipes = await client.query(recipeQuery, recipeParams);

    for (const recipe of recipes.rows) {
      const deductQty = isHalfHalf ? parseFloat(recipe.quantity) * 0.5 * quantity : parseFloat(recipe.quantity) * quantity;
      await client.query(
        'UPDATE supplies SET stock = GREATEST(0, stock - $1) WHERE id = $2',
        [deductQty, recipe.supply_id]
      );
      await client.query(
        'INSERT INTO stock_movements (supply_id, type, quantity, reason, reference_id, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
        [recipe.supply_id, 'venta', -deductQty, `Venta #${saleId}`, saleId, userId]
      );
    }
  } else if (product.type === 'reventa') {
    // Find matching supply (1 unit deducted per unit sold)
    // For reventa, look for a supply with same name or linked by convention
    // We just log it, actual supply tracking needs setup
    await client.query(
      'INSERT INTO stock_movements (supply_id, type, quantity, reason, reference_id, created_by) VALUES (NULL, $1, $2, $3, $4, $5)',
      ['venta', -quantity, `Reventa producto #${productId}, Venta #${saleId}`, saleId, userId]
    ).catch(() => {}); // Ignore if fails (NULL supply_id)
  }
}

// GET /api/sales
router.get('/', requireAuth, async (req, res) => {
  try {
    const { date_from, date_to, channel, status, shift_id, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT sa.*, u.name as cashier_name,
        json_agg(DISTINCT jsonb_build_object(
          'id', si.id, 'product_id', si.product_id, 'quantity', si.quantity,
          'unit_price', si.unit_price, 'discount', si.discount, 'notes', si.notes,
          'is_half_half', si.is_half_half, 'half1_product_id', si.half1_product_id,
          'half2_product_id', si.half2_product_id, 'size_id', si.size_id,
          'product_name', p.name
        )) FILTER (WHERE si.id IS NOT NULL) as items
      FROM sales sa
      LEFT JOIN users u ON sa.created_by = u.id
      LEFT JOIN sale_items si ON si.sale_id = sa.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (date_from) { query += ` AND sa.created_at >= $${idx++}`; params.push(date_from); }
    if (date_to) { query += ` AND sa.created_at <= $${idx++}`; params.push(date_to + ' 23:59:59'); }
    if (channel) { query += ` AND sa.channel = $${idx++}`; params.push(channel); }
    if (status) { query += ` AND sa.status = $${idx++}`; params.push(status); }
    if (shift_id) { query += ` AND sa.shift_id = $${idx++}`; params.push(shift_id); }

    query += ` GROUP BY sa.id, u.name ORDER BY sa.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/sales/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const saleResult = await pool.query(`
      SELECT sa.*, u.name as cashier_name
      FROM sales sa LEFT JOIN users u ON sa.created_by = u.id
      WHERE sa.id = $1
    `, [req.params.id]);

    if (!saleResult.rows[0]) return res.status(404).json({ error: 'Venta no encontrada' });

    const itemsResult = await pool.query(`
      SELECT si.*, p.name as product_name, ps.name as size_name,
        p1.name as half1_name, p2.name as half2_name,
        json_agg(DISTINCT jsonb_build_object(
          'id', sie.id, 'extra_id', sie.extra_id, 'quantity', sie.quantity,
          'unit_price', sie.unit_price, 'extra_name', ei.name
        )) FILTER (WHERE sie.id IS NOT NULL) as extras
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN product_sizes ps ON si.size_id = ps.id
      LEFT JOIN products p1 ON si.half1_product_id = p1.id
      LEFT JOIN products p2 ON si.half2_product_id = p2.id
      LEFT JOIN sale_item_extras sie ON sie.sale_item_id = si.id
      LEFT JOIN extra_ingredients ei ON sie.extra_id = ei.id
      WHERE si.sale_id = $1
      GROUP BY si.id, p.name, ps.name, p1.name, p2.name
    `, [req.params.id]);

    res.json({ ...saleResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/sales
router.post('/', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { items, channel, payment_method, cash_received, wholesale, customer_name, customer_address } = req.body;

    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
    }

    // Check open shift
    const shiftResult = await client.query("SELECT * FROM shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");
    const shift = shiftResult.rows[0];
    // Allow sales without shift in delivery mode
    const shiftId = shift ? shift.id : null;

    // Calculate totals using discounts already computed by the POS (manual promo selection)
    let subtotal = 0;
    let totalDiscount = 0;
    const processedItems = [];

    for (const item of items) {
      const unitPrice = parseFloat(item.unit_price);
      const itemDiscount = parseFloat(item.discount) || 0;

      subtotal += unitPrice * item.quantity;
      totalDiscount += itemDiscount;
      processedItems.push({ ...item, unitPrice, itemDiscount });
    }

    const total = subtotal - totalDiscount;
    const changeGiven = payment_method === 'efectivo' && cash_received
      ? parseFloat(cash_received) - total
      : 0;

    const isDelivery = channel === 'delivery';
    const saleStatus = isDelivery && !payment_method ? 'pending' : 'paid';
    const paidAt = saleStatus === 'paid' ? 'NOW()' : null;

    // Create sale
    const saleResult = await client.query(`
      INSERT INTO sales (shift_id, channel, status, payment_method, subtotal, discount, total,
        cash_received, change_given, wholesale, customer_name, customer_address, created_by, paid_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, ${paidAt ? 'NOW()' : 'NULL'})
      RETURNING *
    `, [shiftId, channel || 'paso', saleStatus, payment_method || null,
        subtotal, totalDiscount, total, cash_received || null, changeGiven || 0,
        wholesale || false, customer_name || null, customer_address || null, req.user.id]);

    const sale = saleResult.rows[0];

    // Insert items
    for (const item of processedItems) {
      const itemResult = await client.query(`
        INSERT INTO sale_items (sale_id, product_id, size_id, quantity, unit_price, discount,
          is_half_half, half1_product_id, half2_product_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
      `, [sale.id, item.product_id, item.size_id || null, item.quantity, item.unitPrice,
          item.itemDiscount || 0, item.is_half_half || false,
          item.half1_product_id || null, item.half2_product_id || null, item.notes || null]);

      // Insert extras
      if (item.extras && item.extras.length > 0) {
        for (const extra of item.extras) {
          await client.query(
            'INSERT INTO sale_item_extras (sale_item_id, extra_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
            [itemResult.rows[0].id, extra.id, extra.quantity || 1, extra.price || 0]
          );
        }
      }

      // Deduct stock
      if (item.is_half_half) {
        // Half-half: deduct 50% each pizza's ingredients
        if (item.half1_product_id) {
          await deductStock(client, item.half1_product_id, item.size_id, item.quantity, sale.id, req.user.id, true);
        }
        if (item.half2_product_id) {
          await deductStock(client, item.half2_product_id, item.size_id, item.quantity, sale.id, req.user.id, true);
        }
        // Deduct main product base (masa) at 100%
        await deductStock(client, item.product_id, item.size_id, item.quantity, sale.id, req.user.id, false);
      } else {
        await deductStock(client, item.product_id, item.size_id, item.quantity, sale.id, req.user.id, false);
      }
    }

    await client.query('COMMIT');

    res.status(201).json(sale);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al registrar venta: ' + err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/sales/:id/pay - mark delivery as paid
router.patch('/:id/pay', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, cash_received } = req.body;

    const saleResult = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
    if (!saleResult.rows[0]) return res.status(404).json({ error: 'Venta no encontrada' });

    const sale = saleResult.rows[0];
    const changeGiven = payment_method === 'efectivo' && cash_received
      ? parseFloat(cash_received) - parseFloat(sale.total)
      : 0;

    // Find current open shift to assign
    const shiftResult = await pool.query("SELECT id FROM shifts WHERE status = 'open' LIMIT 1");
    const shiftId = shiftResult.rows[0]?.id || sale.shift_id;

    const result = await pool.query(`
      UPDATE sales SET status = 'paid', payment_method = $1, cash_received = $2,
        change_given = $3, paid_at = NOW(), shift_id = $4
      WHERE id = $5 RETURNING *
    `, [payment_method, cash_received || null, changeGiven, shiftId, id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

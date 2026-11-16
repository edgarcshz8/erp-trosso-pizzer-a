const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/users
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, role, pin, active, created_at FROM users ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// POST /api/users
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, role, pin, password } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Nombre y rol requeridos' });

    let password_hash = null;
    if (role === 'admin' && password) {
      password_hash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      'INSERT INTO users (name, role, pin, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, role, pin, active, created_at',
      [name, role, pin || null, password_hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, pin, password, active } = req.body;

    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });

    let password_hash = existing.rows[0].password_hash;
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role),
       pin = $3, password_hash = $4, active = COALESCE($5, active)
       WHERE id = $6 RETURNING id, name, role, pin, active, created_at`,
      [name, role, pin !== undefined ? pin : existing.rows[0].pin, password_hash, active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// DELETE /api/users/:id (soft delete)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    await pool.query('UPDATE users SET active = false WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

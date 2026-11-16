const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { pin, password, userId } = req.body;

    let user;

    if (userId) {
      // Login by userId (cashier with PIN or admin with password)
      const result = await pool.query('SELECT * FROM users WHERE id = $1 AND active = true', [userId]);
      user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

      if (user.role === 'admin') {
        if (!password) return res.status(400).json({ error: 'Contraseña requerida para admin' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });
      } else {
        if (!pin) return res.status(400).json({ error: 'PIN requerido' });
        if (user.pin !== String(pin)) return res.status(401).json({ error: 'PIN incorrecto' });
      }
    } else if (pin) {
      // Login by PIN only (find matching cashier)
      const result = await pool.query('SELECT * FROM users WHERE pin = $1 AND active = true AND role = $2', [String(pin), 'cashier']);
      user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'PIN incorrecto' });
    } else {
      return res.status(400).json({ error: 'Datos de autenticación requeridos' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// GET /api/auth/users - get list of active users for login screen
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, role FROM users WHERE active = true ORDER BY role DESC, name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;

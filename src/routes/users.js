const express = require('express')
const bcrypt = require('bcryptjs')
const pool = require('../db/pool')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

const safe = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })

async function nextUserId() {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE id ~ '^USR-\\d+$'
     ORDER BY CAST(SUBSTRING(id FROM 5) AS INTEGER) DESC LIMIT 1`
  )
  if (rows.length === 0) return 'USR-001'
  const n = parseInt(rows[0].id.split('-')[1], 10)
  return `USR-${String(n + 1).padStart(3, '0')}`
}

// GET /api/users
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY id')
    res.json(rows.map(safe))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id)
      return res.status(403).json({ error: 'Access denied' })
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(safe(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// POST /api/users  (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' })

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.length > 0) return res.status(409).json({ error: 'Email already exists' })

    const id = await nextUserId()
    const hashed = bcrypt.hashSync(password, 10)
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password, role, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, name, email, hashed, role || 'user', status || 'Active']
    )
    res.status(201).json(safe(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// PUT /api/users/:id  (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' })
    const cur = existing[0]

    const { name, email, password, role, status } = req.body
    if (email && email !== cur.email) {
      const { rows: dup } = await pool.query('SELECT id FROM users WHERE email = $1', [email])
      if (dup.length > 0) return res.status(409).json({ error: 'Email already exists' })
    }

    const { rows } = await pool.query(
      `UPDATE users SET
         name=$1, email=$2, password=$3, role=$4, status=$5
       WHERE id=$6 RETURNING *`,
      [
        name     || cur.name,
        email    || cur.email,
        password ? bcrypt.hashSync(password, 10) : cur.password,
        role     || cur.role,
        status   || cur.status,
        req.params.id,
      ]
    )
    res.json(safe(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// DELETE /api/users/:id  (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'User not found' })
    res.json({ message: 'User deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

module.exports = router

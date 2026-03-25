const express = require('express')
const bcrypt = require('bcryptjs')
const { users, nextUserId } = require('../data/store')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

const safe = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })

// GET /api/users  (admin only)
router.get('/', authenticate, requireAdmin, (req, res) => {
  res.json(users.map(safe))
})

// GET /api/users/:id
router.get('/:id', authenticate, (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id)
    return res.status(403).json({ error: 'Access denied' })
  const user = users.find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(safe(user))
})

// POST /api/users  (admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, email, password, role, status } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' })
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already exists' })

  const newUser = {
    id: nextUserId(),
    name, email,
    password: bcrypt.hashSync(password, 10),
    role: role || 'user',
    status: status || 'Active'
  }
  users.push(newUser)
  res.status(201).json(safe(newUser))
})

// PUT /api/users/:id  (admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  const { name, email, password, role, status } = req.body
  if (email && email !== users[idx].email && users.find(u => u.email === email))
    return res.status(409).json({ error: 'Email already exists' })

  if (name)     users[idx].name     = name
  if (email)    users[idx].email    = email
  if (password) users[idx].password = bcrypt.hashSync(password, 10)
  if (role)     users[idx].role     = role
  if (status)   users[idx].status   = status
  res.json(safe(users[idx]))
})

// DELETE /api/users/:id  (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  users.splice(idx, 1)
  res.json({ message: 'User deleted' })
})

module.exports = router

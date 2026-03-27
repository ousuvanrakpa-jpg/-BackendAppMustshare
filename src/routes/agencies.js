const express = require('express')
const { agencies, nextAgencyId } = require('../data/store')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

// GET /api/agencies
router.get('/', authenticate, (req, res) => {
  const { search, typeCode, page = 1, limit = 200 } = req.query
  let result = [...agencies]

  if (typeCode) result = result.filter(a => a.typeCode === typeCode)
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
  }

  const total = result.length
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const data = result.slice(skip, skip + parseInt(limit))
  res.json({ data, total, page: parseInt(page), limit: parseInt(limit) })
})

// GET /api/agencies/:id
router.get('/:id', authenticate, (req, res) => {
  const agency = agencies.find(a => a.id === req.params.id)
  if (!agency) return res.status(404).json({ error: 'Agency not found' })
  res.json(agency)
})

// POST /api/agencies  (admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const id = nextAgencyId()
  const { id: _id, ...rest } = req.body
  const newAgency = { id, cases: 0, logo: '', ...rest }
  agencies.push(newAgency)
  res.status(201).json(newAgency)
})

// PUT /api/agencies/:id  (admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = agencies.findIndex(a => a.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Agency not found' })
  const { id, ...rest } = req.body
  agencies[idx] = { ...agencies[idx], ...rest, id: req.params.id }
  res.json(agencies[idx])
})

// DELETE /api/agencies/:id  (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = agencies.findIndex(a => a.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Agency not found' })
  agencies.splice(idx, 1)
  res.json({ message: 'Agency deleted' })
})

module.exports = router

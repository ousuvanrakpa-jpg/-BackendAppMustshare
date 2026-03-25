const express = require('express')
const { cases, nextCaseId } = require('../data/store')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

// GET /api/cases
router.get('/', authenticate, (req, res) => {
  const { status, category, visibility, search, page = 1, limit = 200 } = req.query
  let result = [...cases]

  if (status)   result = result.filter(c => c.status === status)
  if (category) result = result.filter(c => c.category === category)
  if (req.user.role === 'user') result = result.filter(c => c.visibility === 'Internal')
  else if (visibility) result = result.filter(c => c.visibility === visibility)
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.agency || '').toLowerCase().includes(q)
    )
  }

  const total = result.length
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const data = result.slice(skip, skip + parseInt(limit))
  res.json({ data, total, page: parseInt(page), limit: parseInt(limit) })
})

// GET /api/cases/:id
router.get('/:id', authenticate, (req, res) => {
  const c = cases.find(c => c.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Case not found' })
  if (c.visibility === 'Restricted' && req.user.role === 'user') return res.status(403).json({ error: 'Access denied' })
  res.json(c)
})

// POST /api/cases
router.post('/', authenticate, (req, res) => {
  const id = nextCaseId()
  const today = new Date().toISOString().split('T')[0]
  const newCase = { ...req.body, id, lastUpdated: today,
    relatedAgencies: req.body.relatedAgencies || [],
    documents: req.body.documents || [],
    activityLog: req.body.activityLog || [],
    timeline: req.body.timeline || [],
    pendingDelete: null
  }
  cases.unshift(newCase)
  res.status(201).json(newCase)
})

// PUT /api/cases/:id
router.put('/:id', authenticate, (req, res) => {
  const idx = cases.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Case not found' })
  const today = new Date().toISOString().split('T')[0]
  const { id, ...rest } = req.body
  cases[idx] = { ...cases[idx], ...rest, id: req.params.id, lastUpdated: today }
  res.json(cases[idx])
})

// DELETE /api/cases/:id  (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const idx = cases.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Case not found' })
  cases.splice(idx, 1)
  res.json({ message: 'Case deleted' })
})

// POST /api/cases/:id/request-delete
router.post('/:id/request-delete', authenticate, (req, res) => {
  const c = cases.find(c => c.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Case not found' })
  const now = new Date()
  c.pendingDelete = {
    requestedBy: req.user.name,
    requestedByRole: req.user.role,
    requestedAt: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
  }
  res.json(c)
})

// POST /api/cases/:id/approve-delete  (admin)
router.post('/:id/approve-delete', authenticate, requireAdmin, (req, res) => {
  const idx = cases.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Case not found' })
  cases.splice(idx, 1)
  res.json({ message: 'Case deleted after approval' })
})

// POST /api/cases/:id/reject-delete  (admin)
router.post('/:id/reject-delete', authenticate, requireAdmin, (req, res) => {
  const c = cases.find(c => c.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Case not found' })
  c.pendingDelete = null
  res.json(c)
})

module.exports = router

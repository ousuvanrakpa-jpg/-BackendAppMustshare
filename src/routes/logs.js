const express = require('express')
const { logs, nextLogId } = require('../data/store')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// GET /api/logs
router.get('/', authenticate, (req, res) => {
  const { entityType, entityId, page = 1, limit = 200 } = req.query
  let result = [...logs]
  if (entityType) result = result.filter(l => l.entityType === entityType)
  if (entityId)   result = result.filter(l => l.entityId === entityId)

  const total = result.length
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const data = result.slice(skip, skip + parseInt(limit))
  res.json({ data, total, page: parseInt(page), limit: parseInt(limit) })
})

// POST /api/logs
router.post('/', authenticate, (req, res) => {
  const { action, entityType, entityId, entityName, name, role } = req.body
  const now = new Date()
  const log = {
    id: nextLogId(),
    date: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`,
    name: name || req.user.name,
    role: role || req.user.role,
    action,
    entityType,
    entityId,
    entityName
  }
  logs.unshift(log)
  res.status(201).json(log)
})

module.exports = router

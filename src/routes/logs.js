const express = require('express')
const pool = require('../db/pool')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// GET /api/logs
router.get('/', authenticate, async (req, res) => {
  try {
    const { entityType, entityId, page = 1, limit = 200 } = req.query
    const conditions = []
    const params = []

    if (entityType) {
      params.push(entityType)
      conditions.push(`entity_type = $${params.length}`)
    }
    if (entityId) {
      params.push(entityId)
      conditions.push(`entity_id = $${params.length}`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRes = await pool.query(`SELECT COUNT(*) FROM logs ${where}`, params)
    const total = parseInt(countRes.rows[0].count)

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const dataRes = await pool.query(
      `SELECT * FROM logs ${where} ORDER BY id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), skip]
    )

    const data = dataRes.rows.map(row => ({
      id:         row.id,
      date:       row.date,
      name:       row.name,
      role:       row.role,
      action:     row.action,
      entityType: row.entity_type,
      entityId:   row.entity_id,
      entityName: row.entity_name,
    }))

    res.json({ data, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// POST /api/logs
router.post('/', authenticate, async (req, res) => {
  try {
    const { action, entityType, entityId, entityName, name, role } = req.body
    const now = new Date()
    const date = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`

    const { rows } = await pool.query(
      `INSERT INTO logs (date, name, role, action, entity_type, entity_id, entity_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [date, name || req.user.name, role || req.user.role, action, entityType, entityId, entityName]
    )
    const row = rows[0]
    res.status(201).json({
      id:         row.id,
      date:       row.date,
      name:       row.name,
      role:       row.role,
      action:     row.action,
      entityType: row.entity_type,
      entityId:   row.entity_id,
      entityName: row.entity_name,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

module.exports = router

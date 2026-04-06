const express = require('express')
const pool = require('../db/pool')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

function rowToCase(row) {
  return {
    id:                 row.id,
    agencyId:           row.agency_id,
    title:              row.title,
    agency:             row.agency,
    category:           row.category,
    subCategory:        row.sub_category,
    procurementMethod:  row.procurement_method,
    status:             row.status,
    date:               row.date,
    budget:             row.budget,
    source:             row.source,
    lastUpdated:        row.last_updated,
    visibility:         row.visibility,
    restrictedNotes:    row.restricted_notes,
    description:        row.description,
    agencyType:         row.agency_type,
    agencyRole:         row.agency_role,
    region:             row.region,
    province:           row.province,
    district:           row.district,
    subDistrict:        row.sub_district,
    relatedPerson1:     row.related_person1,
    relatedPerson2:     row.related_person2,
    pendingDelete:      row.pending_delete,
    projectType:        row.project_type || '',
    relatedAgencies:    row.related_agencies || [],
    documents:          row.documents || [],
    activityLog:        row.activity_log || [],
    timeline:           row.timeline || [],
  }
}

async function nextCaseId() {
  const { rows } = await pool.query(
    `SELECT id FROM cases WHERE id ~ '^CA-\\d+$'
     ORDER BY CAST(SUBSTRING(id FROM 4) AS INTEGER) DESC LIMIT 1`
  )
  if (rows.length === 0) return 'CA-0001'
  const n = parseInt(rows[0].id.split('-')[1], 10)
  return `CA-${String(n + 1).padStart(4, '0')}`
}

// GET /api/cases
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category, visibility, search, page = 1, limit = 200 } = req.query
    const conditions = []
    const params = []

    if (status) {
      params.push(status)
      conditions.push(`status = $${params.length}`)
    }
    if (category) {
      params.push(category)
      conditions.push(`category = $${params.length}`)
    }
    if (req.user.role === 'user') {
      conditions.push(`visibility = 'Internal'`)
    } else if (visibility) {
      params.push(visibility)
      conditions.push(`visibility = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      const i = params.length
      conditions.push(`(title ILIKE $${i} OR id ILIKE $${i} OR agency ILIKE $${i})`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRes = await pool.query(`SELECT COUNT(*) FROM cases ${where}`, params)
    const total = parseInt(countRes.rows[0].count)

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const dataRes = await pool.query(
      `SELECT * FROM cases ${where} ORDER BY last_updated DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), skip]
    )

    res.json({ data: dataRes.rows.map(rowToCase), total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// GET /api/cases/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cases WHERE id = $1', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Case not found' })
    const c = rowToCase(rows[0])
    if (c.visibility === 'Restricted' && req.user.role === 'user') return res.status(403).json({ error: 'Access denied' })
    res.json(c)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// POST /api/cases
router.post('/', authenticate, async (req, res) => {
  try {
    const id = await nextCaseId()
    const today = new Date().toISOString().split('T')[0]
    const b = req.body
    const { rows } = await pool.query(
      `INSERT INTO cases (
         id, agency_id, title, agency, category, sub_category, procurement_method,
         status, date, budget, source, last_updated, visibility, restricted_notes,
         description, agency_type, agency_role, region, province, district, sub_district,
         related_person1, related_person2, pending_delete, related_agencies,
         documents, activity_log, timeline, project_type
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
       ) RETURNING *`,
      [
        id, b.agencyId||null, b.title||'', b.agency||'', b.category||'', b.subCategory||'',
        b.procurementMethod||'', b.status||'', b.date||'', b.budget||'', b.source||'',
        today, b.visibility||'Internal', b.restrictedNotes||'', b.description||'',
        b.agencyType||'', b.agencyRole||'', b.region||'', b.province||'', b.district||'',
        b.subDistrict||'', b.relatedPerson1||'', b.relatedPerson2||'',
        null,
        JSON.stringify(b.relatedAgencies||[]),
        JSON.stringify(b.documents||[]),
        JSON.stringify(b.activityLog||[]),
        JSON.stringify(b.timeline||[]),
        b.projectType||'',
      ]
    )
    res.status(201).json(rowToCase(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// PUT /api/cases/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT * FROM cases WHERE id = $1', [req.params.id])
    if (existing.length === 0) return res.status(404).json({ error: 'Case not found' })
    const today = new Date().toISOString().split('T')[0]
    const b = req.body
    const { rows } = await pool.query(
      `UPDATE cases SET
         agency_id=$1, title=$2, agency=$3, category=$4, sub_category=$5,
         procurement_method=$6, status=$7, date=$8, budget=$9, source=$10,
         last_updated=$11, visibility=$12, restricted_notes=$13, description=$14,
         agency_type=$15, agency_role=$16, region=$17, province=$18, district=$19,
         sub_district=$20, related_person1=$21, related_person2=$22,
         pending_delete=$23, related_agencies=$24, documents=$25,
         activity_log=$26, timeline=$27, project_type=$28
       WHERE id=$29 RETURNING *`,
      [
        b.agencyId||null, b.title||'', b.agency||'', b.category||'', b.subCategory||'',
        b.procurementMethod||'', b.status||'', b.date||'', b.budget||'', b.source||'',
        today, b.visibility||'Internal', b.restrictedNotes||'', b.description||'',
        b.agencyType||'', b.agencyRole||'', b.region||'', b.province||'', b.district||'',
        b.subDistrict||'', b.relatedPerson1||'', b.relatedPerson2||'',
        b.pendingDelete ? JSON.stringify(b.pendingDelete) : null,
        JSON.stringify(b.relatedAgencies||[]),
        JSON.stringify(b.documents||[]),
        JSON.stringify(b.activityLog||[]),
        JSON.stringify(b.timeline||[]),
        b.projectType||'',
        req.params.id,
      ]
    )
    res.json(rowToCase(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// DELETE /api/cases/:id  (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM cases WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Case not found' })
    res.json({ message: 'Case deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// POST /api/cases/:id/request-delete
router.post('/:id/request-delete', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cases WHERE id = $1', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Case not found' })
    const now = new Date()
    const pendingDelete = {
      requestedBy: req.user.name,
      requestedByRole: req.user.role,
      requestedAt: `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
    }
    const { rows: updated } = await pool.query(
      'UPDATE cases SET pending_delete = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(pendingDelete), req.params.id]
    )
    res.json(rowToCase(updated[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// POST /api/cases/:id/approve-delete  (admin)
router.post('/:id/approve-delete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM cases WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Case not found' })
    res.json({ message: 'Case deleted after approval' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// POST /api/cases/:id/reject-delete  (admin)
router.post('/:id/reject-delete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE cases SET pending_delete = NULL WHERE id = $1 RETURNING *',
      [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Case not found' })
    res.json(rowToCase(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

module.exports = router

const express = require('express')
const pool = require('../db/pool')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

function rowToAgency(row) {
  return {
    id:          row.id,
    name:        row.name,
    typeCode:    row.type_code,
    subtypeCode: row.subtype_code,
    region:      row.region,
    province:    row.province,
    district:    row.district,
    subdistrict: row.subdistrict,
    cases:       row.cases,
    logo:        row.logo,
  }
}

async function nextAgencyId() {
  const { rows } = await pool.query(
    `SELECT id FROM agencies WHERE id ~ '^AG-\\d+$'
     ORDER BY CAST(SUBSTRING(id FROM 4) AS INTEGER) DESC LIMIT 1`
  )
  if (rows.length === 0) return 'AG-0001'
  const n = parseInt(rows[0].id.split('-')[1], 10)
  return `AG-${String(n + 1).padStart(4, '0')}`
}

// GET /api/agencies
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, typeCode, page = 1, limit = 200 } = req.query
    const conditions = []
    const params = []

    if (typeCode) {
      params.push(typeCode)
      conditions.push(`type_code = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      const i = params.length
      conditions.push(`(name ILIKE $${i} OR id ILIKE $${i})`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRes = await pool.query(`SELECT COUNT(*) FROM agencies ${where}`, params)
    const total = parseInt(countRes.rows[0].count)

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const dataRes = await pool.query(
      `SELECT * FROM agencies ${where} ORDER BY id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), skip]
    )

    res.json({ data: dataRes.rows.map(rowToAgency), total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// GET /api/agencies/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM agencies WHERE id = $1', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Agency not found' })
    res.json(rowToAgency(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// POST /api/agencies  (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = await nextAgencyId()
    const b = req.body
    const { rows } = await pool.query(
      `INSERT INTO agencies (id, name, type_code, subtype_code, region, province, district, subdistrict, cases, logo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, b.name||'', b.typeCode||'', b.subtypeCode||'', b.region||'', b.province||'', b.district||'', b.subdistrict||'', 0, b.logo||'']
    )
    res.status(201).json(rowToAgency(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// PUT /api/agencies/:id  (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT * FROM agencies WHERE id = $1', [req.params.id])
    if (existing.length === 0) return res.status(404).json({ error: 'Agency not found' })
    const b = req.body
    const { rows } = await pool.query(
      `UPDATE agencies SET
         name=$1, type_code=$2, subtype_code=$3, region=$4, province=$5,
         district=$6, subdistrict=$7, cases=$8, logo=$9
       WHERE id=$10 RETURNING *`,
      [
        b.name||existing[0].name, b.typeCode||existing[0].type_code,
        b.subtypeCode||existing[0].subtype_code, b.region||existing[0].region,
        b.province||existing[0].province, b.district||existing[0].district,
        b.subdistrict||existing[0].subdistrict,
        b.cases !== undefined ? b.cases : existing[0].cases,
        b.logo !== undefined ? b.logo : existing[0].logo,
        req.params.id,
      ]
    )
    res.json(rowToAgency(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// DELETE /api/agencies/:id  (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM agencies WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Agency not found' })
    res.json({ message: 'Agency deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

module.exports = router

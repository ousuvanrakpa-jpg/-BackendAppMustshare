const express = require('express')
const pool = require('../db/pool')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// GET /api/geography/regions
router.get('/regions', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM th_regions ORDER BY name')
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// GET /api/geography/provinces?region_id=1
router.get('/provinces', authenticate, async (req, res) => {
  try {
    const { region_id } = req.query
    const where = region_id ? 'WHERE region_id = $1' : ''
    const params = region_id ? [region_id] : []
    const { rows } = await pool.query(
      `SELECT p.id, p.name, r.name AS region
       FROM th_provinces p
       JOIN th_regions r ON r.id = p.region_id
       ${where} ORDER BY p.name`,
      params
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// GET /api/geography/districts?province_id=1
router.get('/districts', authenticate, async (req, res) => {
  try {
    const { province_id } = req.query
    if (!province_id) return res.json([])
    const { rows } = await pool.query(
      'SELECT id, name FROM th_districts WHERE province_id = $1 ORDER BY name',
      [province_id]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// GET /api/geography/sub-districts?district_id=1
router.get('/sub-districts', authenticate, async (req, res) => {
  try {
    const { district_id } = req.query
    if (!district_id) return res.json([])
    const { rows } = await pool.query(
      'SELECT id, name, zipcode FROM th_sub_districts WHERE district_id = $1 ORDER BY name',
      [district_id]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

// GET /api/geography/lookup?province=กรุงเทพมหานคร
// ใช้หา id จากชื่อ (สำหรับโหลด case ที่มีอยู่แล้ว)
router.get('/lookup', authenticate, async (req, res) => {
  try {
    const { province, district, sub_district } = req.query
    const result = {}

    if (province) {
      const { rows } = await pool.query(
        'SELECT p.id, p.name, r.name AS region FROM th_provinces p JOIN th_regions r ON r.id = p.region_id WHERE p.name = $1',
        [province]
      )
      result.province = rows[0] || null
    }
    if (province && district) {
      const { rows: provRows } = await pool.query('SELECT id FROM th_provinces WHERE name = $1', [province])
      if (provRows.length > 0) {
        const { rows } = await pool.query(
          'SELECT id, name FROM th_districts WHERE name = $1 AND province_id = $2',
          [district, provRows[0].id]
        )
        result.district = rows[0] || null
      }
    }
    if (province && district && sub_district) {
      const { rows: provRows } = await pool.query('SELECT id FROM th_provinces WHERE name = $1', [province])
      if (provRows.length > 0) {
        const { rows: distRows } = await pool.query(
          'SELECT id FROM th_districts WHERE name = $1 AND province_id = $2',
          [district, provRows[0].id]
        )
        if (distRows.length > 0) {
          const { rows } = await pool.query(
            'SELECT id, name, zipcode FROM th_sub_districts WHERE name = $1 AND district_id = $2',
            [sub_district, distRows[0].id]
          )
          result.sub_district = rows[0] || null
        }
      }
    }

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Database error' })
  }
})

module.exports = router

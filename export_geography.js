/**
 * Export ข้อมูลภูมิศาสตร์ไทยออกเป็น Excel
 * วิธีใช้: node export_geography.js
 */

require('dotenv').config()
const XLSX = require('xlsx')
const { Pool } = require('pg')
const path = require('path')

const host = process.env.DB_HOST || 'localhost'
const pool = new Pool({
  host,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'mustshare',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl:      host === 'localhost' ? false : { rejectUnauthorized: false },
})

async function main() {
  console.log('กำลัง export ข้อมูลภูมิศาสตร์...')

  // ดึงข้อมูลทั้งหมดพร้อม join
  const { rows } = await pool.query(`
    SELECT
      r.name  AS region,
      p.name  AS province,
      d.name  AS district,
      s.name  AS sub_district,
      s.zipcode
    FROM th_sub_districts s
    JOIN th_districts d    ON d.id = s.district_id
    JOIN th_provinces p    ON p.id = d.province_id
    JOIN th_regions   r    ON r.id = p.region_id
    ORDER BY r.name, p.name, d.name, s.name
  `)

  console.log(`  พบข้อมูล ${rows.length} รายการ`)

  const wb = XLSX.utils.book_new()

  // Sheet 1: ข้อมูลทั้งหมด
  const allData = [
    ['ภาค', 'จังหวัด', 'อำเภอ/เขต', 'ตำบล/แขวง', 'รหัสไปรษณีย์'],
    ...rows.map(r => [r.region, r.province, r.district, r.sub_district, r.zipcode || ''])
  ]
  const wsAll = XLSX.utils.aoa_to_sheet(allData)
  wsAll['!cols'] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsAll, 'ทั้งหมด')

  // Sheet 2: จังหวัด (unique)
  const { rows: provRows } = await pool.query(`
    SELECT r.name AS region, p.name AS province
    FROM th_provinces p JOIN th_regions r ON r.id = p.region_id
    ORDER BY r.name, p.name
  `)
  const provData = [
    ['ภาค', 'จังหวัด'],
    ...provRows.map(r => [r.region, r.province])
  ]
  const wsProv = XLSX.utils.aoa_to_sheet(provData)
  wsProv['!cols'] = [{ wch: 28 }, { wch: 28 }]
  XLSX.utils.book_append_sheet(wb, wsProv, 'จังหวัด')

  // Sheet 3: อำเภอ (unique)
  const { rows: distRows } = await pool.query(`
    SELECT p.name AS province, d.name AS district
    FROM th_districts d JOIN th_provinces p ON p.id = d.province_id
    ORDER BY p.name, d.name
  `)
  const distData = [
    ['จังหวัด', 'อำเภอ/เขต'],
    ...distRows.map(r => [r.province, r.district])
  ]
  const wsDist = XLSX.utils.aoa_to_sheet(distData)
  wsDist['!cols'] = [{ wch: 28 }, { wch: 28 }]
  XLSX.utils.book_append_sheet(wb, wsDist, 'อำเภอ')

  await pool.end()

  const outPath = path.join('C:', 'Users', 'rakpa', 'Backend_AppMustshare', 'data_for_database', 'thailand_geography.xlsx')
  XLSX.writeFile(wb, outPath)

  console.log('✓ Export สำเร็จ:', outPath)
  console.log(`  Sheet "ทั้งหมด" : ${rows.length} แถว`)
  console.log(`  Sheet "จังหวัด" : ${provRows.length} แถว`)
  console.log(`  Sheet "อำเภอ"   : ${distRows.length} แถว`)
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })

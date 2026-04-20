/**
 * Import Agencies จาก Excel เข้า PostgreSQL
 * วิธีใช้:
 *   node import_agencies.js                 ← ใช้ไฟล์ default
 *   node import_agencies.js myfile.xlsx     ← ระบุไฟล์เอง
 *   node import_agencies.js --dry-run       ← ทดสอบไม่บันทึกจริง
 */

const XLSX = require('xlsx')
const { Pool } = require('pg')
const path = require('path')

const pool = new Pool({
  host: 'localhost', port: 5432,
  database: 'mustshare', user: 'postgres', password: 'rakparaknam0123',
})

const args     = process.argv.slice(2)
const filePath = args.find(a => !a.startsWith('--'))
  || path.join('C:', 'Users', 'rakpa', 'Backend_AppMustshare', 'data_for_database', 'cases_import_0.2.xlsx')
const DRY_RUN  = args.includes('--dry-run')

function str(val) { return String(val || '').trim() }

async function main() {
  console.log('='.repeat(60))
  console.log('Agency Import')
  console.log('='.repeat(60))
  console.log('ไฟล์:', filePath)
  if (DRY_RUN) console.log('โหมด: DRY RUN')
  console.log('')

  const wb = XLSX.readFile(filePath)
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['agencydata'] || {}, { defval: '' })
  const validRows = rows.filter(r => str(r.id) && str(r.name))
  console.log(`agencydata: ${rows.length} rows, มีข้อมูล: ${validRows.length} rows\n`)

  // โหลด IDs ที่มีใน DB
  const { rows: dbRows } = await pool.query('SELECT id FROM agencies')
  const dbIds = new Set(dbRows.map(r => r.id))
  const excelIds = new Set(validRows.map(r => str(r.id)))

  console.log(`DB agencies: ${dbIds.size}`)
  console.log(`Excel agencies: ${excelIds.size}`)
  console.log(`ใหม่ที่ต้อง INSERT: ${[...excelIds].filter(id => !dbIds.has(id)).length}`)
  console.log(`หายไปที่ต้อง DELETE: ${[...dbIds].filter(id => !excelIds.has(id)).length}\n`)
  console.log('-'.repeat(60))

  let inserted = 0, updated = 0, deleted = 0, errors = 0

  for (const row of validRows) {
    const id = str(row.id)
    const exists = dbIds.has(id)
    const params = [
      id,
      str(row.name),
      str(row.type_code),
      str(row.subtype_code),
      str(row.region),
      str(row['province '] || row.province || ''),
      str(row.district),
      str(row.subdistrict || ''),
    ]

    if (DRY_RUN) {
      if (!exists) {
        console.log(`  [DRY] INSERT ${id}: ${str(row.name).slice(0, 50)}`)
        inserted++
      }
      continue
    }

    try {
      if (exists) {
        await pool.query(
          `UPDATE agencies SET name=$2, type_code=$3, subtype_code=$4, region=$5, province=$6, district=$7, subdistrict=$8
           WHERE id=$1`,
          params
        )
        updated++
      } else {
        await pool.query(
          `INSERT INTO agencies (id, name, type_code, subtype_code, region, province, district, subdistrict)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          params
        )
        console.log(`  ✓ INSERT ${id}: ${str(row.name).slice(0, 50)}`)
        inserted++
      }
    } catch (e) {
      console.error(`  ✗ ${id}: ${e.message}`)
      errors++
    }
  }

  // ลบ agencies ที่ไม่มีใน Excel แล้ว (เฉพาะที่ไม่มี cases อ้างถึง)
  const toDelete = [...dbIds].filter(id => !excelIds.has(id))
  for (const id of toDelete) {
    if (DRY_RUN) {
      console.log(`  [DRY] DELETE ${id}`)
      deleted++
      continue
    }
    try {
      await pool.query('DELETE FROM agencies WHERE id=$1', [id])
      console.log(`  ✓ DELETE ${id}`)
      deleted++
    } catch (e) {
      console.error(`  ✗ DELETE ${id}: ${e.message}`)
      errors++
    }
  }

  await pool.end()

  console.log('\n' + '='.repeat(60))
  console.log('สรุปผล:')
  console.log(`  INSERT : ${inserted}`)
  console.log(`  UPDATE : ${updated}`)
  console.log(`  DELETE : ${deleted}`)
  console.log(`  ผิดพลาด: ${errors}`)
  console.log('='.repeat(60))
  if (DRY_RUN) console.log('\n⚠ DRY RUN — ไม่มีการบันทึกจริง')
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })

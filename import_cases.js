/**
 * นำเข้าข้อมูล Cases จาก Excel (หลาย Sheet) เข้า PostgreSQL
 *
 * วิธีใช้:
 *   node import_cases.js                              ← ใช้ไฟล์ default
 *   node import_cases.js my_cases.xlsx                ← ระบุไฟล์เอง
 *   node import_cases.js my_cases.xlsx --dry-run       ← ทดสอบโดยไม่บันทึกจริง
 *   node import_cases.js my_cases.xlsx --overwrite     ← อัปเดต case ที่มี id ซ้ำแทนการข้าม
 *
 * ต้องการ: npm install xlsx (ติดตั้งแล้ว)
 */

const XLSX  = require('xlsx')
const { Pool } = require('pg')
const path  = require('path')

// ============================================================
// Config
// ============================================================
const DB_CONFIG = {
  host:     'localhost',
  port:     5432,
  database: 'mustshare',
  user:     'postgres',
  password: 'rakparaknam0123',
}

const DEFAULT_FILE = path.join('C:', 'Users', 'rakpa', 'Backend_AppMustshare', 'data_for_database', 'case_import_template.xlsx')

const args     = process.argv.slice(2)
const filePath = args.find(a => !a.startsWith('--')) || DEFAULT_FILE
const DRY_RUN  = args.includes('--dry-run')
const OVERWRITE = args.includes('--overwrite')

// ============================================================
// Helper: สร้าง ID ถัดไป
// ============================================================
async function nextCaseId(pool) {
  const { rows } = await pool.query(
    `SELECT id FROM cases WHERE id ~ '^CA-\\d+$'
     ORDER BY CAST(SUBSTRING(id FROM 4) AS INTEGER) DESC LIMIT 1`
  )
  if (rows.length === 0) return 'CA-0001'
  const n = parseInt(rows[0].id.split('-')[1], 10)
  return `CA-${String(n + 1).padStart(4, '0')}`
}

// ============================================================
// Helper: แปลง row object จาก Excel (key = header ใน row แรก)
// ============================================================
function sheetToObjects(ws) {
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

// ============================================================
// Validate required fields
// ============================================================
function validateCase(row, rowNum) {
  const errors = []
  if (!String(row.title || '').trim())    errors.push('title ว่าง')
  if (!String(row.category || '').trim()) errors.push('category ว่าง')
  if (!String(row.status || '').trim())   errors.push('status ว่าง')

  const validCategories = ['จัดซื้อจัดจ้าง', 'ทุจริตเชิงนโยบาย', 'รุกล้ำที่ดินสาธารณะ', 'พฤติกรรมเจ้าหน้าที่รัฐ', 'อื่น ๆ']
  if (row.category && !validCategories.includes(String(row.category).trim())) {
    errors.push(`category "${row.category}" ไม่ถูกต้อง`)
  }

  const validStatuses = ['รับเรื่อง', 'กำลังดำเนินการ', 'รอหลักฐาน', 'ส่งต่อหน่วยงาน', 'ปิดเรื่อง', 'ยกเลิก', 'อยู่ระหว่างอุทธรณ์', 'ชนะคดี']
  if (row.status && !validStatuses.includes(String(row.status).trim())) {
    errors.push(`status "${row.status}" ไม่ถูกต้อง`)
  }

  if (errors.length > 0) {
    console.warn(`  ⚠ row ${rowNum}: ${errors.join(' | ')}`)
    return false
  }
  return true
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('='.repeat(60))
  console.log('Case Import Script')
  console.log('='.repeat(60))
  console.log('ไฟล์:', filePath)
  if (DRY_RUN)  console.log('โหมด: DRY RUN (ไม่บันทึกจริง)')
  if (OVERWRITE) console.log('โหมด: OVERWRITE (อัปเดต case ที่ซ้ำ)')
  console.log('')

  // อ่าน Excel
  let wb
  try {
    wb = XLSX.readFile(filePath)
  } catch (e) {
    console.error('✗ เปิดไฟล์ไม่ได้:', e.message)
    process.exit(1)
  }

  const sheetNames = wb.SheetNames
  console.log('Sheets ที่พบ:', sheetNames.join(', '))

  if (!sheetNames.includes('cases')) {
    console.error('✗ ไม่พบ sheet "cases" ในไฟล์')
    process.exit(1)
  }

  // อ่านข้อมูลจากแต่ละ sheet
  const caseRows    = sheetToObjects(wb.Sheets['cases'])
  const relatedRows = sheetNames.includes('related_agencies')
    ? sheetToObjects(wb.Sheets['related_agencies'])
    : []
  const timelineRows = sheetNames.includes('timeline')
    ? sheetToObjects(wb.Sheets['timeline'])
    : []

  console.log(`\nข้อมูลที่อ่านได้:`)
  console.log(`  cases:             ${caseRows.length} row`)
  console.log(`  related_agencies:  ${relatedRows.length} row`)
  console.log(`  timeline:          ${timelineRows.length} row`)

  if (caseRows.length === 0) {
    console.error('\n✗ ไม่มีข้อมูลใน sheet "cases"')
    process.exit(1)
  }

  // ลบ row ตัวอย่างที่มี case_id = CA-EXAMPLE-X
  const filteredRelated  = relatedRows.filter(r => !String(r.case_id || '').startsWith('CA-EXAMPLE'))
  const filteredTimeline = timelineRows.filter(r => !String(r.case_id || '').startsWith('CA-EXAMPLE'))

  // จัดกลุ่ม related_agencies และ timeline ตาม case_id / title
  const relatedMap  = {}
  const timelineMap = {}

  for (const r of filteredRelated) {
    const key = String(r.case_id || '').trim()
    if (!key) continue
    if (!relatedMap[key]) relatedMap[key] = []
    relatedMap[key].push({ agencyId: String(r.agency_id || '').trim(), agencyRole: String(r.agency_role || '').trim() })
  }

  for (const t of filteredTimeline) {
    const key = String(t.case_id || '').trim()
    if (!key) continue
    if (!timelineMap[key]) timelineMap[key] = []
    timelineMap[key].push({
      date:   String(t.date   || '').trim(),
      status: String(t.status || '').trim(),
      note:   String(t.note   || '').trim(),
    })
  }

  // เชื่อม DB
  const pool = new Pool(DB_CONFIG)
  const today = new Date().toISOString().split('T')[0]

  let inserted = 0
  let updated  = 0
  let skipped  = 0
  let errors   = 0

  console.log('\n' + '-'.repeat(60))
  console.log('เริ่ม import...')
  console.log('-'.repeat(60))

  let autoIdCounter = null // จะโหลดครั้งแรกที่ต้องการ

  for (let i = 0; i < caseRows.length; i++) {
    const row    = caseRows[i]
    const rowNum = i + 2  // +2 เพราะ row 1 = header

    // ข้าม row ว่าง
    if (!row.title && !row.category) continue

    // Validate
    if (!validateCase(row, rowNum)) { errors++; continue }

    const title = String(row.title || '').trim()

    // ตรวจสอบว่ามี id ระบุมาหรือเปล่า
    let caseId = String(row.id || '').trim()

    if (!caseId) {
      // ไม่มี id → สร้างอัตโนมัติ
      if (autoIdCounter === null) {
        // โหลด last ID ครั้งแรก
        const { rows: lastRows } = await pool.query(
          `SELECT id FROM cases WHERE id ~ '^CA-\\d+$'
           ORDER BY CAST(SUBSTRING(id FROM 4) AS INTEGER) DESC LIMIT 1`
        )
        autoIdCounter = lastRows.length > 0 ? parseInt(lastRows[0].id.split('-')[1], 10) : 0
      }
      autoIdCounter++
      caseId = `CA-${String(autoIdCounter).padStart(4, '0')}`
    }

    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    const { rows: existing } = await pool.query('SELECT id FROM cases WHERE id = $1', [caseId])
    const exists = existing.length > 0

    if (exists && !OVERWRITE) {
      console.log(`  ⟳ ข้าม ${caseId} (มีอยู่แล้ว — ใช้ --overwrite เพื่ออัปเดต)`)
      skipped++
      continue
    }

    // รวบรวม related_agencies
    const relatedAgencies = relatedMap[caseId] || []

    // ถ้า agency_id ระบุในแถวหลัก และ related_agencies ว่าง → เพิ่มอัตโนมัติ
    if (relatedAgencies.length === 0 && row.agency_id) {
      relatedAgencies.push({
        agencyId:   String(row.agency_id).trim(),
        agencyRole: String(row.agency_role || 'เจ้าของโครงการ').trim(),
      })
    }

    // รวบรวม timeline
    const timeline = (timelineMap[caseId] || []).map(t => ({
      date:   t.date,
      status: t.status,
      ...(t.note ? { note: t.note } : {}),
    }))

    const params = [
      String(row.agency_id          || '').trim() || null,
      title,
      String(row.agency             || '').trim(),
      String(row.category           || '').trim(),
      String(row.sub_category       || '').trim(),
      String(row.procurement_method || '').trim(),
      String(row.status             || '').trim(),
      String(row.date               || today).trim(),
      String(row.budget             || '').trim(),
      String(row.source             || '').trim(),
      today,
      String(row.visibility         || 'Internal').trim(),
      String(row.restricted_notes   || '').trim(),
      String(row.description        || '').trim(),
      String(row.agency_type        || '').trim(),
      String(row.agency_role        || '').trim(),
      String(row.region             || '').trim(),
      String(row.province           || '').trim(),
      String(row.district           || '').trim(),
      String(row.sub_district       || '').trim(),
      String(row.related_person1    || '').trim(),
      String(row.related_person2    || '').trim(),
      JSON.stringify(relatedAgencies),
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify(timeline),
      String(row.project_type       || '').trim(),
    ]

    if (DRY_RUN) {
      console.log(`  [DRY] ${exists ? 'UPDATE' : 'INSERT'} ${caseId}: ${title}`)
      console.log(`        related_agencies: ${relatedAgencies.length} รายการ, timeline: ${timeline.length} รายการ`)
      if (exists) updated++; else inserted++
      continue
    }

    try {
      if (exists) {
        await pool.query(
          `UPDATE cases SET
             agency_id=$1, title=$2, agency=$3, category=$4, sub_category=$5,
             procurement_method=$6, status=$7, date=$8, budget=$9, source=$10,
             last_updated=$11, visibility=$12, restricted_notes=$13, description=$14,
             agency_type=$15, agency_role=$16, region=$17, province=$18, district=$19,
             sub_district=$20, related_person1=$21, related_person2=$22,
             related_agencies=$23, documents=$24, activity_log=$25, timeline=$26,
             project_type=$27
           WHERE id=$28`,
          [...params, caseId]
        )
        console.log(`  ✓ UPDATE ${caseId}: ${title}`)
        updated++
      } else {
        await pool.query(
          `INSERT INTO cases (
             id, agency_id, title, agency, category, sub_category, procurement_method,
             status, date, budget, source, last_updated, visibility, restricted_notes,
             description, agency_type, agency_role, region, province, district, sub_district,
             related_person1, related_person2, related_agencies, documents, activity_log,
             timeline, project_type
           ) VALUES (
             $28,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
           )`,
          [...params, caseId]
        )
        console.log(`  ✓ INSERT ${caseId}: ${title}`)
        inserted++
      }
    } catch (e) {
      console.error(`  ✗ ${caseId}: ${e.message}`)
      errors++
    }
  }

  await pool.end()

  console.log('\n' + '='.repeat(60))
  console.log('สรุปผล:')
  console.log(`  INSERT สำเร็จ : ${inserted}`)
  console.log(`  UPDATE สำเร็จ : ${updated}`)
  console.log(`  ข้าม (ซ้ำ)   : ${skipped}`)
  console.log(`  ผิดพลาด      : ${errors}`)
  console.log('='.repeat(60))

  if (DRY_RUN) {
    console.log('\n⚠ DRY RUN — ไม่มีการบันทึกจริง รัน import ใหม่โดยไม่ใส่ --dry-run เพื่อบันทึก')
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })

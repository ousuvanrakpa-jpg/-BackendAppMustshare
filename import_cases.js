/**
 * Import Cases จาก Excel เข้า PostgreSQL
 * วิธีใช้:
 *   node import_cases.js                        ← ใช้ไฟล์ default
 *   node import_cases.js myfile.xlsx            ← ระบุไฟล์เอง
 *   node import_cases.js myfile.xlsx --dry-run  ← ทดสอบไม่บันทึกจริง
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

// แปลง Excel date serial → YYYY-MM-DD
function excelDateToString(val) {
  if (!val) return ''
  if (typeof val === 'string' && val.includes('-')) return val.slice(0, 10)
  if (typeof val === 'string' && val.includes('/')) {
    const parts = val.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    }
  }
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000)
    return date.toISOString().slice(0, 10)
  }
  return String(val).slice(0, 10)
}

function str(val) { return String(val || '').trim() }

async function main() {
  console.log('='.repeat(60))
  console.log('Case Import')
  console.log('='.repeat(60))
  console.log('ไฟล์:', filePath)
  if (DRY_RUN) console.log('โหมด: DRY RUN')
  console.log('')

  // อ่าน Excel
  const wb = XLSX.readFile(filePath)
  const caseRows    = XLSX.utils.sheet_to_json(wb.Sheets['cases']           || {}, { defval: '' })
  const relatedRows = XLSX.utils.sheet_to_json(wb.Sheets['related_agencies'] || {}, { defval: '' })
  const timelineRows= XLSX.utils.sheet_to_json(wb.Sheets['timeline']         || {}, { defval: '' })
  const personRows  = XLSX.utils.sheet_to_json(wb.Sheets['related_persons']  || {}, { defval: '' })

  console.log(`cases:             ${caseRows.length} rows`)
  console.log(`related_agencies:  ${relatedRows.length} rows`)
  console.log(`timeline:          ${timelineRows.length} rows`)
  console.log(`related_persons:   ${personRows.length} rows`)

  // กรองแถวว่าง
  const validCases = caseRows.filter(r => str(r.title) && str(r.case_id))
  console.log(`cases มีข้อมูล:    ${validCases.length} rows\n`)

  // จัดกลุ่ม related_agencies และ timeline ตาม case_id
  const relatedMap = {}
  for (const r of relatedRows) {
    const key = str(r.case_id)
    if (!key) continue
    if (!relatedMap[key]) relatedMap[key] = []
    if (str(r.agency_id)) relatedMap[key].push({ agencyId: str(r.agency_id), agencyRole: str(r.agency_role) })
  }

  const timelineMap = {}
  for (const t of timelineRows) {
    const key = str(t.case_id)
    if (!key) continue
    if (!timelineMap[key]) timelineMap[key] = []
    const entry = { date: excelDateToString(t.date), status: str(t.status) }
    if (str(t.note)) entry.note = str(t.note)
    timelineMap[key].push(entry)
  }

  // จัดกลุ่ม related_persons ตาม case_id (ใช้ชื่อ + ตำแหน่ง)
  const personMap = {}
  for (const p of personRows) {
    const key = str(p.case_id)
    if (!key) continue
    if (!personMap[key]) personMap[key] = []
    const label = str(p.person_position) ? `${str(p.person_name)} (${str(p.person_position)})` : str(p.person_name)
    if (label) personMap[key].push(label)
  }

  // โหลด agency names จาก DB
  const { rows: agencyRows } = await pool.query('SELECT id, name FROM agencies')
  const agencyNameMap = {}
  agencyRows.forEach(a => { agencyNameMap[a.id] = a.name })

  console.log('-'.repeat(60))

  let inserted = 0, updated = 0, skipped = 0, errors = 0
  const today = new Date().toISOString().slice(0, 10)

  for (const row of validCases) {
    const caseId = str(row.case_id)

    // ตรวจว่ามีอยู่แล้วหรือไม่
    const { rows: existing } = await pool.query('SELECT id FROM cases WHERE id = $1', [caseId])
    const exists = existing.length > 0

    // หา agency name จาก agency_id
    const agencyId   = str(row.agency_id)
    const agencyName = agencyNameMap[agencyId] || str(row.agency) || ''

    // related_agencies: ใช้จาก sheet related_agencies ก่อน ถ้าไม่มีใช้ agency_id จาก row
    let relatedAgencies = relatedMap[caseId] || []
    if (relatedAgencies.length === 0 && agencyId) {
      relatedAgencies = [{ agencyId, agencyRole: str(row.agency_role) || 'เจ้าของโครงการ' }]
    }

    const timeline = timelineMap[caseId] || []

    // แปลง column names ให้ตรงกับ DB
    const visibility      = 'Internal'
    const source          = str(row.casesource || row.source || '')
    const subDistr        = str(row.Sub_district || row.sub_district || '')
    const date            = excelDateToString(row.date) || today
    const restrictedNotes = str(row.restricted_notes || '')

    // แปลง restricted_notes → notes array (ถ้ามีข้อมูล)
    const notes = restrictedNotes
      ? [{ name: 'ระบบ', date: today, text: restrictedNotes }]
      : []

    // สร้าง documents จาก data_source columns
    const documents = []
    if (str(row.data_source_act_ai))  documents.push({ type: 'Link', name: 'โครงการจาก ACT AI', url: str(row.data_source_act_ai),  access: 'Public' })
    if (str(row.data_source_egp))     documents.push({ type: 'Link', name: 'โครงการจาก e-GP',   url: str(row.data_source_egp),     access: 'Public' })
    if (str(row.data_source_other))   documents.push({ type: 'Link', name: 'ข้อมูลโครงการ',      url: str(row.data_source_other),   access: 'Public' })

    const params = [
      agencyId || null,
      str(row.title),
      agencyName,
      str(row.category),
      str(row.sub_category),
      str(row.procurement_method),
      str(row.status),
      date,
      str(row.budget),
      source,
      today,
      visibility,
      str(row.restricted_notes),
      str(row.description),
      '',                          // agency_type
      str(row.agency_role),
      str(row.region),
      str(row.province),
      str(row.district),
      subDistr,
      personMap[caseId]?.[0] || str(row.related_person1),
      personMap[caseId]?.[1] || str(row.related_person2),
      JSON.stringify(relatedAgencies),
      JSON.stringify(documents),
      JSON.stringify([]),
      JSON.stringify(timeline),
      str(row.project_type),
      JSON.stringify(notes),
    ]

    if (DRY_RUN) {
      console.log(`  [DRY] ${exists ? 'UPDATE' : 'INSERT'} ${caseId}: ${str(row.title).slice(0, 50)}`)
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
             project_type=$27, notes=$28
           WHERE id=$29`,
          [...params, caseId]
        )
        console.log(`  ✓ UPDATE ${caseId}: ${str(row.title).slice(0, 50)}`)
        updated++
      } else {
        await pool.query(
          `INSERT INTO cases (
             id, agency_id, title, agency, category, sub_category, procurement_method,
             status, date, budget, source, last_updated, visibility, restricted_notes,
             description, agency_type, agency_role, region, province, district,
             sub_district, related_person1, related_person2,
             related_agencies, documents, activity_log, timeline, project_type, notes
           ) VALUES (
             $29,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
           )`,
          [...params, caseId]
        )
        console.log(`  ✓ INSERT ${caseId}: ${str(row.title).slice(0, 50)}`)
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
  console.log(`  INSERT : ${inserted}`)
  console.log(`  UPDATE : ${updated}`)
  console.log(`  ผิดพลาด: ${errors}`)
  console.log('='.repeat(60))
  if (DRY_RUN) console.log('\n⚠ DRY RUN — ไม่มีการบันทึกจริง')
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })

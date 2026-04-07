/**
 * สร้างตารางและ seed ข้อมูลภูมิศาสตร์ไทยทั้งหมด
 * - th_regions       : 6 ภาค
 * - th_provinces     : 77 จังหวัด
 * - th_districts     : 928 อำเภอ/เขต
 * - th_sub_districts : ~7,255 ตำบล/แขวง
 *
 * วิธีใช้: node seed_thailand_geography.js
 */

const { Pool } = require('pg')
const db = require('thai-address-database')

const pool = new Pool({
  host: 'localhost', port: 5432,
  database: 'mustshare',
  user: 'postgres', password: 'rakparaknam0123',
})

// ============================================================
// Province → Region mapping (6 ภาค)
// ============================================================
const PROVINCE_REGION = {
  // ภาคเหนือ
  'เชียงราย': 'ภาคเหนือ', 'เชียงใหม่': 'ภาคเหนือ', 'น่าน': 'ภาคเหนือ',
  'พะเยา': 'ภาคเหนือ', 'แพร่': 'ภาคเหนือ', 'แม่ฮ่องสอน': 'ภาคเหนือ',
  'ลำปาง': 'ภาคเหนือ', 'ลำพูน': 'ภาคเหนือ', 'อุตรดิตถ์': 'ภาคเหนือ',

  // ภาคกลาง
  'กรุงเทพมหานคร': 'ภาคกลาง', 'กาญจนบุรี': 'ภาคกลาง', 'นครนายก': 'ภาคกลาง',
  'นครปฐม': 'ภาคกลาง', 'นนทบุรี': 'ภาคกลาง', 'ปทุมธานี': 'ภาคกลาง',
  'พระนครศรีอยุธยา': 'ภาคกลาง', 'ราชบุรี': 'ภาคกลาง', 'ลพบุรี': 'ภาคกลาง',
  'สมุทรปราการ': 'ภาคกลาง', 'สมุทรสงคราม': 'ภาคกลาง', 'สมุทรสาคร': 'ภาคกลาง',
  'สระบุรี': 'ภาคกลาง', 'สิงห์บุรี': 'ภาคกลาง', 'สุพรรณบุรี': 'ภาคกลาง',
  'อ่างทอง': 'ภาคกลาง', 'ชัยนาท': 'ภาคกลาง',

  // ภาคตะวันออก
  'จันทบุรี': 'ภาคตะวันออก', 'ฉะเชิงเทรา': 'ภาคตะวันออก', 'ชลบุรี': 'ภาคตะวันออก',
  'ตราด': 'ภาคตะวันออก', 'ปราจีนบุรี': 'ภาคตะวันออก', 'ระยอง': 'ภาคตะวันออก',
  'สระแก้ว': 'ภาคตะวันออก',

  // ภาคตะวันตก
  'กำแพงเพชร': 'ภาคตะวันตก', 'ตาก': 'ภาคตะวันตก', 'นครสวรรค์': 'ภาคตะวันตก',
  'พิจิตร': 'ภาคตะวันตก', 'พิษณุโลก': 'ภาคตะวันตก', 'เพชรบุรี': 'ภาคตะวันตก',
  'เพชรบูรณ์': 'ภาคตะวันตก', 'ประจวบคีรีขันธ์': 'ภาคตะวันตก',
  'สุโขทัย': 'ภาคตะวันตก', 'อุทัยธานี': 'ภาคตะวันตก',

  // ภาคตะวันออกเฉียงเหนือ
  'กาฬสินธุ์': 'ภาคตะวันออกเฉียงเหนือ', 'ขอนแก่น': 'ภาคตะวันออกเฉียงเหนือ',
  'ชัยภูมิ': 'ภาคตะวันออกเฉียงเหนือ', 'นครพนม': 'ภาคตะวันออกเฉียงเหนือ',
  'นครราชสีมา': 'ภาคตะวันออกเฉียงเหนือ', 'บึงกาฬ': 'ภาคตะวันออกเฉียงเหนือ',
  'บุรีรัมย์': 'ภาคตะวันออกเฉียงเหนือ', 'มหาสารคาม': 'ภาคตะวันออกเฉียงเหนือ',
  'มุกดาหาร': 'ภาคตะวันออกเฉียงเหนือ', 'ยโสธร': 'ภาคตะวันออกเฉียงเหนือ',
  'ร้อยเอ็ด': 'ภาคตะวันออกเฉียงเหนือ', 'เลย': 'ภาคตะวันออกเฉียงเหนือ',
  'ศรีสะเกษ': 'ภาคตะวันออกเฉียงเหนือ', 'สกลนคร': 'ภาคตะวันออกเฉียงเหนือ',
  'สุรินทร์': 'ภาคตะวันออกเฉียงเหนือ', 'หนองคาย': 'ภาคตะวันออกเฉียงเหนือ',
  'หนองบัวลำภู': 'ภาคตะวันออกเฉียงเหนือ', 'อำนาจเจริญ': 'ภาคตะวันออกเฉียงเหนือ',
  'อุดรธานี': 'ภาคตะวันออกเฉียงเหนือ', 'อุบลราชธานี': 'ภาคตะวันออกเฉียงเหนือ',

  // ภาคใต้
  'กระบี่': 'ภาคใต้', 'ชุมพร': 'ภาคใต้', 'ตรัง': 'ภาคใต้',
  'นครศรีธรรมราช': 'ภาคใต้', 'นราธิวาส': 'ภาคใต้', 'ปัตตานี': 'ภาคใต้',
  'พังงา': 'ภาคใต้', 'พัทลุง': 'ภาคใต้', 'ภูเก็ต': 'ภาคใต้',
  'ระนอง': 'ภาคใต้', 'สงขลา': 'ภาคใต้', 'สตูล': 'ภาคใต้',
  'สุราษฎร์ธานี': 'ภาคใต้', 'ยะลา': 'ภาคใต้',
}

const ALL_PROVINCES = Object.keys(PROVINCE_REGION)

async function main() {
  console.log('='.repeat(60))
  console.log('Seed Thailand Geography')
  console.log('='.repeat(60))

  // ============================================================
  // Step 1: สร้างตาราง
  // ============================================================
  console.log('\n[1] สร้างตาราง...')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS th_regions (
      id   SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS th_provinces (
      id        SERIAL PRIMARY KEY,
      name      VARCHAR(100) NOT NULL UNIQUE,
      region_id INTEGER REFERENCES th_regions(id)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS th_districts (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      province_id INTEGER REFERENCES th_provinces(id),
      UNIQUE(name, province_id)
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS th_sub_districts (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      district_id INTEGER REFERENCES th_districts(id),
      zipcode     VARCHAR(10),
      UNIQUE(name, district_id)
    )
  `)
  console.log('  ✓ สร้างตารางสำเร็จ')

  // ============================================================
  // Step 2: ดึงข้อมูลทั้งหมดจาก thai-address-database
  // ============================================================
  console.log('\n[2] ดึงข้อมูลจาก thai-address-database...')
  let allRecords = []
  for (const prov of ALL_PROVINCES) {
    const records = db.searchAddressByProvince(prov, 9999)
    allRecords = allRecords.concat(records)
  }
  console.log(`  ✓ ดึงข้อมูลสำเร็จ: ${allRecords.length} records (ตำบล/แขวง)`)

  // ============================================================
  // Step 3: Insert regions
  // ============================================================
  console.log('\n[3] Insert regions...')
  const regions = [...new Set(Object.values(PROVINCE_REGION))]
  for (const r of regions) {
    await pool.query(
      'INSERT INTO th_regions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [r]
    )
  }
  const { rows: regionRows } = await pool.query('SELECT id, name FROM th_regions')
  const regionMap = {}
  regionRows.forEach(r => { regionMap[r.name] = r.id })
  console.log(`  ✓ ${regionRows.length} regions`)

  // ============================================================
  // Step 4: Insert provinces
  // ============================================================
  console.log('\n[4] Insert provinces...')
  for (const prov of ALL_PROVINCES) {
    const regionId = regionMap[PROVINCE_REGION[prov]]
    await pool.query(
      'INSERT INTO th_provinces (name, region_id) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [prov, regionId]
    )
  }
  const { rows: provRows } = await pool.query('SELECT id, name FROM th_provinces')
  const provMap = {}
  provRows.forEach(p => { provMap[p.name] = p.id })
  console.log(`  ✓ ${provRows.length} provinces`)

  // ============================================================
  // Step 5: Insert districts (batch)
  // ============================================================
  console.log('\n[5] Insert districts...')
  // สร้าง unique list ของ (amphoe, province)
  const districtSet = new Map()
  for (const rec of allRecords) {
    const key = `${rec.amphoe}||${rec.province}`
    if (!districtSet.has(key)) districtSet.set(key, { name: rec.amphoe, province: rec.province })
  }

  const districtList = [...districtSet.values()]
  // batch insert 500
  const BATCH = 500
  for (let i = 0; i < districtList.length; i += BATCH) {
    const batch = districtList.slice(i, i + BATCH)
    for (const d of batch) {
      const provId = provMap[d.province]
      if (!provId) continue
      await pool.query(
        'INSERT INTO th_districts (name, province_id) VALUES ($1, $2) ON CONFLICT (name, province_id) DO NOTHING',
        [d.name, provId]
      )
    }
  }
  const { rows: distRows } = await pool.query('SELECT id, name, province_id FROM th_districts')
  const distMap = {}
  distRows.forEach(d => { distMap[`${d.name}||${d.province_id}`] = d.id })
  console.log(`  ✓ ${distRows.length} districts`)

  // ============================================================
  // Step 6: Insert sub_districts (batch)
  // ============================================================
  console.log('\n[6] Insert sub_districts...')
  let subCount = 0
  for (let i = 0; i < allRecords.length; i += BATCH) {
    const batch = allRecords.slice(i, i + BATCH)
    for (const rec of batch) {
      const provId = provMap[rec.province]
      if (!provId) continue
      const distId = distMap[`${rec.amphoe}||${provId}`]
      if (!distId) continue
      await pool.query(
        'INSERT INTO th_sub_districts (name, district_id, zipcode) VALUES ($1, $2, $3) ON CONFLICT (name, district_id) DO NOTHING',
        [rec.district, distId, rec.zipcode || null]
      )
      subCount++
    }
    process.stdout.write(`\r  inserting... ${Math.min(i + BATCH, allRecords.length)}/${allRecords.length}`)
  }
  const { rows: subRows } = await pool.query('SELECT COUNT(*) FROM th_sub_districts')
  console.log(`\n  ✓ ${subRows[0].count} sub_districts`)

  // ============================================================
  // สรุป
  // ============================================================
  console.log('\n' + '='.repeat(60))
  console.log('สรุปข้อมูลในฐานข้อมูล:')
  const summary = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM th_regions) AS regions,
      (SELECT COUNT(*) FROM th_provinces) AS provinces,
      (SELECT COUNT(*) FROM th_districts) AS districts,
      (SELECT COUNT(*) FROM th_sub_districts) AS sub_districts
  `)
  const s = summary.rows[0]
  console.log(`  Regions      : ${s.regions}`)
  console.log(`  Provinces    : ${s.provinces}`)
  console.log(`  Districts    : ${s.districts}`)
  console.log(`  Sub-districts: ${s.sub_districts}`)
  console.log('='.repeat(60))

  await pool.end()
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })

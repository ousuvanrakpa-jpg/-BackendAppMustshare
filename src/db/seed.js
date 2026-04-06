const pool = require('./pool')

// Import seed data from the original in-memory store
// (bcrypt hashes are already computed inside store.js)
const { cases, agencies, users } = require('../data/store')

async function seed() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM agencies')
  if (parseInt(rows[0].count) > 0) {
    console.log('[DB] Already seeded, skipping')
    return
  }

  for (const a of agencies) {
    await pool.query(
      `INSERT INTO agencies (id, name, type_code, subtype_code, region, province, district, subdistrict, cases, logo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [a.id, a.name, a.typeCode||'', a.subtypeCode||'', a.region||'', a.province||'', a.district||'', a.subdistrict||'', a.cases||0, a.logo||'']
    )
  }

  for (const u of users) {
    await pool.query(
      `INSERT INTO users (id, name, email, password, role, status)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [u.id, u.name, u.email, u.password, u.role, u.status]
    )
  }

  for (const c of cases) {
    await pool.query(
      `INSERT INTO cases (
         id, agency_id, title, agency, category, sub_category, procurement_method,
         status, date, budget, source, last_updated, visibility, restricted_notes,
         description, agency_type, agency_role, region, province, district, sub_district,
         related_person1, related_person2, pending_delete, related_agencies,
         documents, activity_log, timeline
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
       ) ON CONFLICT (id) DO NOTHING`,
      [
        c.id, c.agencyId||null, c.title||'', c.agency||'', c.category||'', c.subCategory||'',
        c.procurementMethod||'', c.status||'', c.date||'', c.budget||'', c.source||'',
        c.lastUpdated||'', c.visibility||'Internal', c.restrictedNotes||'', c.description||'',
        c.agencyType||'', c.agencyRole||'', c.region||'', c.province||'', c.district||'',
        c.subDistrict||'', c.relatedPerson1||'', c.relatedPerson2||'',
        c.pendingDelete ? JSON.stringify(c.pendingDelete) : null,
        JSON.stringify(c.relatedAgencies||[]),
        JSON.stringify(c.documents||[]),
        JSON.stringify(c.activityLog||[]),
        JSON.stringify(c.timeline||[]),
      ]
    )
  }

  console.log(`[DB] Seeded ${agencies.length} agencies, ${users.length} users, ${cases.length} cases`)
}

module.exports = seed

require('dotenv').config()
const { Pool } = require('pg')

const host = process.env.DB_HOST || 'localhost'
const pool = new Pool({
  host,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'mustshare',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl:      host === 'localhost' ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

async function main() {
  console.log('=== Supabase Connection Health Check ===')
  console.log(`Host: ${host}:${process.env.DB_PORT}`)
  console.log(`Database: ${process.env.DB_NAME}`)
  console.log(`User: ${process.env.DB_USER}`)
  console.log(`SSL: ${host !== 'localhost' ? 'ON' : 'OFF'}`)
  console.log('')

  const ping = await pool.query('SELECT current_database() AS db, split_part(version(), \' \', 2) AS pgver')
  console.log('[1] Connect OK — DB:', ping.rows[0].db, '/ PG:', ping.rows[0].pgver)

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM cases)             AS cases,
      (SELECT COUNT(*) FROM agencies)          AS agencies,
      (SELECT COUNT(*) FROM users)             AS users,
      (SELECT COUNT(*) FROM th_provinces)      AS provinces,
      (SELECT COUNT(*) FROM th_districts)      AS districts,
      (SELECT COUNT(*) FROM th_sub_districts)  AS sub_districts,
      (SELECT COUNT(*) FROM logs)              AS logs
  `)
  console.log('[2] Row counts:', counts.rows[0])

  const col = await pool.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'cases' AND column_name = 'link_post'
  `)
  console.log('[3] link_post column:', col.rows[0] || 'NOT FOUND')

  const sample = await pool.query('SELECT id, link_post, LEFT(title, 30) AS title FROM cases ORDER BY id LIMIT 3')
  console.log('[4] Sample cases:')
  sample.rows.forEach(r => console.log(`   - ${r.id} | link_post=${JSON.stringify(r.link_post)} | ${r.title}`))

  await pool.end()
  console.log('\n=== ALL CHECKS PASSED ===')
}

main().catch(e => { console.error('FAIL:', e.code || '', e.message); process.exit(1) })

const { Pool } = require('pg')

const host = process.env.DB_HOST || 'localhost'

const pool = new Pool({
  host,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'mustshare',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl:      host === 'localhost' ? false : { rejectUnauthorized: false },
})

module.exports = pool

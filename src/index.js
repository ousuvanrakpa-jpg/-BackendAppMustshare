require('dotenv').config()
const app = require('./app')
const migrate = require('./db/migrate')
const seed = require('./db/seed')

const PORT = process.env.PORT || 3000

async function start() {
  await migrate()
  await seed()
  app.listen(PORT, () => {
    console.log(`MustshareBackend running on http://localhost:${PORT}`)
  })
}

start().catch(err => {
  console.error('Failed to start:', err)
  process.exit(1)
})

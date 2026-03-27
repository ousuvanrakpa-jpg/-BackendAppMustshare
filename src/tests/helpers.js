const request = require('supertest')
const app = require('../app')

async function getAdminToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'rakpa@hand.co.th', password: 'admin1234' })
  return res.body.token
}

async function getUserToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'torplus@hand.co.th', password: 'user1234' })
  return res.body.token
}

async function getCoordinatorToken() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'sasathorn@hand.co.th', password: 'coord1234' })
  return res.body.token
}

module.exports = { getAdminToken, getUserToken, getCoordinatorToken }

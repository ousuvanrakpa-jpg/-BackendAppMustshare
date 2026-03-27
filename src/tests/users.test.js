const request = require('supertest')
const app = require('../app')
const { resetStore } = require('../data/store')
const { getAdminToken, getUserToken } = require('./helpers')

let adminToken, userToken

beforeEach(async () => {
  resetStore()
  ;[adminToken, userToken] = await Promise.all([getAdminToken(), getUserToken()])
})

// ─── GET /api/users ────────────────────────────────────────────────────────────
describe('GET /api/users', () => {
  test('admin — ได้รายการ users ทั้งหมด', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    // password ต้องไม่ถูก expose
    res.body.forEach(u => expect(u).not.toHaveProperty('password'))
  })

  test('user ทั่วไป — ไม่มีสิทธิ์ดูรายการ users ทั้งหมด — ได้ 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(403)
  })

  test('ไม่มี token — ได้ 401', async () => {
    const res = await request(app).get('/api/users')
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/users/:id ────────────────────────────────────────────────────────
describe('GET /api/users/:id', () => {
  test('admin ดูข้อมูล user คนอื่นได้', async () => {
    const res = await request(app)
      .get('/api/users/USR-001')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('USR-001')
    expect(res.body).not.toHaveProperty('password')
  })

  test('user ดูข้อมูลตัวเองได้', async () => {
    // torplus@hand.co.th คือ USR-001
    const res = await request(app)
      .get('/api/users/USR-001')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('USR-001')
  })

  test('user ดูข้อมูลคนอื่นไม่ได้ — ได้ 403', async () => {
    const res = await request(app)
      .get('/api/users/USR-006')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(403)
  })
})

// ─── POST /api/users ───────────────────────────────────────────────────────────
describe('POST /api/users', () => {
  const newUser = {
    name: 'ผู้ใช้ทดสอบ',
    email: 'test@hand.co.th',
    password: 'test1234',
    role: 'user',
    status: 'Active',
  }

  test('admin สร้าง user ใหม่ — ได้ 201 และ ID ใหม่', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newUser)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.email).toBe(newUser.email)
    expect(res.body).not.toHaveProperty('password')
  })

  test('สร้าง user ด้วย email ซ้ำ — ได้ 409', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newUser, email: 'rakpa@hand.co.th' }) // email ที่มีอยู่แล้ว

    expect(res.status).toBe(409)
  })

  test('สร้าง user โดยไม่มี password — ได้ 400', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ทดสอบ', email: 'nopass@hand.co.th' })

    expect(res.status).toBe(400)
  })

  test('user ทั่วไปสร้าง user ใหม่ไม่ได้ — ได้ 403', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send(newUser)

    expect(res.status).toBe(403)
  })
})

// ─── PUT /api/users/:id ────────────────────────────────────────────────────────
describe('PUT /api/users/:id', () => {
  test('admin เปลี่ยน role user — อัปเดตถูกต้อง', async () => {
    const res = await request(app)
      .put('/api/users/USR-001')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'coordinator' })

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('coordinator')
    expect(res.body).not.toHaveProperty('password')
  })

  test('admin เปลี่ยน status เป็น Inactive', async () => {
    const res = await request(app)
      .put('/api/users/USR-001')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Inactive' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Inactive')
  })

  test('user ทั่วไปแก้ไข user ไม่ได้ — ได้ 403', async () => {
    const res = await request(app)
      .put('/api/users/USR-001')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role: 'admin' })

    expect(res.status).toBe(403)
  })
})

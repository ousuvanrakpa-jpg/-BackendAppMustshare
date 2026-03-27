const request = require('supertest')
const app = require('../app')
const { resetStore } = require('../data/store')
const { getAdminToken, getUserToken } = require('./helpers')

let adminToken, userToken

beforeEach(async () => {
  resetStore()
  ;[adminToken, userToken] = await Promise.all([getAdminToken(), getUserToken()])
})

// ─── GET /api/agencies ─────────────────────────────────────────────────────────
describe('GET /api/agencies', () => {
  test('ไม่มี token — ได้ 401', async () => {
    const res = await request(app).get('/api/agencies')
    expect(res.status).toBe(401)
  })

  test('ดึงรายการ agencies — มีข้อมูล', async () => {
    const res = await request(app)
      .get('/api/agencies')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  test('แต่ละ agency มี field ที่จำเป็น', async () => {
    const res = await request(app)
      .get('/api/agencies')
      .set('Authorization', `Bearer ${adminToken}`)

    const ag = res.body.data[0]
    expect(ag).toHaveProperty('id')
    expect(ag).toHaveProperty('name')
    expect(ag).toHaveProperty('typeCode')
  })
})

// ─── GET /api/agencies/:id ─────────────────────────────────────────────────────
describe('GET /api/agencies/:id', () => {
  test('ดึง agency ที่มีอยู่ — ได้ข้อมูลถูกต้อง', async () => {
    const res = await request(app)
      .get('/api/agencies/AG-0001')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('AG-0001')
  })

  test('ดึง agency ที่ไม่มี — ได้ 404', async () => {
    const res = await request(app)
      .get('/api/agencies/AG-9999')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

// ─── POST /api/agencies ────────────────────────────────────────────────────────
describe('POST /api/agencies', () => {
  const newAgency = {
    name: 'หน่วยงานทดสอบ',
    typeCode: 'CENTRAL',
    subtypeCode: 'DEPARTMENT',
    region: 'ภาคกลาง',
    province: 'กรุงเทพมหานคร',
    district: 'พระนคร',
    subdistrict: 'พระบรมมหาราชวัง',
  }

  test('admin สร้าง agency ใหม่ — ได้ 201 และ ID ใหม่', async () => {
    const res = await request(app)
      .post('/api/agencies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newAgency)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.id).toMatch(/^AG-\d{4}$/)
    expect(res.body.name).toBe(newAgency.name)
  })

  test('user ทั่วไปสร้าง agency ไม่ได้ — ได้ 403', async () => {
    const res = await request(app)
      .post('/api/agencies')
      .set('Authorization', `Bearer ${userToken}`)
      .send(newAgency)

    expect(res.status).toBe(403)
  })
})

// ─── PUT /api/agencies/:id ─────────────────────────────────────────────────────
describe('PUT /api/agencies/:id', () => {
  test('admin แก้ไข agency — ข้อมูลอัปเดตถูกต้อง', async () => {
    const res = await request(app)
      .put('/api/agencies/AG-0001')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ชื่อใหม่' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('ชื่อใหม่')
    expect(res.body.id).toBe('AG-0001')
  })
})

const request = require('supertest')
const app = require('../app')
const { resetStore } = require('../data/store')
const { getAdminToken, getUserToken, getCoordinatorToken } = require('./helpers')

let adminToken, userToken, coordToken

beforeEach(async () => {
  resetStore()
  ;[adminToken, userToken, coordToken] = await Promise.all([
    getAdminToken(),
    getUserToken(),
    getCoordinatorToken(),
  ])
})

// ─── GET /api/cases ────────────────────────────────────────────────────────────
describe('GET /api/cases', () => {
  test('ไม่มี token — ได้ 401', async () => {
    const res = await request(app).get('/api/cases')
    expect(res.status).toBe(401)
  })

  test('admin — ได้รายการ cases ทั้งหมด', async () => {
    const res = await request(app)
      .get('/api/cases')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body).toHaveProperty('total')
  })

  test('user ทั่วไป — เห็นเฉพาะ Internal cases', async () => {
    const res = await request(app)
      .get('/api/cases')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(200)
    const restricted = res.body.data.filter(c => c.visibility === 'Restricted')
    expect(restricted.length).toBe(0)
  })

  test('filter ด้วย status — ได้เฉพาะ cases ที่ตรงกัน', async () => {
    const res = await request(app)
      .get('/api/cases?status=รับเรื่อง')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    res.body.data.forEach(c => expect(c.status).toBe('รับเรื่อง'))
  })

  test('search — ค้นหาด้วยชื่อ title ได้ผลลัพธ์', async () => {
    const res = await request(app)
      .get('/api/cases?search=ถนน')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    res.body.data.forEach(c =>
      expect(
        c.title.includes('ถนน') || c.id.includes('ถนน') || c.agency.includes('ถนน')
      ).toBe(true)
    )
  })
})

// ─── GET /api/cases/:id ────────────────────────────────────────────────────────
describe('GET /api/cases/:id', () => {
  test('ดึง case ที่มีอยู่ — ได้ข้อมูลถูกต้อง', async () => {
    const res = await request(app)
      .get('/api/cases/CA-0001')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('CA-0001')
    expect(res.body).toHaveProperty('title')
  })

  test('ดึง case ที่ไม่มี — ได้ 404', async () => {
    const res = await request(app)
      .get('/api/cases/CA-9999')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

// ─── POST /api/cases ───────────────────────────────────────────────────────────
describe('POST /api/cases', () => {
  const newCase = {
    title: 'เทสต์เคสใหม่',
    agency: 'หน่วยงานทดสอบ',
    category: 'จัดซื้อจัดจ้าง',
    status: 'รับเรื่อง',
    date: '2026-01-01',
    visibility: 'Internal',
  }

  test('admin สร้าง case ใหม่ — ได้ 201 และ ID ใหม่', async () => {
    const res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newCase)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.id).toMatch(/^CA-\d{4}$/)
    expect(res.body.title).toBe(newCase.title)
  })

  test('coordinator สร้าง case ได้', async () => {
    const res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${coordToken}`)
      .send(newCase)

    expect(res.status).toBe(201)
  })

  test('ID ไม่ซ้ำกัน — สร้างต่อเนื่องสองครั้ง', async () => {
    const [res1, res2] = await Promise.all([
      request(app).post('/api/cases').set('Authorization', `Bearer ${adminToken}`).send(newCase),
      request(app).post('/api/cases').set('Authorization', `Bearer ${adminToken}`).send({ ...newCase, title: 'เทสต์เคสที่สอง' }),
    ])

    expect(res1.status).toBe(201)
    expect(res2.status).toBe(201)
    expect(res1.body.id).not.toBe(res2.body.id)
  })

  test('ไม่มี token — ได้ 401', async () => {
    const res = await request(app).post('/api/cases').send(newCase)
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/cases/:id ────────────────────────────────────────────────────────
describe('PUT /api/cases/:id', () => {
  test('admin แก้ไข case — ข้อมูลอัปเดตถูกต้อง', async () => {
    const res = await request(app)
      .put('/api/cases/CA-0001')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'ชื่อใหม่', status: 'ปิดเรื่อง' })

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('ชื่อใหม่')
    expect(res.body.status).toBe('ปิดเรื่อง')
    expect(res.body.id).toBe('CA-0001')
  })

  test('แก้ไข case ที่ไม่มี — ได้ 404', async () => {
    const res = await request(app)
      .put('/api/cases/CA-9999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'ไม่มีเคสนี้' })

    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/cases/:id ─────────────────────────────────────────────────────
describe('DELETE /api/cases/:id', () => {
  test('admin ลบ case — case หายไปจากรายการ', async () => {
    const del = await request(app)
      .delete('/api/cases/CA-0001')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(del.status).toBe(200)

    const check = await request(app)
      .get('/api/cases/CA-0001')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(check.status).toBe(404)
  })

  test('user ทั่วไปลบไม่ได้ — ได้ 403', async () => {
    const res = await request(app)
      .delete('/api/cases/CA-0001')
      .set('Authorization', `Bearer ${userToken}`)

    expect(res.status).toBe(403)
  })
})

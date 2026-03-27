const request = require('supertest')
const app = require('../app')
const { resetStore } = require('../data/store')

beforeEach(() => resetStore())

describe('POST /api/auth/login', () => {
  test('login สำเร็จ — ได้รับ token กลับมา', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rakpa@hand.co.th', password: 'admin1234' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(typeof res.body.token).toBe('string')
  })

  test('login สำเร็จ — token มี payload role = admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rakpa@hand.co.th', password: 'admin1234' })

    const payload = JSON.parse(
      Buffer.from(res.body.token.split('.')[1], 'base64').toString('utf8')
    )
    expect(payload.role).toBe('admin')
    expect(payload.name).toBeTruthy()
  })

  test('login สำเร็จ — coordinator ได้ role ถูกต้อง', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sasathorn@hand.co.th', password: 'coord1234' })

    expect(res.status).toBe(200)
    const payload = JSON.parse(
      Buffer.from(res.body.token.split('.')[1], 'base64').toString('utf8')
    )
    expect(payload.role).toBe('coordinator')
  })

  test('รหัสผ่านผิด — ได้ 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rakpa@hand.co.th', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  test('email ไม่มีในระบบ — ได้ 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'anything' })

    expect(res.status).toBe(401)
  })

  test('ไม่ส่ง body — ได้ 401 หรือ 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})

    expect([400, 401]).toContain(res.status)
  })
})

describe('GET /api/health', () => {
  test('health check — status ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

import request from 'supertest'
import app from '../../src/app.js'
import { pool } from '../../src/utils/dbConnection.js'
import { createHash } from '../../src/utils/index.js'

describe('Users API', () => {
  const adminUser = {
    full_name: 'Admin Test',
    email: 'admin.test@example.com',
    password: '123456',
    role_id: 1
  }

  let authCookie

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ?', [adminUser.email])

    const hashedPassword = await createHash(adminUser.password)

    await pool.query(
      'INSERT INTO users (full_name, email, password, role_id) VALUES (?, ?, ?, ?)',
      [adminUser.full_name, adminUser.email, hashedPassword, adminUser.role_id]
    )

    const loginRes = await request(app)
      .post('/api/sessions/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      })

    authCookie = loginRes.headers['set-cookie']
  })

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ?', [adminUser.email])
    await pool.end()
  })

  describe('GET /api/users', () => {
    test('debería bloquear el acceso si no hay autenticación', async () => {
      const res = await request(app).get('/api/users')

      expect([401, 403]).toContain(res.statusCode)
    })

    test('debería permitir acceso con admin autenticado', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Cookie', authCookie)

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('status', 'success')
      expect(res.body).toHaveProperty('payload')
      expect(Array.isArray(res.body.payload)).toBe(true)
    })
  })

  describe('GET /api/users/:uid', () => {
    test('debería bloquear el acceso si no hay autenticación', async () => {
      const res = await request(app).get('/api/users/1')

      expect([401, 403]).toContain(res.statusCode)
    })
  })

  describe('PUT /api/users/:uid', () => {
    test('debería bloquear el acceso si no hay autenticación', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .send({ full_name: 'Cambio Test' })

      expect([401, 403]).toContain(res.statusCode)
    })
  })
})
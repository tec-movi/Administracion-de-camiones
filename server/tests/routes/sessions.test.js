import request from 'supertest'
import app from '../../src/app.js'
import { pool } from '../../src/utils/dbConnection.js'
import { createHash } from '../../src/utils/index.js'

describe('Sessions API', () => {
  const testUser = {
    full_name: 'Usuario Test',
    email: 'testlogin@example.com',
    password: '123456',
    role_id: 3
  }

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ?', [testUser.email])

    const hashedPassword = await createHash(testUser.password)

    await pool.query(
      'INSERT INTO users (full_name, email, password, role_id) VALUES (?, ?, ?, ?)',
      [testUser.full_name, testUser.email, hashedPassword, testUser.role_id]
    )
  })

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = ?', [testUser.email])
    await pool.end()
  })

  describe('POST /api/sessions/login', () => {
    test('debería fallar si no se envían email y password', async () => {
      const res = await request(app)
        .post('/api/sessions/login')
        .send({})

      expect(res.statusCode).toBe(400)
      expect(res.body).toHaveProperty('status', 'error')
    })

    test('debería devolver 404 si el email no existe', async () => {
      const res = await request(app)
        .post('/api/sessions/login')
        .send({
          email: 'noexiste@test.com',
          password: '123456'
        })

      expect(res.statusCode).toBe(404)
      expect(res.body).toHaveProperty('status', 'error')
    })

    test('debería iniciar sesión correctamente con credenciales válidas', async () => {
      const res = await request(app)
        .post('/api/sessions/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('status', 'success')
      expect(res.body).toHaveProperty('message', 'Logged in')
      expect(res.body).toHaveProperty('payload')
      expect(res.headers['set-cookie']).toBeDefined()
    })
  })
})
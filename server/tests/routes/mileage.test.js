import request from 'supertest'
import app from '../../src/app.js'
import { pool } from '../../src/utils/dbConnection.js'
import { createHash } from '../../src/utils/index.js'

describe('Mileage API', () => {
  const adminUser = {
    full_name: 'Admin Mileage Test',
    email: 'admin.mileage@example.com',
    password: '123456',
    role_id: 1
  }

  const driverUser = {
    full_name: 'Driver Mileage Test',
    email: 'driver.mileage@example.com',
    password: '123456',
    role_id: 3
  }

  let adminCookie
  let driverCookie

  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE email IN (?, ?)', [
      adminUser.email,
      driverUser.email
    ])

    const adminHashedPassword = await createHash(adminUser.password)
    const driverHashedPassword = await createHash(driverUser.password)

    await pool.query(
      'INSERT INTO users (full_name, email, password, role_id) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
      [
        adminUser.full_name,
        adminUser.email,
        adminHashedPassword,
        adminUser.role_id,
        driverUser.full_name,
        driverUser.email,
        driverHashedPassword,
        driverUser.role_id
      ]
    )

    const adminLogin = await request(app)
      .post('/api/sessions/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      })

    adminCookie = adminLogin.headers['set-cookie']

    const driverLogin = await request(app)
      .post('/api/sessions/login')
      .send({
        email: driverUser.email,
        password: driverUser.password
      })

    driverCookie = driverLogin.headers['set-cookie']
  })

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email IN (?, ?)', [
      adminUser.email,
      driverUser.email
    ])
    await pool.end()
  })

  describe('GET /api/mileageLogs', () => {
    test('debería bloquear el acceso si no hay autenticación', async () => {
      const res = await request(app).get('/api/mileageLogs')

      expect([401, 403]).toContain(res.statusCode)
    })

    test('debería permitir listar registros con admin autenticado', async () => {
      const res = await request(app)
        .get('/api/mileageLogs')
        .set('Cookie', adminCookie)

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('payload')
    })
  })

  describe('POST /api/mileageLogs/save', () => {
    test('debería bloquear el acceso si no hay autenticación', async () => {
      const res = await request(app)
        .post('/api/mileageLogs/save')
        .send({
          mileage_value: 100
        })

      expect([401, 403]).toContain(res.statusCode)
    })

    test('debería bloquear el acceso si el rol no tiene permiso', async () => {
      const res = await request(app)
        .post('/api/mileageLogs/save')
        .set('Cookie', adminCookie)
        .send({
          mileage_value: 100
        })

      expect(res.statusCode).toBe(403)
    })

    test('debería validar kilometraje inválido con driver autenticado', async () => {
      const res = await request(app)
        .post('/api/mileageLogs/save')
        .set('Cookie', driverCookie)
        .send({
          mileage_value: 0
        })

      expect(res.statusCode).toBe(400)
      expect(res.body).toHaveProperty('message', 'Kilometraje inválido')
    })
  })
})
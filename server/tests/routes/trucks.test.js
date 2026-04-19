import request from 'supertest'
import app from '../../src/app.js'
import { pool } from '../../src/utils/dbConnection.js'
import { createHash } from '../../src/utils/index.js'

describe('Trucks API', () => {
  const adminUser = {
    full_name: 'Admin Truck Test',
    email: 'admin.truck@example.com',
    password: '123456',
    role_id: 1
  }

  const driverUser = {
    full_name: 'Driver Truck Test',
    email: 'driver.truck@example.com',
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

  describe('GET /api/trucks', () => {
    test('debería listar camiones correctamente', async () => {
      const res = await request(app).get('/api/trucks')

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('status', 'success')
      expect(res.body).toHaveProperty('payload')
      expect(Array.isArray(res.body.payload)).toBe(true)
    })
  })

  describe('POST /api/trucks', () => {
    test('debería bloquear la creación si no hay autenticación', async () => {
      const res = await request(app)
        .post('/api/trucks')
        .send({
          plate_number: 'TT-9999',
          brand: 'Volvo',
          model: 'FH',
          year: 2020
        })

      expect([401, 403]).toContain(res.statusCode)
    })

    test('debería crear un camión con admin autenticado', async () => {
      const plate = `TEST-${Date.now()}`

      const res = await request(app)
        .post('/api/trucks')
        .set('Cookie', adminCookie)
        .send({
          plate_number: plate,
          brand: 'Scania',
          model: 'R450',
          year: 2022
        })

      expect(res.statusCode).toBe(200)
      expect(res.body).toHaveProperty('status', 'success')
      expect(res.body).toHaveProperty('message', 'Camión creado')
      expect(res.body).toHaveProperty('result_id')

      await pool.query('DELETE FROM trucks WHERE plate_number = ?', [plate])
    })
  })

  describe('GET /api/trucks/my-truck', () => {
    test('debería bloquear el acceso si no hay autenticación', async () => {
      const res = await request(app).get('/api/trucks/my-truck')

      expect([401, 403]).toContain(res.statusCode)
    })

    test('debería devolver 404 si el driver no tiene camión asignado', async () => {
      const res = await request(app)
        .get('/api/trucks/my-truck')
        .set('Cookie', driverCookie)

      expect(res.statusCode).toBe(404)
      expect(res.body).toHaveProperty('status', 'error')
    })
  })
})
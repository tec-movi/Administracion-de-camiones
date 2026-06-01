import request from 'supertest'
import app from '../src/app.js'

describe('Base API', () => {
  test('GET / debería responder 200', async () => {
    const res = await request(app).get('/')

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('msg')
    expect(res.body.msg).toBe("API de kilometraje funcionando")
  })
})

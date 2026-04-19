import { jest } from '@jest/globals'
import { authorize } from '../../src/middlewares/auth.js'

describe('Auth Middleware', () => {

  const mockReq = () => ({
    session: { user: null }
  })

  const mockRes = () => {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.send = jest.fn()
    return res
  }

  const next = jest.fn()

  test('debería devolver 401 si no hay usuario en sesión', () => {
    const req = mockReq()
    const res = mockRes()

    authorize(['admin'])(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('debería devolver 403 si el rol no está autorizado', () => {
    const req = mockReq()
    const res = mockRes()

    req.session.user = { role: 'driver' }

    authorize(['admin'])(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  test('debería permitir el acceso si el rol está autorizado', () => {
    const req = mockReq()
    const res = mockRes()

    req.session.user = { role: 'admin' }

    authorize(['admin'])(req, res, next)

    expect(next).toHaveBeenCalled()
  })

})
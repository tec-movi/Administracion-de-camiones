import pool from '../utils/dbConnection.js'
import UserModel from './models/user.model.js'

export default class Users {
  constructor() {
    this.table = UserModel.table
  }

  get = async () => {
    const query = `SELECT * FROM ${this.table}`
    const [result] = await pool.execute(query)
    return result
  }

  getBy = async (params) => {
    const key = Object.keys(params)[0]
    const value = Object.values(params)[0]

    const query = `SELECT * FROM ${this.table} WHERE ${key} = ? LIMIT 1`
    const [result] = await pool.execute(query, [value])
    return result[0]
  }

  getRoleByUserEmail = async (email) => {
    const query = 
    `SELECT
      u.id,
      u.full_name,
      u.email,
      u.password,
      r.name AS role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.email = ?`
    const [result] = await pool.execute(query, [email])
    return result[0]
  }

  save = async (doc) => {
    const { full_name, email, password } = doc
    if(email === 'super.admin@test.test') {
      const role_id = 2
      const query = `INSERT INTO ${this.table} (full_name, email, password, role_id) VALUES (?, ?, ?, ?)`
    const [result] = await pool.execute(query, [full_name, email, password, role_id])
    return result
    }
    const query = `INSERT INTO ${this.table} (full_name, email, password) VALUES (?, ?, ?)`
    const [result] = await pool.execute(query, [full_name, email, password])
    return result
  }

  update = async (id, doc) => {
    // se descompone el objeto que viene en el argumento doc y se extraen las llaves, si el objeto viene vacio se establece como null para evitar que se caiga la app por intentar iterar un objeto vacío.
    const fields = Object.keys(doc)
    if(fields.length === 0) return null

    const setQuery = fields.map(key => `${key} = ?`).join(', ')

    const values = Object.values(doc)

    values.push(id)
    const query = `UPDATE ${this.table} SET ${setQuery} WHERE id = ?`
    const [result] = await pool.execute(query, values)
    return result
  }

  /**
   * TODO:
   * Esta operación debe adaptarse para retirar el conductor de esta tabla y llevarlo a otra tabla para hacer una eliminación lógica en vez de una definitiva.
   * @param {*} id 
   */
  delete = async (id) => {

  }
}

import pool from "../../utils/dbConnection.js";

export default class Software {
  constructor() {
    this.table = 'software'
  }

  get = async () => {
    const query = `SELECT * FROM ${this.table}`
    const [result] = await pool.execute(query)
    return result
  }

  getBy = async (params) => {
    const key = Object.keys(params)[0]
    const value = params[key]
    const query = `SELECT * FROM ${this.table} WHERE ${key} = ?`
    const [result] = await pool.execute(query, [value])
    return result[0]
  }

  getById = async (id) => {
    const query = `SELECT * FROM ${this.table} WHERE id = ?`
    const [result] = await pool.execute(query, [id])
    return result
  }

  save = async (data) => {
    const { name, version, license_type } = data
    const query = `
    INSERT INTO ${this.table} (name, version, license_type)
    VALUES (?, ?, ?)`
    const [result] = await pool.execute(query,[name, version, license_type || null])
    return result
  }

  update = async (id, doc) => {
    const fields = Object.keys(doc).map(key => `${key} = ?`).join(', ')
    const values = Object.values(doc)
    const query = `UPDATE ${this.table} SET ${fields} WHERE id = ?`
    const [result] = await pool.execute(query, [...values, id])
    return result
  }
}

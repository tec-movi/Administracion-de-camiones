import pool from "../../utils/dbConnection.js";

export default class Equipment {
  constructor() {
    this.table = 'it_equipment'
  }

  get = async () => {
    const query = `SELECT * FROM ${this.table}`
    const [result] = await pool.execute(query)
    return result
  }

  getBy = async (params) => {
    const key = Object.keys(params)[0]
    const value = params[key]
    const [result] = await pool.execute(`SELECT * FROM ${this.table} WHERE ${key} = ?`, [value])
    return result[0]
  }

  save = async (doc) => {
    const {
      inventory_code,
      type,
      brand,
      model,
      serial_number,
      status,
      location
    } = doc

    const query = `
    INSERT INTO ${this.table}
    (inventory_code, type, brand, model, serial_number, status, location)
    VALUES (?, ?, ?, ?, ? ,? ,?)`
    const [result] = await pool.execute(query, [inventory_code, type, brand, model, serial_number, status || 'operativo', location])
    return result
  }

  update = async (id, doc) => {
    const fields = Object.keys(doc).map(key => `${key} = ?`).join(', ')
    const values = Object.values(doc)
    const [result] = await pool.execute(
      `UPDATE ${this.table} SET ${fields} WHERE id =?`,
      [...values, id]
    )
    return result
  }

  //delete lógico por implementar según necesidad de la empresa
}
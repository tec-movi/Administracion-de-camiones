import pool from "../../utils/dbConnection.js";

export default class PartsInventory {
  constructor() {
    this.table = 'it_parts_inventory'
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

  save = async (doc) => {
    // se define la estructura que debe tener el articulo a guardar
    const {
      part_name,
      description,
      stock_quantity,
      min_stock,
      unit_price
    } = doc
    const query = `
    INSERT INTO ${this.table} (part_name, description, stock_quantity, min_stock, unit_price)
    VALUES (?, ?, ?, ?, ?)`

    // se ejecuta la solicitud con los datos otorgados y los campos opcionales
    const [result] = await pool.execute(query, [
      part_name,
      description || null,
      stock_quantity || 1,
      min_stock || 0,
      unit_price || 0
    ])
    // se retorna el resultado de la operación
    return result
  }

  update = async (id, doc) => {
    const fields = Object.keys(doc).map(key => `${key} = ?`).join(', ')
    const values = Object.values(doc)
    const [result] = await pool.execute(
      `UPDATE ${this.table} SET ${fields} WHERE id = ?`,
      [...values, id]
    )
    return result
  }

  delete = async (id) => {
    const query = `DELETE FROM ${this.table} WHERE id = ?`
    const [result] = await pool.execute(query, [id])
    return result
  }
}

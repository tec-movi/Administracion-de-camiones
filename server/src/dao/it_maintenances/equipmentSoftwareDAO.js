import pool from '../../utils/dbConnection.js'

export default class EquipmentSoftware {
  constructor() {
    this.table = 'it_equipment_software'
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

  getByEquipment = async (equipmentId) => {
    const query = `SELECT * FROM ${this.table} WHERE equipment_id = ?`
    const [result] = await pool.execute(query, [equipmentId])
    return result
  }

  save = async (doc) => {
    const {
      equipment_id,
      software_id,
      registered_by,
      install_date,
      notes
    } = doc

    const query = `
    INSERT INTO ${this.table} (equipment_id, software_id, registered_by, install_date, notes)
    VALUES (?, ?, ?, ?, ?)`

    const [result] = await pool.execute(query, [equipment_id, software_id, registered_by, install_date, notes || null])
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

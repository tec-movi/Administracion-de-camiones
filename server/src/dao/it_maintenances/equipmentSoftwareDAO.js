import pool from '../../utils/dbConnection.js'

export default class EquipmentSoftware {
  constructor() {
    this.table = 'it_equipment_software'
  }

  get = async () => {
    const query = `
      SELECT
        ies.id,
        ies.equipment_id,
        ies.software_id,
        ies.registered_by,
        ies.install_date  AS installation_date,
        ies.notes         AS note,
        s.name            AS software_name,
        s.version         AS software_version,
        s.license_type
      FROM ${this.table} ies
      LEFT JOIN software s ON ies.software_id = s.id
      ORDER BY ies.install_date DESC
    `
    const [result] = await pool.execute(query)
    return result
  }

  // getBy sigue siendo útil para búsquedas simples internas
  getBy = async (params) => {
    const key = Object.keys(params)[0]
    const value = params[key]
    const query = `SELECT * FROM ${this.table} WHERE ${key} = ?`
    const [result] = await pool.execute(query, [value])
    return result[0]
  }

  // Detalle completo de una instalación (para el modal "Ver detalles")
  getDetailById = async (id) => {
    const query = `
      SELECT
        ies.id,
        ies.equipment_id,
        ies.install_date    AS installation_date,
        ies.notes           AS note,
        s.name              AS software_name,
        s.version           AS software_version,
        s.license_type,
        s.expiration_date,
        e.inventory_code,
        e.model             AS equipment_model,
        e.type              AS equipment_type,
        e.serial_number,
        e.location
      FROM ${this.table} ies
      LEFT JOIN software s  ON ies.software_id  = s.id
      LEFT JOIN it_equipment e ON ies.equipment_id = e.id
      WHERE ies.id = ?
    `
    const [result] = await pool.execute(query, [id])
    return result  // devuelve array para que el controller pueda usar payload[0]
  }

  getByEquipment = async (equipmentId) => {
    const query = `SELECT * FROM ${this.table} WHERE equipment_id = ?`
    const [result] = await pool.execute(query, [equipmentId])
    return result
  }

  save = async (doc) => {
    const { equipment_id, software_id, registered_by, install_date, notes } = doc
    const query = `
      INSERT INTO ${this.table} (equipment_id, software_id, registered_by, install_date, notes)
      VALUES (?, ?, ?, ?, ?)`
    const [result] = await pool.execute(query, [
      equipment_id, software_id, registered_by, install_date, notes || null
    ])
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
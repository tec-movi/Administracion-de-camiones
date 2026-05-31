import pool from '../utils/dbConnection.js'

export default class MaintenanceLogs {
  constructor() {
    this.table = 'maintenance_logs'
  }

  create = async (data) => {
    const query = `INSERT INTO ${this.table} (maintenance_id, notes) VALUES (?, ?)`
    const [result] = await pool.execute(query, [data.maintenance_id, data.notes || null])
    return result
  }

  // Obtiene el último log de mantenimiento para un camión (usa la tabla maintenances)
  getLastByTruck = async (truck_id) => {
    const query = `
      SELECT ml.id AS log_id, ml.notes, ml.created_at AS log_created_at,
             m.id AS maintenance_id, m.maintenance_mileage, m.created_at AS maintenance_created_at
      FROM maintenance_logs ml
      JOIN maintenances m ON ml.maintenance_id = m.id
      WHERE m.truck_id = ?
      ORDER BY ml.created_at DESC
      LIMIT 1
    `
    const [rows] = await pool.execute(query, [truck_id])
    return rows.length > 0 ? rows[0] : null
  }
}

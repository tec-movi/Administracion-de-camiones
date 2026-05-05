import pool from '../utils/dbConnection.js'

export default class Maintenance {
  constructor() {
    this.table = 'maintenances'
  }

  create = async (data) => {
    const query = `INSERT INTO ${this.table}
    (truck_id, maintenance_mileage, type, scheduled_date, description)
    VALUES (?, ?, ?, ?, ?)`
    const [result] = await pool.execute(query, [data.truck_id, data.maintenance_mileage, data.type, data.scheduled_date, data.description])
    return result
  }

  getAll = async () => {
    const query = `
      SELECT m.*, t.plate_number, t.brand, t.model, t.status AS truck_status, t.last_maintenance_mileage
      FROM ${this.table} m
      JOIN trucks t ON m.truck_id = t.id
      ORDER BY m.created_at DESC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  update = async (id, data) => {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      const maintenanceMileage = Number(data.maintenance_mileage)

      const query = `UPDATE ${this.table} 
      SET truck_id=?, type=?, scheduled_date=?, description=?, maintenance_mileage=?, status=?
      WHERE id=?`;
      const [result] = await connection.query(query, [
        data.truck_id, data.type, data.scheduled_date, data.description, data.maintenance_mileage, data.status, id
      ]);

      // DESBLOQUEO: Si el administrador marca como 'completado'
      // el reset se persiste en trucks para reiniciar el ciclo preventivo.
      if(data.status === 'completado') {
        if (!Number.isFinite(maintenanceMileage) || maintenanceMileage < 0) {
          throw new Error('maintenance_mileage es requerido y debe ser un numero valido para completar el mantenimiento')
        }

        const [activeAssignment] = await connection.query(
          `SELECT id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`, 
          [data.truck_id]
        )
        const nextStatus = activeAssignment.length > 0 ? 'en uso' : 'disponible'

        await connection.query(
          `UPDATE trucks SET last_maintenance_mileage = ?, status = ? WHERE id = ?`, 
          [maintenanceMileage, nextStatus, data.truck_id]
        )
      }

      await connection.commit()
      return result;
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  delete = async (id) => {
    const query = `DELETE FROM ${this.table} WHERE id=?`;
    const [result] = await pool.execute(query, [id]);
    return result;
  }
  
  startMaintenance = async (id) => {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      
      const [rows] = await connection.query(`SELECT truck_id FROM ${this.table} WHERE id = ?`, [id])
      
      if (rows.length > 0) {
        // 1. Marcar mantenimiento como 'en curso'
        await connection.query(`UPDATE ${this.table} SET status = 'en curso', start_date = NOW() WHERE id = ?`, [id])
        // 2. Bloquear el camión para el conductor
        await connection.query(`UPDATE trucks SET status = 'en mantenimiento' WHERE id = ?`, [rows[0].truck_id])
      }

      await connection.commit()
      return { success: true }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  getTruckById = async (truck_id) => {
    const query = `SELECT * FROM ${this.table} WHERE truck_id = ? ORDER BY created_at DESC`
    const [rows] = await pool.execute(query, [truck_id])
    return rows
  }

  completeMaintenance = async (id, truck_id, completion_mileage) => {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      const completionMileage = Number(completion_mileage)
      if (!Number.isFinite(completionMileage) || completionMileage < 0) {
        throw new Error('completion_mileage es requerido y debe ser un numero valido')
      }

      await connection.query(`UPDATE ${this.table} SET status = 'completado', end_date = NOW() WHERE id = ?`, [id])

      const [activeAssignment] = await connection.query(
        `SELECT id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`, 
        [truck_id]
      )
      const nextStatus = activeAssignment.length > 0 ? 'en uso' : 'disponible'

      await connection.query(
        `UPDATE trucks SET last_maintenance_mileage = ?, status = ? WHERE id = ?`, 
        [completionMileage, nextStatus, truck_id]
      )

      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
}
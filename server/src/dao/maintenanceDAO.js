import pool from '../utils/dbConnection.js'

export default class Maintenance {
  constructor() {
    this.table = 'maintenances'
  }

  create = async (data) => {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      const status = data.status || 'programado'
      const query = `INSERT INTO ${this.table}
      (truck_id, maintenance_mileage, type, scheduled_date, description, status)
      VALUES (?, ?, ?, ?, ?, ?)`
      const [result] = await connection.query(query, [
        data.truck_id, data.maintenance_mileage, data.type,
        data.scheduled_date, data.description, status
      ])

      if (status === 'en curso') {
        await connection.query(
          `UPDATE trucks SET status = 'en mantenimiento' WHERE id = ?`,
          [data.truck_id]
        )
      } else if (status === 'completado') {
        const [activeAssignment] = await connection.query(
          `SELECT id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`,
          [data.truck_id]
        )
        const nextStatus = activeAssignment.length > 0 ? 'en uso' : 'disponible'
        await connection.query(
          `UPDATE trucks SET last_maintenance_mileage = ?, status = ? WHERE id = ?`,
          [data.maintenance_mileage || 0, nextStatus, data.truck_id]
        )
      } else if (status === 'programado') {
        // Notificar al conductor activo si existe
        const [drivers] = await connection.query(
          `SELECT user_id FROM truck_driver WHERE truck_id = ? AND active = true`,
          [data.truck_id]
        )
        if (drivers.length > 0) {
          const formattedDate = data.scheduled_date ? new Date(data.scheduled_date).toLocaleDateString() : 'pronto'
          await connection.query(
            `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
               drivers[0].user_id,
               'Mantenimiento Programado',
               `Se ha programado un mantenimiento para tu camión (${data.type}) para la fecha: ${formattedDate}. Por favor asiste al taller.`,
               'system',
               result.insertId,
               'maintenance'
            ]
          )
        }
      }

      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  getAll = async () => {
    const query = `
      SELECT
        m.*,
        t.plate_number,
        t.brand,
        t.model,
        t.status          AS truck_status,
        t.last_maintenance_mileage
      FROM ${this.table} m
      JOIN trucks t ON m.truck_id = t.id
      ORDER BY m.created_at DESC
    `
    const [rows] = await pool.execute(query)
    return rows
  }

  update = async (id, data) => {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      const query = `UPDATE ${this.table}
      SET truck_id=?, type=?, scheduled_date=?, description=?, maintenance_mileage=?, status=?
      WHERE id=?`
      const [result] = await connection.query(query, [
        data.truck_id, data.type, data.scheduled_date,
        data.description, data.maintenance_mileage, data.status, id
      ])

      if (data.status === 'completado') {
        const [activeAssignment] = await connection.query(
          `SELECT id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`,
          [data.truck_id]
        )
        const nextStatus = activeAssignment.length > 0 ? 'en uso' : 'disponible'
        await connection.query(
          `UPDATE trucks SET last_maintenance_mileage = ?, status = ? WHERE id = ?`,
          [data.maintenance_mileage || 0, nextStatus, data.truck_id]
        )
      } else if (data.status === 'en curso') {
        await connection.query(
          `UPDATE trucks SET status = 'en mantenimiento' WHERE id = ?`,
          [data.truck_id]
        )
      } else if (data.status === 'programado') {
        // Notificar al conductor activo si existe
        const [drivers] = await connection.query(
          `SELECT user_id FROM truck_driver WHERE truck_id = ? AND active = true`,
          [data.truck_id]
        )
        if (drivers.length > 0) {
          const formattedDate = data.scheduled_date ? new Date(data.scheduled_date).toLocaleDateString() : 'pronto'
          await connection.query(
            `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
               drivers[0].user_id,
               'Mantenimiento Actualizado',
               `Se ha programado/actualizado un mantenimiento para tu camión (${data.type}) para la fecha: ${formattedDate}. Por favor asiste al taller.`,
               'system',
               id,
               'maintenance'
            ]
          )
        }
      }

      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  delete = async (id) => {
    const query = `DELETE FROM ${this.table} WHERE id=?`
    const [result] = await pool.execute(query, [id])
    return result
  }

  startMaintenance = async (id) => {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Set maintenance state
      await connection.query(
        `UPDATE ${this.table} SET status = 'en curso', start_date = NOW() WHERE id = ?`, 
        [id]
      )

      // Fetch the truck_id from the maintenance record
      const [maintRows] = await connection.query(`SELECT truck_id FROM ${this.table} WHERE id = ?`, [id])
      if (maintRows.length > 0) {
        // Set the truck state
        await connection.query(
          `UPDATE trucks SET status = 'en mantenimiento' WHERE id = ?`,
          [maintRows[0].truck_id]
        )
      }

      await connection.commit()
      return true
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

      await connection.query(
        `UPDATE ${this.table} SET status = 'completado', end_date = NOW() WHERE id = ?`,
        [id]
      )

      const [activeAssignment] = await connection.query(
        `SELECT id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`,
        [truck_id]
      )
      const nextStatus = activeAssignment.length > 0 ? 'en uso' : 'disponible'

      await connection.query(
        `UPDATE trucks SET last_maintenance_mileage = ?, status = ? WHERE id = ?`,
        [completion_mileage, nextStatus, truck_id]
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
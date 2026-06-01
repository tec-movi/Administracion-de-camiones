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
        // Insertar registro en maintenance_logs con la descripción del mantenimiento
        try {
          await connection.query(
            `INSERT INTO maintenance_logs (maintenance_id, notes) VALUES (?, ?)`,
            [result.insertId, data.description || null]
          )
        } catch (e) {
          console.error('No se pudo insertar maintenance_log en create', e.message)
        }
      } else if (status === 'programado') {
        await connection.query(
          `UPDATE trucks SET status = 'en uso' WHERE id = ?`,
          [data.truck_id]
        )

        // Notificar al conductor activo si existe
        const [drivers] = await connection.query(
          `SELECT driver_id FROM truck_driver WHERE truck_id = ? AND active = true`,
          [data.truck_id]
        )
        if (drivers.length > 0) {
          const driverId = drivers[0].driver_id
          const formattedDate = data.scheduled_date ? new Date(data.scheduled_date).toLocaleString() : 'pronto'
          const descriptionPart = data.description ? ` Detalle: ${data.description}` : ''

          // Evitar insertar notificación duplicada para la misma maintenance y conductor
          const [existing] = await connection.query(
            `SELECT id FROM notifications WHERE reference_type = 'maintenance' AND reference_id = ? AND user_id = ? LIMIT 1`,
            [result.insertId, driverId]
          )

          if (existing.length === 0) {
            await connection.query(
              `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                 driverId,
                 'Mantenimiento Programado',
                 `Se ha programado un mantenimiento (${data.type}) para tu camión para la fecha: ${formattedDate}.${descriptionPart}`,
                 'sistema',
                 result.insertId,
                 'maintenance'
              ]
            )
          }
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
          `UPDATE trucks SET last_maintenance_mileage = total_mileage, status = ? WHERE id = ?`,
          [nextStatus, data.truck_id]
        )
      } else if (data.status === 'en curso') {
        await connection.query(
          `UPDATE trucks SET status = 'en mantenimiento' WHERE id = ?`,
          [data.truck_id]
        )
      } else if (data.status === 'programado') {
        await connection.query(
          `UPDATE trucks SET status = 'en uso' WHERE id = ?`,
          [data.truck_id]
        )

        // Notificar al conductor activo si existe
        const [drivers] = await connection.query(
          `SELECT driver_id FROM truck_driver WHERE truck_id = ? AND active = true`,
          [data.truck_id]
        )
        if (drivers.length > 0) {
          const driverId = drivers[0].driver_id
          const formattedDate = data.scheduled_date ? new Date(data.scheduled_date).toLocaleString() : 'pronto'
          const descriptionPart = data.description ? ` Detalle: ${data.description}` : ''

          const [existing] = await connection.query(
            `SELECT id FROM notifications WHERE reference_type = 'maintenance' AND reference_id = ? AND user_id = ? LIMIT 1`,
            [id, driverId]
          )

          if (existing.length === 0) {
            await connection.query(
              `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                 driverId,
                 'Mantenimiento Actualizado',
                 `Se ha programado/actualizado un mantenimiento (${data.type}) para tu camión para la fecha: ${formattedDate}.${descriptionPart}`,
                 'sistema',
                 id,
                 'maintenance'
              ]
            )
          }
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

      // Fetch details from the maintenance record
      const [maintRows] = await connection.query(`SELECT truck_id, type, scheduled_date, description FROM ${this.table} WHERE id = ?`, [id])
      if (maintRows.length > 0) {
        const maint = maintRows[0]
        // Set the truck state
        await connection.query(
          `UPDATE trucks SET status = 'en mantenimiento' WHERE id = ?`,
          [maint.truck_id]
        )

        // Notificar al conductor activo si existe
        const [drivers] = await connection.query(
          `SELECT driver_id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`,
          [maint.truck_id]
        )
        if (drivers.length > 0) {
          const driverId = drivers[0].driver_id
          const descPart = maint.description ? ` Detalle: ${maint.description}` : ''
          const scheduledPart = maint.scheduled_date ? ` Programado: ${new Date(maint.scheduled_date).toLocaleString()}.` : ''
          await connection.query(
            `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              driverId,
              'Mantenimiento Iniciado',
              `El mantenimiento (${maint.type}) de tu camión ha iniciado.${scheduledPart}${descPart}`,
              'sistema',
              id,
              'maintenance'
            ]
          )
        }
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

  completeMaintenance = async (id, truck_id, completion_mileage, description) => {
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      await connection.query(
        `UPDATE ${this.table}
         SET description = COALESCE(?, description),
             status = 'completado',
             end_date = NOW()
         WHERE id = ?`,
        [description ?? null, id]
      )

      const [activeAssignment] = await connection.query(
        `SELECT id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`,
        [truck_id]
      )
      const nextStatus = activeAssignment.length > 0 ? 'en uso' : 'disponible'

      await connection.query(
        `UPDATE trucks SET last_maintenance_mileage = total_mileage, status = ? WHERE id = ?`,
        [nextStatus, truck_id]
      )

      // Notificar al conductor activo si existe que el mantenimiento ha finalizado
      const [drivers] = await connection.query(
        `SELECT driver_id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`,
        [truck_id]
      )
      if (drivers.length > 0) {
        const driverId = drivers[0].driver_id
        const message = `El mantenimiento ha sido completado. El vehículo vuelve a estar disponible.`
        await connection.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES (?, ?, ?, ?, ?, ?)`,
          [driverId, 'Mantenimiento Completado', message, 'sistema', id, 'maintenance']
        )

        await connection.query(
          `UPDATE notifications SET is_read = true WHERE reference_type = 'maintenance' AND user_id = ?`,
          [driverId]
        )
      }

      // Registrar un maintenance_log que referencia este mantenimiento y usar la descripción
      try {
        const [rows] = await connection.query(
          `SELECT description FROM ${this.table} WHERE id = ? LIMIT 1`,
          [id]
        )
        const description = (rows && rows.length > 0) ? rows[0].description : null
        await connection.query(
          `INSERT INTO maintenance_logs (maintenance_id, notes) VALUES (?, ?)`,
          [id, description]
        )
      } catch (e) {
        // no bloquear el commit principal por fallos en logs
        console.error('No se pudo insertar maintenance_log', e.message)
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
}
import pool from '../utils/dbConnection.js'
import MileageModel from './models/mileage.model.js'

export default class Mileage {
  constructor() {
    this.table = MileageModel.table
  }

  get = async () => {
    const query = `SELECT * FROM ${this.table}` 
    const [result] = await pool.execute(query)
    return result
  }

  save = async ({ driver_id, mileage_value, registration_date }) => {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Se obtienen los datos del camión y su asignación activa
      const [assignmentRows] = await connection.query(
        `SELECT td.id, td.truck_id, t.plate_number, t.total_mileage, t.last_maintenance_mileage, t.maintenance_threshold, t.status
        FROM truck_driver td
        JOIN trucks t ON td.truck_id = t.id
        WHERE td.driver_id = ? AND td.active = true
        FOR UPDATE`,
        [driver_id]
      )

      if(assignmentRows.length === 0) {
        throw new Error('El conductor no tiene un camion asignado')
      }
      const truck = assignmentRows[0]

      // Evitar que el chofer introduzca kilometrajes si el camión está en mantenimiento
      if (truck.status === 'en mantenimiento') {
        throw new Error(`Operación denegada: El vehículo [${truck.plate_number}] se encuentra en mantenimiento y no debe ser operado.`)
      }

      // Validación de kilometraje correcto
      if(mileage_value <= truck.total_mileage) {
        throw new Error(`El kilometraje debe ser mayor a ${truck.total_mileage}`)
      }

      // Registrar el kilometraje
      await connection.query(
        `INSERT INTO ${this.table}
        (truck_id, driver_id, mileage_value, registration_date)
        VALUES (?, ?, ?, ?)`,
        [truck.truck_id, driver_id, mileage_value, registration_date || new Date()]
      )

      // Logica de manteninmiento
      const mileageSinceLastService = mileage_value - truck.last_maintenance_mileage
      const needsMaintenance = mileageSinceLastService >= truck.maintenance_threshold

      // Actualizar camion
      await connection.query(
        `UPDATE trucks
        SET total_mileage = ?, status = ?
        WHERE id = ?`,
        [
          mileage_value, 
          needsMaintenance ? 'en mantenimiento' : 'disponible',
          truck.truck_id
        ]
      )

      // Nota: Eliminamos el cierre de asignación (active = false) al registrar kilometraje
      // para permitir que el conductor pueda seguir viendo y usar el camión asignado (recarga en UI).
      
      // Generar notificaciones si requiere mantenimiento
      if(needsMaintenance) {

        const [scheduledMaintenances] = await connection.query(
          `SELECT scheduled_date FROM maintenances
          WHERE truck_id = ? AND status = 'programado' AND active = true
          ORDER BY scheduled_date ASC LIMIT 1`,
          [truck.truck_id]
        )

        const hasScheduled = scheduledMaintenances.length > 0

        const title = `Mantenimiento Requerido: ${truck.plate_number}`
        let message = `El vehículo [${truck.plate_number}] superó el umbral de mantenimiento preventivo (${mileageSinceLastService} km recorridos)`

        if(hasScheduled) {
          const date = new Date(scheduledMaintenances[0].scheduled_date).toLocaleDateString()
          message += `INFO: Ya existe un manteimiento agendado para el día ${date}`
        } else {
          message += `ADVERTENCIA: No se encontró un agendamiento para el mantenimiento. Por favor programar mantenimiento.`
        }

        const [recipients] = await connection.query(
          //Buscar los roles correspondientes a admin, superadmin y mantenimiento activos
          `SELECT id FROM users WHERE role_id IN (1, 2, 4) AND active = true`
        )

        if(recipients.length > 0) {
          // Preparación de insert masivo iterando los todos los usuarios resultantes de los roles obtenidos.
          const notificationValues = recipients.map(user => [
            user.id, title, message, 'mantenimiento', truck.truck_id, 'truck'
          ])

          await connection.query(
            `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type) VALUES ?`,
            [notificationValues]
          )
        }
      }

      await connection.commit()
      return { 
        success: true,
        maintenanceAlert: needsMaintenance,
        details: {
          currentMileage: mileage_value,
          mileageForNextService: Math.max(0, truck.maintenance_threshold - mileageSinceLastService)
        }
      }
      
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
}

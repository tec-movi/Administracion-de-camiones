import pool from "../utils/dbConnection.js";
import AssigmentModel from "./models/assignment.model.js"

export default class Assignment {
  constructor() {
    this.table = AssigmentModel.table
  }

  get = async () => {
    const query = `SELECT * FROM ${this.table}`
    const [result] = await pool.execute(query)
    return result
  }

  getBy = async (params) => {
    const key = Object.key(params)[0]
    const value = Object.values(params)[0]

    const query = `SELECT * FROM ${this.table} WHERE ${key} = ? LIMIT 1`
    const [result] = await pool.execute(query, [value])
    return result[0]
  }

  assign = async ({ driver_id, truck_id }) => {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [truckData] = await connection.query(
        `SELECT status, plate_number FROM trucks WHERE id = ? FOR UPDATE`,
        [truck_id]
      )

      if(truckData.length === 0) throw new Error('El vehículo no existe')
      const truck = truckData[0]

      if(truck.status === 'en mantenimiento') {
        throw new Error(`Operación denegada: El vehículo [${truck.plate_number}] se encuentra registrado 'en mantenimiento'. Por favor, finalice el mantenimiento antes de asignarlo.`)
      }

      if(truck.status === 'en uso') {
        const error = new Error(`El vehículo [${truck.plate_number}] ya cuenta con un conductor asignado.`)
        error.code = 'TRUCK_ALREADY_IN_USE'
        throw error
      }

      // Validar driver sin asignación activa
      const [driverActive] = await connection.query(
        `SELECT * FROM truck_driver 
        WHERE driver_id = ? AND active = true 
        FOR UPDATE`,
        [driver_id]
      )

      if (driverActive.length > 0) {
        throw new Error('El conductor ya tiene un camión asignado')
      }

      // Validar truck sin asignación activa
      const [truckActive] = await connection.query(
        `SELECT * FROM truck_driver 
        WHERE truck_id = ? AND active = true 
        FOR UPDATE`,
        [truck_id]
      )

      if (truckActive.length > 0) {
        throw new Error('El camión ya está en uso')
      }

      // Crear asignación
      const [result] = await connection.query(
        `INSERT INTO truck_driver (driver_id, truck_id, active, assigned_at)
        VALUES (?, ?, true, NOW())`,
        [driver_id, truck_id]
      )

      // Actualizar estado del camión
      await connection.query(
        `UPDATE trucks SET status = 'en uso' WHERE id = ?`,
        [truck_id]
      )

      await connection.commit()
      return result

    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  reassign = async ({ driver_id, truck_id }) => {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [truckData] = await connection.query(
        `SELECT status, plate_number FROM trucks WHERE id = ? FOR UPDATE`,
        [truck_id]
      )

      if(truckData.length === 0) throw new Error('El vehículo no existe')
      const truck = truckData[0]

      if(truck.status === 'en mantenimiento') {
        throw new Error(`Operación denegada: El vehículo [${truck.plate_number}] se encuentra registrado 'en mantenimiento'. Por favor, finalice el mantenimiento antes de reasignarlo.`)
      }

      const [driverCheck] = await connection.query(
        `SELECT id FROM truck_driver WHERE driver_id = ? AND active = true FOR UPDATE`, [driver_id]
      )

      if(driverCheck.length > 0) throw new Error('El nuevo conductor seleccionado ya tiene otra asignación activa.')

      // Desactivar asignación actual
      await connection.query(
        `UPDATE truck_driver SET active = false, ended_at = NOW()
        WHERE truck_id = ? AND active = true`, [truck_id]
      )

      // Crear nueva asignación
      const [result] = await connection.query(
        `INSERT INTO truck_driver (driver_id, truck_id, active, assigned_at)
        VALUES (?, ?, true, NOW())`,
        [driver_id, truck_id]
      )

      await connection.query(`UPDATE trucks SET status = 'en uso' WHERE id = ?`, [truck_id])

      await connection.commit()
      return result

    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  getTruckByDriver = async (driver_id) => {
    const query = `
      SELECT t.*
      FROM trucks t
      JOIN truck_driver dt ON dt.truck_id = t.id
      WHERE dt.driver_id = ?
      LIMIT 1
    `
    const [result] = await pool.execute(query, [driver_id])
    return result[0]
  }

  // TODO: agregar metodo para cambiar estado de asignamiento en tabla trucks
}
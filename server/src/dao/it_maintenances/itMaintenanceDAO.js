import pool from "../../utils/dbConnection.js";

export default class ItMaintenance {
  constructor() {
    this.table = 'it_maintenance_records'
  }

  get = async () => {
    const query = `SELECT * FROM ${this.table}`
    const [result] = await pool.execute(query)
    return result
  }

  getById = async (id) => {
    const query = `SELECT * FROM ${this.table} WHERE id = ?`
    const [result] = await pool.execute(query, [id])
    return result
  }

  save = async (data, parts = []) => {
    const {
      equipment_id,
      technician_id,
      type,
      description,
      cost,
      final_status
    } = data

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()
      // Se identifica el equipo existente y se bloquea la fila durante su actualización
      const query = `SELECT id, inventory_code FROM it_equipment WHERE id = ? FOR UPDATE`
      const [equipment] = await connection.query(query, [equipment_id])

      if(!equipment) throw new Error('El equipo no existe en la base de datos.')

      const [maintResult] = await connection.query(
        `INSERT INTO it_maintenance_records
        (equipment_id, technician_id, type, description, cost)
        VALUES (?, ?, ?, ?, ?)`,
        [equipment_id, technician_id, type, description, cost || 0]
      )

      const maintenanceId = maintResult.insertId

      if(parts.length > 0) {
        for (const part of parts) {
          const [partStock] = await connection.query(
            'SELECT part_name, stock_quantity FROM it_parts_inventory WHERE id = ? FOR UPDATE',
            [part.part_id]
          )

          if(!partStock.length) {
            throw new Error(`La pieza con id ${part.part_id} no existe.`)
          }

          if (partStock[0].stock_quantity < part.quantity_used) {
            throw new Error(`Stock insuficiente para: ${partStock[0].part_name}. Disponible: ${partStock[0].stock_quantity}`)
          }

          await connection.query(
            `UPDATE it_parts_inventory
            SET stock_quantity = stock_quantity - ?
            WHERE id = ?`,
            [part.quantity_used, part.part_id]
          )

          await connection.query(
            `INSERT INTO it_maintenance_parts_used
            (maintenance_id, part_id, quantity_used)
            VALUES (?, ?, ?)`,
            [maintenanceId, part.part_id, part.quantity_used]
          )
        }
      }

      await connection.query(
        'UPDATE it_equipment SET status = ? WHERE id = ?',
        [final_status || 'operativo', equipment_id]
      )

      // en este paso se puede notificar si una pieza tiene stock bajo. Como no se especifica para este caso si es algo que se requiere, se infiere que si no hay piezas necesarias para el mantenimiento, se deben obtener las piezas y pausar el mantenimiento hasta poder ser completado

      await connection.commit()
      return { success: true, maintenanceId }

    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // metodos update y delete no implementados ya que en un entorno real significaría poder alterar la información y los registros no serían confiables para auditorías.
}

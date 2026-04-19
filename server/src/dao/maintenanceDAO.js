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
      SELECT m.*, t.plate_number, t.brand, t.model
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

      const query = `UPDATE ${this.table} 
      SET truck_id=?, type=?, scheduled_date=?, description=?, maintenance_mileage=?, status=?
      WHERE id=?`;
      const [result] = await connection.query(query, [
        data.truck_id, data.type, data.scheduled_date, data.description, data.maintenance_mileage, data.status, id
      ]);

      // Si el administrador cambia el estado a 'completado', actualizamos el camión asociado
      if(data.status === 'completado') {
        // Verificar si el camión tiene un conductor actualmente asignado para restaurarlo a 'en uso' en lugar de 'disponible'
        const [activeAssignment] = await connection.query(
          `SELECT id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`, 
          [data.truck_id]
        )
        const nextStatus = activeAssignment.length > 0 ? 'en uso' : 'disponible'

        await connection.query(
          `UPDATE trucks SET last_maintenance_mileage = ?, status = ? WHERE id = ?`, 
          [data.maintenance_mileage || 0, nextStatus, data.truck_id]
        )
      } else if (data.status === 'en curso' || data.status === 'programado') {
        // En caso de que se pase a en curso o se reverze a programado, pero ya estaba en otra cosa
        // se podría hacer lógica adicional. Sin embargo, para mantener funcionalidad simple:
        // si está en curso forzamos en mantenimiento.
        if (data.status === 'en curso') {
            await connection.query(`UPDATE trucks SET status = 'en mantenimiento' WHERE id = ?`, [data.truck_id])
        }
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
    const query = `UPDATE ${this.table} SET status = 'en curso', start_date = NOW() WHERE id = ?`
    const [result] = await pool.execute(query, [id])
    return result
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

      // se marca el mantenimiento como completado
      await connection.query(`UPDATE ${this.table} SET status = 'completado', end_date = NOW() WHERE id = ?`, [id])

      // Consultar si hay un conductor asignado activo para este camión
      const [activeAssignment] = await connection.query(
        `SELECT id FROM truck_driver WHERE truck_id = ? AND active = true LIMIT 1`, 
        [truck_id]
      )
      const nextStatus = activeAssignment.length > 0 ? 'en uso' : 'disponible'

      // se establece el kilometraje actual como el ultimo de mantemiento y el camion se regresa a su estado
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

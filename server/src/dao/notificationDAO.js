import pool from '../utils/dbConnection.js'

export default class Notification {
  constructor() {
    this.table = 'notifications'  
  }

  getByUserId = async (user_id) => {
    const query = `
      SELECT * FROM ${this.table}
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50`
    const [rows] = await pool.execute(query, [user_id])
    return rows
  }

  markAsRead = async (id, user_id) => {
    const query = `UPDATE ${this.table} SET is_read = true WHERE id = ? AND user_id = ?`
    const [result] = await pool.execute(query, [id, user_id])
    return result
  }

  markAllAsRead = async (user_id) => {
    const query = `UPDATE ${this.table} SET is_read = true WHERE user_id = ? AND is_read = false`
    const [result] = await pool.execute(query, [user_id])
    return result
  }
}

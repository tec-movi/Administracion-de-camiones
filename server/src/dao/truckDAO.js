import pool from "../utils/dbConnection.js";
import TruckModel from './models/truck.model.js'

export default class Truck {
  constructor() {
    this.table = TruckModel.table
  }

  get = async () => {
    const query = `SELECT * FROM ${this.table}`
    const [result] = await pool.execute(query)
    return result 
  }

  getBy = async (params) => {
    const key = Object.keys(params)[0]
    const value = Object.values(params)[0]

    if(value === undefined) {
      throw new Error(`El valor para la busqueda por ${key} es undefined`)
    }

    const query = `SELECT * FROM ${this.table} WHERE ${key} = ? LIMIT 1`
    const [result] = await pool.execute(query, [value])
    return result[0]
  }

  getActiveTruckByDriver = async (driver_id) => {
    const query = `
      SELECT t.*
      FROM ${this.table} t
      INNER JOIN truck_driver td ON t.id = td.truck_id
      WHERE td.driver_id = ?
        AND td.active = TRUE
        AND t.active = TRUE
      LIMIT 1
    `
    const [result] = await pool.execute(query, [driver_id])
    return result[0] || null
  }

  save = async (doc)=> {
    const {
      plate_number,
      brand,
      model,
      year
    } = doc
    const query = `
    INSERT INTO ${this.table}
    (
      plate_number,
      brand,
      model,
      year
    )
    VALUES
    (?, ?, ?, ?)`
    const [result] = await pool.execute(query, [plate_number, brand,  model, year ])
    return result
  }

  update = async (id, newMileage) => {
    const query = `UPDATE ${this.table} SET total_mileage = ? WHERE id = ?`
    const [result] = await pool.execute(query, [newMileage, id])
    return result
  }
}

import { assignmentService } from "../services/index.js"

const getAllAssignments = async (req, res) => {
  try {
    const assignments = await assignmentService.getAll()
    res.send({ status: "success", payload: assignments })
  } catch (error) {
    res.status(500).send({ status:"error", error: error.message })
  }
}

const assignTruck = async (req, res) => {
  try {
    const { driver_id, truck_id } = req.body

    if(!driver_id || !truck_id) {
      return res.status(400).send({ status: "error", error: "Campos incompletos" })
    }

    const result = await assignmentService.assignTruck({ driver_id, truck_id })
    
    res.status(201).send({ status: "success", message: "Vehiculo asignado correctamente", result_id: result.insertId })
  } catch (error) {
    res.status(400).send ({ status: "error", error: error.message })
  }
}

const reassignTruck = async (req, res) => {
  try {
    const { driver_id, truck_id } = req.body

    if(!driver_id || !truck_id) {
      return res.status(400).send({ status: 'error', error: 'Datos incompletos' })
    }

    const result = await assignmentService.reassignTruck({ driver_id, truck_id })
    res.send({ status: "success", message: "Conductor reasignado correctamente", result_id: result.insertId })
  } catch (error) {
    res.status(400).send({ status: "error", error: error.message })
  }
}

export default {
  assignTruck,
  getAllAssignments,
  reassignTruck
}
import { itMaintenanceService } from "../../services/index.js";

const getAllItMaintenances = async (req, res) => {
  try {
    const itMaintenances = await itMaintenanceService.getAll()
    res.send({ status: 'success', payload: itMaintenances })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })    
  }
}

const getById = async (req, res) => {
  try {
    const { id } = req.params
    const [itMaintenance] = await itMaintenanceService.getById(id)
    if (!itMaintenance) {
      return res.status(404).send({ status: 'error', error: 'Mantenimiento no encontrado según el id especificado.' })
    }
    res.send({ status: 'success', payload: itMaintenance })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const registerMaintenance = async (req, res) => {
  try {
    const { equipment_id, technician_id, type, description, cost, final_status, parts } = req.body
    const userId = req.session.user.id

    if (!equipment_id || !type || !description) {
      return res.status(400).send({ status: 'error', error: 'Campos incompletos' })
    }

    const maintenanceData = {
      equipment_id,
      technician_id: userId,
      type,
      description,
      cost: cost || 0,
      final_status: final_status || 'operativo'
    }

    // la función espera las partes desde el req.body como un array
    // el request body completo debe ser:
    // {
    //   "equipment_id": 1,
    //   "type": "correctivo",
    //   "description": "Reemplazo de disco duro y ram",
    //   "parts": [
    //     { "part_id": 1, "quantity_used": 1 },
    //     { "part_id": 2, "quantity_used": 2 }
    //   ]
    // }

    const partsUsed = Array.isArray(parts) ? parts : []

    const result = await itMaintenanceService.registerMaintenance(maintenanceData, partsUsed)
  
    res.send({ status: 'success', message: 'Mantenimiento registrado.', resultId: result.maintenanceId })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

export default {
  getAllItMaintenances,
  getById,
  registerMaintenance
}

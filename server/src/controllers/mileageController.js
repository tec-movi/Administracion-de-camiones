import { mileageService } from '../services/index.js'

const getAllMileageLogs = async (req, res) => {
  try {
    const result = await mileageService.getAll()
    return res.status(200).send({ message: 'Lista de registros de kilometraje', payload: result })
  } catch (error) {
    res.status(500).send({ status: "error", error: error.message })
  }
}

const registerMileage = async (req, res) => {
  try {
    const { mileage_value, registration_date } = req.body // El kilometraje del vehículo se toma del formulario
    const driver_id = req.session.user.id // el id del conductor se toma del token de autenticación
      
    if (!mileage_value || mileage_value <= 0) {
      return res.status(400).send({ message: "Kilometraje inválido" })
    }

    const result = await mileageService.registerMileage({ driver_id, mileage_value, registration_date })

    res.status(201).send({ status: "success", message: "Kilometraje registrado exitosamente", payload: { ...result } })

  } catch (error) {
    res.status(500).send({ message: "Error interno del servidor", error: error.message })
  }
}

export default {
  registerMileage,
  getAllMileageLogs
}
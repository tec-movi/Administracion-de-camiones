import { equipmentService } from "../../services/index.js";

const getAllEquipments = async (req, res) => {
  try {
    const equipments = await equipmentService.getAll()
    res.send({ status: 'success', payload: equipments })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const getEquipmentById = async (req, res) => {
  try {
    const equipment = await equipmentService.getById(req.params.eid)
    if (!equipment) {
      return res.status(404).send({ status: 'error', error: 'No se encontró equipo con el id especificado.' })
    }
    res.send({ status: 'success', payload: equipment })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const createEquipment = async (req, res) => {
  try {
    const { inventory_code, type, brand, model, serial_number, status, location } = req.body
    if (!inventory_code || !type || !brand || !model || !serial_number) {
      return res.status(400).send({ status: 'error', error: 'Campos incompletos' })
    }

    const equipment = {
      inventory_code,
      type,
      brand,
      model,
      serial_number,
      status,
      location
    }
    const result = await equipmentService.create(equipment)
    res.send({ status: 'success', message: 'Equipo agregado.', result_id: result.insertId })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const updateEquipment = async (req, res) => {
  try {
    const result = await equipmentService.update(req.params.eid, req.body)
    res.send({ status: 'success', message: 'Equipo actualizado', payload: result })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

export default {
  getAllEquipments,
  getEquipmentById,
  createEquipment,
  updateEquipment
}

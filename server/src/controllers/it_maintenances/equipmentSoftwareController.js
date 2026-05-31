import { equipmentSoftwareService } from "../../services/index.js";

const getAll = async (req, res) => {
  try {
    const records = await equipmentSoftwareService.getAll()
    res.send({ status: 'success', payload: records })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}


const getByRecordId = async (req, res) => {
  try {
    const records = await equipmentSoftwareService.dao.getDetailById(req.params.id)
    if (!records || records.length === 0) {
      return res.status(404).send({ status: 'error', error: 'Registro no encontrado.' })
    }
    // Se envía como array para que el cliente pueda hacer res.payload[0]
    res.send({ status: 'success', payload: records })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const getByEquipment = async (req, res) => {
  try {
    const equipmentId = req.params.id
    const installedSoftwares = await equipmentSoftwareService.getByEquipment(equipmentId)
    res.send({ status: 'success', payload: installedSoftwares })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const registerSoftwareInstallation = async (req, res) => {
  try {
    const { equipment_id, software_id, install_date, notes } = req.body
    const userId = req.session.user.id

    if (!equipment_id || !software_id) {
      return res.status(400).send({ status: 'error', error: 'Campos incompletos' })
    }

    const data = { equipment_id, software_id, registered_by: userId, install_date, notes }
    const result = await equipmentSoftwareService.create(data)
    res.send({ status: 'success', message: 'Instalación registrada.', result_id: result.insertId })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

export default {
  getAll,
  getByRecordId,
  getByEquipment,
  registerSoftwareInstallation
}
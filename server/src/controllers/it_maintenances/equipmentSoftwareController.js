import {  equipmentSoftwareService } from "../../services/index.js";

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
    const record = await equipmentSoftwareService.getById(req.params.id)
    if (!record) {
      return res.status(404).send({ status: 'error', error: 'No se encotró el registro por el id especificado.' })
    }
    res.send({ status: 'success', payload: record })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const getByEquipment = async (req, res) => {
  try {
    // Se espera que el usuario seleccione un equipo registrado de una lista desplegable para hacer una consulta a la DB solicitando los softwares registrados en ese equipo, con la intención de poder seleccionar uno de ellos y poder presionar un boton para actualizar/desinstalar el software seleccionado
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

    const data = {
      equipment_id,
      software_id,
      registered_by: userId,
      install_date,
      notes
    }

    const result = equipmentSoftwareService.create(data)
    res.send({ status: 'success', message: 'Actualización de software registrada.', result_id: result.insertId })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const updateSoftwareVersion = async (req, res) => {
  try {
    
  } catch (error) {
    
  }
}

export default {
  getAll,
  getByRecordId,
  getByEquipment,
  registerSoftwareInstallation,
  updateSoftwareVersion
}

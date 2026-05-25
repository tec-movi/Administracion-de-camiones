import { softwareService } from "../../services/index.js";

const registerSoftware = async (req, res) => {
  try {
    const { name, version, license_type } = req.body
    if(!name || !version) {
      return res.status(400).send({ status: 'error', error: 'Campos incompletos.' })
    }

    const software = {
      name,
      version,
      license_type
    }

    const result = await softwareService.create(software)
    res.send({ status: 'success', message: 'Software registrado.', result_id: result.insertId })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const getAllSoftwares = async (req, res) => {
  try {
    const result = await softwareService.getAll()
    res.send({ status: 'success', payload: result })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const getById = async (req, res) => {
  try {
    const id = req.params.id
    const result = await softwareService.getById(id)
    res.send({ status: 'success', payload: result })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const update = async (req, res)  => {
  try {
    const softwareId = req.params.id
    const data = req.body
    const result = await softwareService.update(softwareId, data)
    res.send({ status: 'success', message: 'Software actualizado', payload: result })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

export default {
  registerSoftware,
  getAllSoftwares,
  getById,
  update
}

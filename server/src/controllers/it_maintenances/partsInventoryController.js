import { partsInventoryService } from "../../services/index.js";

const getAll = async (req, res) => {
  try {
    const records = await partsInventoryService.getAll()
    res.send({ status: 'success', payload: records })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const getById = async (req, res) => {
  try {
    const id = req.params.id
    const record = await partsInventoryService.getById(id)
    if (!record) {
      return res.status(404).send({ status: 'error', error: 'Pieza no encontrada.' })
    }
    res.send({ status: 'success', payload: record })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const save = async (req, res) => {
  try {
    const {
      part_name,
      description,
      stock_quantity,
      min_stock,
      unit_price
    } = req.body

    if(!part_name) {
      return res.status(400).send({ status: 'error', error: 'El nombre de la pieza es obligatorio.' })
    }

    const result = await partsInventoryService.create({
      part_name,
      description,
      stock_quantity,
      min_stock,
      unit_price
    })
    res.send({ status: 'success', message: 'Pieza registrada.', result_id: result.insertId })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const update = async (req, res) => {
  try {
    const id = req.params.id
    const newData = req.body
    const result = await partsInventoryService.update(id, newData)
    res.send({ status: 'success', message: 'Pieza actualizada.' })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const remove = async (req, res) => {
  try {
    const id = req.params.id
    const result = await partsInventoryService.delete(id)
    if(result.affectedRows === 0) {
      return res.status(404).send({ status: 'error', error: 'Pieza no encontrada.' })
    }
    res.send({ status: 'success', message: 'Pieza eliminada.' })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

export default {
  getAll,
  getById,
  save,
  update,
  remove
}

import { maintenanceLogsService } from '../services/index.js'

const getLastByTruck = async (req, res) => {
  try {
    const { truck_id } = req.params
    const result = await maintenanceLogsService.getLastByTruck(truck_id)
    res.send({ status: 'success', payload: result })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

const createLog = async (req, res) => {
  try {
    const data = req.body
    const result = await maintenanceLogsService.createLog(data)
    res.send({ status: 'success', payload: result })
  } catch (error) {
    res.status(500).send({ status: 'error', error: error.message })
  }
}

export default { getLastByTruck, createLog }

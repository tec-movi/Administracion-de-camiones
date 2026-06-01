import GenericRepository from './GenericRepository.js'

export default class MaintenanceLogsRepository extends GenericRepository {
  constructor(dao) {
    super(dao)
  }

  createLog = async (data) => await this.dao.create(data)

  getLastByTruck = async (truck_id) => await this.dao.getLastByTruck(truck_id)
}

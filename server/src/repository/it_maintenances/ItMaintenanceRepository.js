import GenericRepository from "../GenericRepository.js";

export default class ItMaintenanceRepository extends GenericRepository {
  constructor(dao) {
    super(dao)
  }

  registerMaintenance = async (maintenanceData, partsUsed) => {
    return await this.dao.save(maintenanceData, partsUsed)
  }

  getById = async (id) => {
    return await this.dao.getById(id)
  }
}

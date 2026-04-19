import GenericRepository from "./GenericRepository.js";

export default class AssignmentRepository extends GenericRepository {
  constructor(dao) {
    super(dao)
  }

  assignTruck = async (doc) => {
    return this.dao.assign(doc)
  }

  getTruckByDriver = async (driver_id) => {
    return this.dao.getTruckByDriver(driver_id)
  }

  reassignTruck = async (doc) => {
    return this.dao.reassign(doc)
  }
}
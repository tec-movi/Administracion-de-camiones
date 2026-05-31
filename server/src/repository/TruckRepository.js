import GenericRepository from "./GenericRepository.js";

export default class TruckRepository extends GenericRepository {
  constructor(dao) {
    super(dao)
  }

  getById = async (id) => {
    return this.getBy({ id })
  }

  getByPlateNumber = async (plate_number) => {
    return this.getBy({ plate_number })
  }

  getByStatus = async (status) => {
    return this.getBy({ status })
  }

  updateMileage = async (id, newMileage) => {
    return this.update({ id, newMileage })
  }

  getActiveTruckByDriver = async (driver_id) => {
    return this.dao.getActiveTruckByDriver(driver_id)
  }
}

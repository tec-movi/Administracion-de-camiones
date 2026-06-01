import GenericRepository from "./GenericRepository.js";

export default class MileageRepository extends GenericRepository {
  constructor(dao) {
    super(dao)
  }

  registerMileage = async (data) => {
    return this.dao.save(data)
  }
}

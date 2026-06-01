import GenericRepository from "../GenericRepository.js";

export default class SoftwareRepository extends GenericRepository {
  constructor(dao) {
    super(dao)
  }

  getById = async (id) => {
    return this.dao.getById(id)
  }
}

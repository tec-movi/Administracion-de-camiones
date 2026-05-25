import GenericRepository from "../GenericRepository.js";

export default class EquipmentRepository extends GenericRepository {
  constructor(dao) {
    super(dao)
  }

  getById = async (id) => {
    return await this.getBy({ id })
  }

}

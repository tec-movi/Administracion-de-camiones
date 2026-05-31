import GenericRepository from "../GenericRepository.js";

export default class EquipmentSoftware extends GenericRepository {
  constructor(dao) {
    super(dao)
  }

  getById = async (id) => {
    return await this.getBy({ id })
  }

  getByEquipment = async (equipmentId) => {
    return await this.dao.getByEquipment(equipmentId)
  }
}

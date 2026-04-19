import GenericRepository from "./GenericRepository.js";

export default class NotificationRepository extends GenericRepository {
  constructor(dao) {
    super(dao)
  }

  getByUserId = async (user_id) => {
    return await this.dao.getByUserId(user_id)
  }

  markAsRead = async (id, user_id) => {
    return await this.dao.markAsRead(id, user_id)
  }

  markAllAsRead = async (user_id) => {
    return await this.dao.markAllAsRead(user_id)
  }
}
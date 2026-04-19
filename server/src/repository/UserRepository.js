import GenericRepository from "./GenericRepository.js";

export default class UserRepository extends GenericRepository {
  constructor(dao) {
    super(dao)
  }
  
  getUserById = (id) => {
    return this.getBy({ id })
  }

  getUserByEmail = (email) => {
    return this.getBy({ email })
  }

  getUserWithRoleByUserEmail = (email) => {
    return this.dao.getRoleByUserEmail(email)
  }
}

export default class UserDTO {
  static getUserTokenFrom = (user) => {
    return {
      id: user.id,
      full_name: `${user.full_name}`,
      email: user.email,
      role: user.role
    }
  }
}
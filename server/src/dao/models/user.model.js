const collection = 'users'

const UserModel = {
  table: collection,
  fields: {
    id: 'id',
    full_name: 'full_name',
    email: 'email',
    password: 'password',
    role: 'role',
    isEnabled: 'is_enabled',
    createdAt: 'created_at'
  }
}

export default UserModel

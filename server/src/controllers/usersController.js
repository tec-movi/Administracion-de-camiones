import { usersService } from "../services/index.js";

const getAllUsers = async (req, res) => {
  const users = await usersService.getAll()
  res.send({ status:"success", payload: users })
}

const getUser = async (req, res) => {
  const userId = req.params.uid
  const user = await usersService.getUserById(userId)
  if(!user) return res.status(404).send({ status: "error", error: "User not found" })
  res.send({ status: "success", payload: user })
}

const updateUser = async (req, res) => {
  try {
    const userId = req.params.uid

    const { role_id, full_name, is_enabled } = req.body
    const updateBody = {}
    if(role_id) updateBody.role_id = role_id
    if(full_name) updateBody.full_name = full_name
    if(is_enabled !== undefined) updateBody.is_enabled = is_enabled

    if(Object.keys(updateBody).length === 0) {
      return res.status(400).send({ status: "error", error: "No se han proporcionado campos válidos para actualizar" })
    }
    
    const user = await usersService.getUserById(userId)
    if(!user) return res.status(404).send({ status: "error", error: "User not found" })
    
    const result = await usersService.update(userId, updateBody)
    res.send({ status: "success", message: "User updated", result: result })
  } catch (error) {
    res.status(500).send({ status: "error", error: error.message })
  }
}

const deleteUser = async (req, res) => {
  const userId = req.params.uid
  const result = await usersService.getUserById(userId)
  res.send({ status: "success", message: "User deleted", result: result })
}

export default {
  getUser,
  getAllUsers,
  updateUser,
  deleteUser
}

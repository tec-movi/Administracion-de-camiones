import { notificationService } from "../services/index.js";

const getUserNotifications = async (req, res) => {
  try {
    const user_id = req.session.user.id
    const notifications = await notificationService.getByUserId(user_id)
    res.send({ status: "success", payload: notifications })
  } catch (error) {
    res.status(500).send({ status: "error", error: error.message })
  }
}

const readNotifications = async (req, res) => {
  try {
    const { nid } = req.params
    const user_id = req.session.user.id

    await notificationService.markAsRead(nid, user_id)
    res.send({ status: "success", message: "Notificación marcada como leída" })
  } catch (error) {
    res.status(500).send({ status: "error", error: error.message })
  }
}

const readAllNotifications = async (req, res) => {
  try {
    const user_id = req.session.user.id
    await notificationService.markAllAsRead(user_id)
    res.send({ status: "success", message: "Todas las notificaciones marcadas como leídas" })
  } catch (error) {
    res.status(500).send({ status: "error", error: error.message })
  }
}

export default {
  getUserNotifications,
  readNotifications,
  readAllNotifications
}

import { Router } from "express";
import notificationController from "../controllers/notificationController.js";
import { authorize } from "../middlewares/auth.js";

const router = Router()

router.get('/', authorize(['driver', 'admin', 'superadmin', 'maintenance', 'developer']), notificationController.getUserNotifications)
router.put('/read-all', authorize(['driver', 'admin', 'superadmin', 'maintenance', 'developer']), notificationController.readAllNotifications)
router.put('/:nid', authorize(['driver', 'admin', 'superadmin', 'maintenance', 'developer']), notificationController.readNotifications)

export default router

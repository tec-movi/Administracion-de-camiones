import { Router } from "express";
import notificationController from "../controllers/notificationController.js";
import { authorize } from "../middlewares/auth.js";
 
const router = Router()
 
const NOTIFY_ROLES = ['driver', 'admin', 'superadmin', 'maintenance', 'it_tech']
 
router.get('/', authorize(NOTIFY_ROLES), notificationController.getUserNotifications)
router.put('/read-all', authorize(NOTIFY_ROLES), notificationController.readAllNotifications)
router.put('/:nid', authorize(NOTIFY_ROLES), notificationController.readNotifications)
 
export default router
 
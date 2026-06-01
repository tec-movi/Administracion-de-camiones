import { Router } from "express";
import sessionController from "../controllers/sessionController.js";
import { authorize } from "../middlewares/auth.js";
 
const router = Router()
 
const ALL_ROLES = ['driver', 'maintenance', 'admin', 'superadmin', 'it_tech']
 
router.post('/register', sessionController.register)
router.post('/login', sessionController.login)
router.get('/current', authorize(ALL_ROLES), sessionController.current)
router.post('/logout', authorize(ALL_ROLES), sessionController.logout)
 
export default router
 
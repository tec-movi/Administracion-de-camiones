import { Router } from "express";
import mileageController from '../controllers/mileageController.js'
import { authorize } from "../middlewares/auth.js";

const router = Router()

router.get('/', authorize(['driver', 'admin', 'superadmin']), mileageController.getAllMileageLogs)
router.post('/save', authorize(['driver', 'superadmin']), mileageController.registerMileage)

export default router
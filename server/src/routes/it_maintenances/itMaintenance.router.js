import { Router } from "express";
import itMaintenanceController from "../../controllers/it_maintenances/itMaintenanceController.js";
import { authorize } from "../../middlewares/auth.js";

const router = Router()

router.get('/', itMaintenanceController.getAllItMaintenances)
router.get('/:id', itMaintenanceController.getById)
router.post('/', authorize(['it_tech', 'admin', 'superadmin']), itMaintenanceController.registerMaintenance)

export default router

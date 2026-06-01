import { Router } from "express";
import maintenanceController from "../controllers/maintenanceController.js";
import { authorize } from "../middlewares/auth.js";

const router = Router()

const authRoles = authorize(['maintenance', 'admin', 'superadmin'])

router.post('/', authRoles, maintenanceController.createMaintenance)
router.get('/', authRoles, maintenanceController.getAll)
router.get('/truck/:truck_id', authRoles, maintenanceController.getByTruck)
router.put('/:maintenance_id', authRoles, maintenanceController.updateMaintenance)
router.delete('/:maintenance_id', authRoles, maintenanceController.deleteMaintenance)
router.put('/:maintenance_id/complete', authRoles, maintenanceController.completeMaintenance)
router.put('/:maintenance_id/start', authRoles, maintenanceController.startMaintenance)

export default router

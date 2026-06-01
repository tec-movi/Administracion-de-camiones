import { Router } from 'express'
import maintenanceLogsController from '../controllers/maintenanceLogsController.js'
import { authorize } from '../middlewares/auth.js'

const router = Router()

const authRoles = authorize(['maintenance', 'admin', 'superadmin'])

router.get('/last/:truck_id', authRoles, maintenanceLogsController.getLastByTruck)
router.post('/', authRoles, maintenanceLogsController.createLog)

export default router

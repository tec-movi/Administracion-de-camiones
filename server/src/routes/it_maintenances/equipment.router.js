import { Router } from "express";
import equipmentController from "../../controllers/it_maintenances/equipmentController.js";
import { authorize } from "../../middlewares/auth.js";
const router = Router()

router.get('/', authorize(['it_tech', 'admin', 'superadmin']), equipmentController.getAllEquipments)
router.get('/:eid', authorize(['it_tech', 'admin', 'superadmin']), equipmentController.getEquipmentById)
router.post('/', authorize(['it_tech', 'admin', 'superadmin']), equipmentController.createEquipment)
router.put('/:eid', authorize(['it_tech', 'admin', 'superadmin']), equipmentController.updateEquipment)

export default router

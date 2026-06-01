import { Router } from "express";
import equipmentSoftwareController from "../../controllers/it_maintenances/equipmentSoftwareController.js";
import { authorize } from "../../middlewares/auth.js";

const router = Router()

router.get('/', authorize(['it_tech', 'admin', 'superadmin']), equipmentSoftwareController.getAll)
router.get('/equipment/:id', authorize(['it_tech', 'admin', 'superadmin']), equipmentSoftwareController.getByEquipment) // retorna los softwares instalados según el equipo indicado
router.get('/:id', authorize(['it_tech', 'admin', 'superadmin']), equipmentSoftwareController.getByRecordId)
router.post('/', authorize(['it_tech', 'admin', 'superadmin']), equipmentSoftwareController.registerSoftwareInstallation)

export default router

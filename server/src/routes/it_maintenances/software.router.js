import { Router } from "express";
import softwareController from "../../controllers/it_maintenances/softwareController.js";
import { authorize } from "../../middlewares/auth.js";

const router = Router()

router.get('/', authorize(['it_tech', 'admin', 'superadmin']), softwareController.getAllSoftwares)
router.get('/:id', authorize(['it_tech', 'admin', 'superadmin']), softwareController.getById)
router.post('/', authorize(['it_tech', 'admin', 'superadmin']), softwareController.registerSoftware)
router.put('/:id', authorize(['it_tech', 'admin', 'superadmin']), softwareController.update)

export default router

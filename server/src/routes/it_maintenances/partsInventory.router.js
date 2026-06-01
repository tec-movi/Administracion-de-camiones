import { Router } from "express";
import partsInventoryController from "../../controllers/it_maintenances/partsInventoryController.js";
import { authorize } from "../../middlewares/auth.js";

const router = Router()

router.get('/', authorize(['it_tech', 'admin', 'superadmin']), partsInventoryController.getAll)
router.get('/:id', authorize(['it_tech', 'admin', 'superadmin']), partsInventoryController.getById)
router.post('/', authorize(['it_tech', 'admin', 'superadmin']), partsInventoryController.save)
router.put('/:id', authorize(['it_tech', 'admin', 'superadmin']), partsInventoryController.update)
router.delete('/:id', authorize(['it_tech', 'admin', 'superadmin']), partsInventoryController.remove)

export default router

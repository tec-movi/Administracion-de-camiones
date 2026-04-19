import { Router } from 'express'
import assignmentController from '../controllers/assignmentController.js'
import { authorize } from '../middlewares/auth.js'

const router = Router()

router.get('/', authorize(['admin', 'superadmin']), assignmentController.getAllAssignments)
router.post('/assign', authorize(['admin', 'superadmin']), assignmentController.assignTruck)
router.put('/reassign', authorize(['admin', 'superadmin']), assignmentController.reassignTruck)

export default router

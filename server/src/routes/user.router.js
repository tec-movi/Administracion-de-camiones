import { Router } from 'express'
import usersController from '../controllers/usersController.js'
import { authorize } from '../middlewares/auth.js'

const router = Router()

router.get('/', authorize(['admin', 'superadmin']), usersController.getAllUsers)
router.get('/:uid', authorize(['admin', 'superadmin']), usersController.getUser)
router.put('/:uid', authorize(['admin', 'superadmin']), usersController.updateUser)

export default router

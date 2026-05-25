import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import cors from 'cors'

import userRouter from './routes/user.router.js'
import sessionRouter from './routes/sessions.router.js'

import mileageRouter from './routes/mileage.router.js'
import truckRouter from './routes/truck.router.js'
import assignmentRouter from './routes/assignment.router.js'
import notificationRouter from './routes/notification.router.js'
import maintenanceRouter from './routes/maintenance.router.js'

import equipmentRouter from './routes/it_maintenances/equipment.router.js'
import itMaintenanceRouter from './routes/it_maintenances/itMaintenance.router.js'
import equipmentSoftwareRouter from './routes/it_maintenances/equipmentSoftware.router.js'
import softwareRouter from './routes/it_maintenances/software.router.js'
import partsInventoryRouter from './routes/it_maintenances/partsInventory.router.js'

const app = express()

const allowedOrigins = [
  'http://localhost:8000',
  'http://127.0.0.1:5501',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://localhost:5500'
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const PORT = process.env.PORT || 8080

app.get('/', (req, res) => res.send({ msg: 'API de kilometraje funcionando' }))

app.use((req, res, next) => {
  const token = req.cookies['access_token']
  req.session = { user: null }

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET)
    req.session.user = data
  } catch (error) {
    if(error.message !== 'jwt expired')
    console.error(error.message);
  }

  next()
})

app.use('/api/users', userRouter)
app.use('/api/sessions', sessionRouter)
app.use('/api/assignments', assignmentRouter)

app.use('/api/mileageLogs', mileageRouter)
app.use('/api/trucks', truckRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/maintenances', maintenanceRouter)

app.use('/api/ti/equipments', equipmentRouter)
app.use('/api/ti/maintenances', itMaintenanceRouter)
app.use('/api/ti/equipment-software', equipmentSoftwareRouter)
app.use('/api/ti/software', softwareRouter)
app.use('/api/ti/parts', partsInventoryRouter)

export default app

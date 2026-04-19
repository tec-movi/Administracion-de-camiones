import Users from "../dao/userDAO.js";
import Mileage from "../dao/mileageDAO.js";
import Truck from "../dao/truckDAO.js";
import Assignment from "../dao/assignmentDAO.js";
import Notification from "../dao/notificationDAO.js";
import Maintenance from "../dao/maintenanceDAO.js";

import UserRepository from "../repository/UserRepository.js";
import MileageRepository from "../repository/MileageRepository.js";
import TruckRepository from "../repository/TruckRepository.js";
import AssignmentRepository from "../repository/AssignmentRepository.js";
import NotificationRepository from "../repository/NotificationRepository.js";
import MaintenanceRepository from "../repository/maintenanceRepository.js";

export const usersService = new UserRepository(new Users())
export const mileageService = new MileageRepository(new Mileage())
export const truckService = new TruckRepository(new Truck())
export const assignmentService = new AssignmentRepository(new Assignment())
export const notificationService = new NotificationRepository(new Notification())
export const maintenanceService = new MaintenanceRepository(new Maintenance())

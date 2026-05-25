import Users from "../dao/userDAO.js";
import Mileage from "../dao/mileageDAO.js";
import Truck from "../dao/truckDAO.js";
import Assignment from "../dao/assignmentDAO.js";
import Notification from "../dao/notificationDAO.js";
import Maintenance from "../dao/maintenanceDAO.js";
// IT
import Equipment from "../dao/it_maintenances/itEquipmentDAO.js";
import ItMaintenance from "../dao/it_maintenances/itMaintenanceDAO.js";
import Software from "../dao/it_maintenances/softwareDAO.js";
import EquipmentSoftware from "../dao/it_maintenances/equipmentSoftwareDAO.js";
import PartsInventory from "../dao/it_maintenances/partsInventoryDAO.js";

import UserRepository from "../repository/UserRepository.js";
import MileageRepository from "../repository/MileageRepository.js";
import TruckRepository from "../repository/TruckRepository.js";
import AssignmentRepository from "../repository/AssignmentRepository.js";
import NotificationRepository from "../repository/NotificationRepository.js";
import MaintenanceRepository from "../repository/maintenanceRepository.js";
// IT
import EquipmentRepository from "../repository/it_maintenances/EquipmentRepository.js";
import ItMaintenanceRepository from "../repository/it_maintenances/ItMaintenanceRepository.js";
import SoftwareRepository from "../repository/it_maintenances/SoftwareRepository.js";
import EquipmentSoftwareRepository from "../repository/it_maintenances/EquipmentSoftwareRepository.js";
import PartsInventoryRepository from "../repository/it_maintenances/PartsInventoryRepository.js";

export const usersService = new UserRepository(new Users())
export const mileageService = new MileageRepository(new Mileage())
export const truckService = new TruckRepository(new Truck())
export const assignmentService = new AssignmentRepository(new Assignment())
export const notificationService = new NotificationRepository(new Notification())
export const maintenanceService = new MaintenanceRepository(new Maintenance())
// IT
export const equipmentService = new EquipmentRepository(new Equipment())
export const itMaintenanceService = new ItMaintenanceRepository(new ItMaintenance())
export const softwareService = new SoftwareRepository(new Software())
export const equipmentSoftwareService = new EquipmentSoftwareRepository(new EquipmentSoftware())
export const partsInventoryService = new PartsInventoryRepository(new PartsInventory())

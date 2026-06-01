CREATE DATABASE IF NOT EXISTS hirata_db;
USE hirata_db;

-- USUARIOS Y ROLES
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES 
('admin'),
('superadmin'),
('driver'),
('maintenance'),
('it_tech');

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL DEFAULT 3,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- CAMIONES

CREATE TABLE trucks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  status ENUM('disponible', 'en uso', 'en mantenimiento') DEFAULT 'disponible',
  total_mileage INT DEFAULT 0,
  last_maintenance_mileage INT DEFAULT 0,
  maintenance_threshold INT DEFAULT 5000,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ASIGNACIONES (HISTÓRICO)

CREATE TABLE truck_driver (
  id INT AUTO_INCREMENT PRIMARY KEY,
  truck_id INT NOT NULL,
  driver_id INT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,

  FOREIGN KEY (truck_id) REFERENCES trucks(id),
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

-- REGISTRO DE KILOMETRAJE

CREATE TABLE mileage_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  truck_id INT NOT NULL,
  driver_id INT NOT NULL,
  mileage_value INT NOT NULL,
  difference_mileage INT,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (truck_id) REFERENCES trucks(id),
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

-- MANTENIMIENTOS

CREATE TABLE maintenances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  truck_id INT NOT NULL,
  maintenance_mileage INT NOT NULL,
  type ENUM('preventivo', 'correctivo') DEFAULT 'preventivo',
  status ENUM('programado', 'en curso', 'completado') DEFAULT 'programado',
  scheduled_date DATE,
  start_date DATE,
  end_date DATE,
  description TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (truck_id) REFERENCES trucks(id)
);

-- HISTORIAL DE MANTENIMIENTO

CREATE TABLE maintenance_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  maintenance_id INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (maintenance_id) REFERENCES maintenances(id)
);

-- =============================================
-- 3. MÓDULO IT (SALA DE INFORMÁTICA)
-- =============================================

-- RF-06: Catálogo de equipos
CREATE TABLE it_equipment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_code VARCHAR(50) NOT NULL UNIQUE, -- Código interno de la empresa
  type ENUM('PC', 'Laptop', 'Impresora', 'Servidor', 'Switch', 'Access Point','Router', 'Otro') NOT NULL,
  brand VARCHAR(50),
  model VARCHAR(50),
  serial_number VARCHAR(100) UNIQUE,
  status ENUM('operativo', 'en reparacion', 'de baja') DEFAULT 'operativo',
  location VARCHAR(100), -- Ej: Sala de Informática, Oficina 101
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RF-07: Catálogo de Software y Registro de Instalaciones
CREATE TABLE software (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  version VARCHAR(50),
  license_type VARCHAR(50), -- OEM, Retail, Suscripción
  expiration_date DATE NULL
);

CREATE TABLE it_equipment_software (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  software_id INT NOT NULL,
  registered_by INT NOT NULL,
  install_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (equipment_id) REFERENCES it_equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (software_id) REFERENCES software(id) ON DELETE CASCADE,
  FOREIGN KEY (registered_by) REFERENCES users(id)
);

-- RF-09: Inventario de Piezas (Repuestos)
CREATE TABLE it_parts_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  part_name VARCHAR(100) NOT NULL,
  description TEXT,
  stock_quantity INT DEFAULT 0,
  min_stock INT DEFAULT 2, -- Para alertas de reabastecimiento
  unit_price DECIMAL(10, 2) DEFAULT 0.00
);

-- RF-06 / RF-08: Registro de Mantenimiento IT (Historial)
CREATE TABLE it_maintenance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  technician_id INT NOT NULL,
  type ENUM('preventivo', 'correctivo') NOT NULL,
  description TEXT NOT NULL,
  intervention_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cost DECIMAL(10, 2) DEFAULT 0.00,
  FOREIGN KEY (equipment_id) REFERENCES it_equipment(id),
  FOREIGN KEY (technician_id) REFERENCES users(id)
);

-- RF-09: Relación de piezas usadas en un mantenimiento
CREATE TABLE it_maintenance_parts_used (
  id INT AUTO_INCREMENT PRIMARY KEY,
  maintenance_id INT NOT NULL,
  part_id INT NOT NULL,
  quantity_used INT NOT NULL,
  FOREIGN KEY (maintenance_id) REFERENCES it_maintenance_records(id),
  FOREIGN KEY (part_id) REFERENCES it_parts_inventory(id)
);

-- Notificaciones
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(100),
  message TEXT NOT NULL,
  type ENUM('mantenimiento', 'asignacion', 'sistema', 'error') DEFAULT 'sistema',
  reference_id INT,
  reference_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SET GLOBAL event_scheduler = ON;

CREATE EVENT clean_old_notifications
ON SCHEDULE EVERY 1 DAY
COMMENT 'Elimina notificaciones con más de 6 meses de antiguedad'
DO
  DELETE FROM notifications
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);

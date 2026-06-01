// Centraliza configuración de rutas por rol, eliminando dependencias circulares entre módulos.

export const ROLE_ROUTES = {
    superadmin:    "module/admflota/admflota.view.html",
    admin:         "module/admin-it/adm-it.view.html",
    driver:        "module/driver/driver.view.html",
    conductor:     "module/driver/driver.view.html",
    maintenance:   "module/admmantenimiento/admmant.view.html",
    it_tech:       "module/itmaintenance/it-maintenance.view.html"
}

// Fragmento de ruta que identifica cada módulo (para no redirigir si ya estás ahí)
export const ROLE_PATH_FRAGMENTS = {
    superadmin:    "admflota.view.html",
    admin:         "adm-it.view.html",
    driver:        "driver.view.html",
    conductor:     "driver.view.html",
    maintenance:   "admmant.view.html",
    it_tech:       "it-maintenance.view.html"
}

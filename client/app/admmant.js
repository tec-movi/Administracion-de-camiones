import { requestJson, setAlert } from "./shared.js"

const API_MAINTENANCE_URL = 'http://localhost:8000/api/maintenances'
const API_TRUCKS_URL = 'http://localhost:8000/api/trucks'

// DOM Elements
const maintenanceTableBody = document.getElementById('maintenanceTableBody')
const maintenanceForm = document.getElementById('maintenanceForm')
const maintenanceModal = new bootstrap.Modal(document.getElementById('maintenanceModal'))
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'))
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn')
const errorAlert = document.getElementById('maintenanceError')
const btnNewMaintenance = document.getElementById('btnNewMaintenance')

let maintenanceToDelete = null

// Alerts
const showError = (message) => {
    errorAlert.textContent = message
    errorAlert.classList.remove('d-none')
}
const hideError = () => {
    errorAlert.classList.add('d-none')
}

// Cargar opciones de camiones en el select
const loadTrucksForSelect = async () => {
    try {
        const data = await requestJson(API_TRUCKS_URL, {
            method: "GET",
            credentials: "include",
            headers: { 'Content-type': 'application/json' }
        }, 'No se pudieron cargar los camiones')

        const trucks = Array.isArray(data.payload) ? data.payload : []
        const select = document.getElementById('truckId')
        
        select.innerHTML = '<option value="">Seleccione un camión</option>'
        trucks.forEach(truck => {
            const option = document.createElement('option')
            option.value = truck.id
            option.dataset.mileage = truck.total_mileage || 0
            option.textContent = `${truck.plate_number} - ${truck.brand} ${truck.model}`
            select.appendChild(option)
        })
    } catch (error) {
        console.error(error)
    }
}

// Auto-completar el kilometraje cuando se selecciona un camión
document.getElementById('truckId').addEventListener('change', (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex]
    const currentMileage = selectedOption.dataset.mileage
    
    if (currentMileage !== undefined) {
        document.getElementById('maintenanceMileage').value = currentMileage
    } else {
        document.getElementById('maintenanceMileage').value = ''
    }
})

// Formatear fechas
const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString()
}

// Renderizar estado con badge
const getStatusBadge = (status) => {
    const badges = {
        'programado': 'bg-warning text-dark',
        'en curso': 'bg-primary',
        'completado': 'bg-success'
    }
    return `<span class="badge ${badges[status] || 'bg-secondary'}">${status.toUpperCase()}</span>`
}

// Cargar la tabla de mantenimientos
const loadMaintenances = async () => {
    try {
        const data = await requestJson(API_MAINTENANCE_URL, {
            method: "GET",
            credentials: "include",
            headers: { 'Content-type': 'application/json' }
        }, 'No se pudieron cargar los mantenimientos')

        const maintenances = Array.isArray(data.payload) ? data.payload : []
        maintenanceTableBody.innerHTML = ''

        if (maintenances.length === 0) {
            maintenanceTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay registros de mantenimiento</td></tr>'
            return
        }

        maintenances.forEach(m => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${m.id}</td>
                <td>${m.plate_number}</td>
                <td>${m.maintenance_mileage} km</td>
                <td><span class="text-capitalize">${m.type}</span></td>
                <td>${getStatusBadge(m.status)}</td>
                <td>${formatDate(m.scheduled_date)}</td>
                <td>${m.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1 edit-btn" data-id="${m.id}" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${m.id}" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `
            // Agregar event listeners a los botones
            const editBtn = tr.querySelector('.edit-btn')
            editBtn.addEventListener('click', () => openEditModal(m))
            
            const deleteBtn = tr.querySelector('.delete-btn')
            deleteBtn.addEventListener('click', () => openDeleteModal(m.id))

            maintenanceTableBody.appendChild(tr)
        })
    } catch (error) {
        console.error(error)
        maintenanceTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar registros: ${error.message}</td></tr>`
    }
}

// Abrir modal para crear
btnNewMaintenance.addEventListener('click', () => {
    hideError()
    maintenanceForm.reset()
    document.getElementById('maintenanceId').value = ''
    document.getElementById('maintenanceModalLabel').textContent = 'Registrar Mantenimiento'
})

// Abrir modal para editar
const openEditModal = (maintenance) => {
    hideError()
    document.getElementById('maintenanceModalLabel').textContent = 'Editar Mantenimiento'
    document.getElementById('maintenanceId').value = maintenance.id
    document.getElementById('truckId').value = maintenance.truck_id
    document.getElementById('maintenanceMileage').value = maintenance.maintenance_mileage
    document.getElementById('maintenanceType').value = maintenance.type
    document.getElementById('maintenanceStatus').value = maintenance.status
    if (maintenance.scheduled_date) {
        document.getElementById('scheduledDate').value = maintenance.scheduled_date.split('T')[0]
    }
    document.getElementById('description').value = maintenance.description
    
    maintenanceModal.show()
}

// Abrir modal para eliminar
const openDeleteModal = (id) => {
    maintenanceToDelete = id
    deleteModal.show()
}

// Manejar creación / actualización
maintenanceForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    hideError()

    const id = document.getElementById('maintenanceId').value
    const data = {
        truck_id: document.getElementById('truckId').value,
        maintenance_mileage: document.getElementById('maintenanceMileage').value,
        type: document.getElementById('maintenanceType').value,
        status: document.getElementById('maintenanceStatus').value,
        scheduled_date: document.getElementById('scheduledDate').value || null,
        description: document.getElementById('description').value
    }

    try {
        const url = id ? `${API_MAINTENANCE_URL}/${id}` : API_MAINTENANCE_URL
        const method = id ? 'PUT' : 'POST'

        const res = await requestJson(url, {
            method,
            credentials: "include",
            headers: { 'Content-type': 'application/json' },
            body: JSON.stringify(data)
        }, 'Error al guardar el mantenimiento')

        if (res.status === 'success') {
            maintenanceModal.hide()
            loadMaintenances()
        }
    } catch (error) {
        showError(error.message)
    }
})

// Manejar eliminación
confirmDeleteBtn.addEventListener('click', async () => {
    if (!maintenanceToDelete) return
    
    // Disable button to prevent double-click
    confirmDeleteBtn.disabled = true
    try {
        await requestJson(`${API_MAINTENANCE_URL}/${maintenanceToDelete}`, {
            method: "DELETE",
            credentials: "include",
            headers: { 'Content-type': 'application/json' }
        }, 'Error al eliminar el mantenimiento')

        deleteModal.hide()
        loadMaintenances()
    } catch (error) {
        alert("Error al eliminar: " + error.message)
    } finally {
        maintenanceToDelete = null
        confirmDeleteBtn.disabled = false
    }
})

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTrucksForSelect()
    loadMaintenances()
})
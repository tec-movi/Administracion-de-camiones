import { clearAlert, requestJson, setAlert, API_BASE, createCell, createHtmlCell, createActionButton } from "./shared.js"

const API_MAINTENANCE_URL = `${API_BASE}/maintenances`
const API_TRUCKS_URL = `${API_BASE}/trucks`

// ── Variables de estado (no dependen del DOM, pueden vivir a nivel de módulo) ──
let maintenanceToDelete = null
let maintenancesCache = []

// ── Helpers puros ──────────────────────────────────────────────────────────────

const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
}

const getStatusBadge = (status) => {
    const badges = {
        'programado': 'bg-warning text-dark',
        'en curso': 'bg-primary',
        'completado': 'bg-success'
    }
    return `<span class="badge ${badges[status] || 'bg-secondary'}">${status.toUpperCase()}</span>`
}

const getSelectedTruckCurrentMileage = () => {
    const truckSelect = document.getElementById('truckId')
    const selectedOption = truckSelect?.options?.[truckSelect.selectedIndex]
    return Number(selectedOption?.dataset?.mileage)
}

const handleLoadError = (error) => {
    if (error?.message === 'No autenticado') {
        window.location.href = '../../login.html'
        return true
    }
    return false
}

// ── Carga de datos ─────────────────────────────────────────────────────────────

const loadTrucksForSelect = async () => {
    try {
        const data = await requestJson(API_TRUCKS_URL, {
            method: "GET",
            credentials: "include",
            headers: { 'Content-type': 'application/json' }
        }, 'No se pudieron cargar los camiones')

        const trucks = Array.isArray(data.payload) ? data.payload : []
        const select = document.getElementById('truckId')
        if (!select) return

        select.textContent = ''
        const placeholder = document.createElement('option')
        placeholder.value = ''
        placeholder.textContent = 'Seleccione un camión'
        select.appendChild(placeholder)
        trucks.forEach(truck => {
            const option = document.createElement('option')
            option.value = truck.id
            option.dataset.mileage = truck.total_mileage || 0
            option.textContent = `${truck.plate_number} - ${truck.brand} ${truck.model}`
            select.appendChild(option)
        })
    } catch (error) {
        if (handleLoadError(error)) return
        console.error(error)
    }
}

const loadMaintenances = async (maintenanceTableBody, errorAlert) => {
    try {
        const data = await requestJson(API_MAINTENANCE_URL, {
            method: "GET",
            credentials: "include",
            headers: { 'Content-type': 'application/json' }
        }, 'No se pudieron cargar los mantenimientos')

        const maintenances = Array.isArray(data.payload) ? data.payload : []
        maintenancesCache = maintenances
        maintenanceTableBody.textContent = ''

        if (maintenancesCache.length === 0) {
            const tr = document.createElement('tr')
            const td = document.createElement('td')
            td.colSpan = 10
            td.className = 'text-center text-muted'
            td.textContent = 'No hay registros de mantenimiento'
            tr.appendChild(td)
            maintenanceTableBody.appendChild(tr)
            return
        }

        maintenancesCache.forEach(m => {
            const tr = document.createElement('tr')
            tr.appendChild(createCell('td', m.id))
            tr.appendChild(createCell('td', m.plate_number))
            tr.appendChild(createCell('td', `${m.maintenance_mileage} km`))
            tr.appendChild(createCell('td', `${m.last_maintenance_mileage ?? '-'} km`))
            tr.appendChild(createHtmlCell(getStatusBadge(m.truck_status || 'desconocido')))
            const typeTd = document.createElement('td')
            typeTd.className = 'text-capitalize'
            typeTd.textContent = m.type
            tr.appendChild(typeTd)
            tr.appendChild(createHtmlCell(getStatusBadge(m.status)))
            tr.appendChild(createCell('td', formatDate(m.scheduled_date)))
            tr.appendChild(createCell('td', m.description || '-'))

            const actionsTd = document.createElement('td')
            const editBtn = createActionButton('btn btn-sm btn-outline-primary me-1 edit-btn', 'edit', m.id, 'Editar', 'bi bi-pencil')
            editBtn.dataset.id = String(m.id)
            const delBtn = createActionButton('btn btn-sm btn-outline-danger delete-btn', 'delete', m.id, 'Eliminar', 'bi bi-trash')
            delBtn.dataset.id = String(m.id)
            actionsTd.appendChild(editBtn)
            actionsTd.appendChild(delBtn)
            tr.appendChild(actionsTd)

            maintenanceTableBody.appendChild(tr)
        })
    } catch (error) {
        if (handleLoadError(error)) return
        console.error(error)
        maintenanceTableBody.textContent = ''
        const tr = document.createElement('tr')
        const td = document.createElement('td')
        td.colSpan = 10
        td.className = 'text-center text-danger'
        td.textContent = `Error al cargar registros: ${error.message || ''}`
        tr.appendChild(td)
        maintenanceTableBody.appendChild(tr)
    }
}

// ── Modales ────────────────────────────────────────────────────────────────────

const openEditModal = (maintenance, maintenanceModal, errorAlert) => {
    clearAlert(errorAlert)
    errorAlert.classList.add('d-none')
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

const openDeleteModal = (id, deleteModal) => {
    maintenanceToDelete = id
    const deleteAlert = document.getElementById('deleteAlert')
    if (deleteAlert) deleteAlert.textContent = ''
    deleteModal.show()
}


document.addEventListener('DOMContentLoaded', () => {
    const maintenanceTableBody = document.getElementById('maintenanceTableBody')
    const maintenanceForm      = document.getElementById('maintenanceForm')
    const maintenanceModalEl   = document.getElementById('maintenanceModal')
    const deleteModalEl        = document.getElementById('deleteModal')
    const confirmDeleteBtn     = document.getElementById('confirmDeleteBtn')
    const errorAlert           = document.getElementById('maintenanceError')
    const btnNewMaintenance    = document.getElementById('btnNewMaintenance')
    const truckIdSelect        = document.getElementById('truckId')

    if (!maintenanceTableBody || !maintenanceModalEl || !deleteModalEl) {
        console.error('admmant.js: elementos del DOM no encontrados.')
        return
    }

    const maintenanceModal = new bootstrap.Modal(maintenanceModalEl)
    const deleteModal      = new bootstrap.Modal(deleteModalEl)

    const showError = (message) => {
        errorAlert.classList.remove('d-none')
        setAlert(errorAlert, message, 'danger', 0)
    }
    const hideError = () => {
        clearAlert(errorAlert)
        errorAlert.classList.add('d-none')
    }

    const scheduledDateInput = document.getElementById('scheduledDate');
    if (scheduledDateInput) {
        scheduledDateInput.addEventListener('click', function() {
            if (this.showPicker) {
                this.showPicker(); // Llama al popup nativo del navegador
            }
        });
    }

    // Auto-completar kilometraje al seleccionar camión
    truckIdSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex]
        const currentMileage = selectedOption.dataset.mileage
        const mileageInput = document.getElementById('maintenanceMileage')
        if (mileageInput) {
            mileageInput.value = currentMileage !== undefined ? currentMileage : ''
        }
    })

    // Delegación de eventos en la tabla
    maintenanceTableBody.addEventListener('click', (event) => {
        const editBtn = event.target.closest('.edit-btn')
        if (editBtn) {
            const m = maintenancesCache.find(mnt => mnt.id == editBtn.dataset.id)
            if (m) openEditModal(m, maintenanceModal, errorAlert)
            return
        }
        const deleteBtn = event.target.closest('.delete-btn')
        if (deleteBtn) openDeleteModal(deleteBtn.dataset.id, deleteModal)
    })

    // Abrir modal para nuevo mantenimiento
    btnNewMaintenance.addEventListener('click', () => {
        hideError()
        maintenanceForm.reset()
        document.getElementById('maintenanceId').value = ''
        document.getElementById('maintenanceModalLabel').textContent = 'Registrar Mantenimiento'
    })

    // Crear / actualizar
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
            const isEdit       = Boolean(id)
            const isStarting   = isEdit && data.status === 'en curso'
            const isCompleting = isEdit && data.status === 'completado'

            if (isCompleting) {
                const maintenanceMileage  = Number(data.maintenance_mileage)
                const currentTruckMileage = getSelectedTruckCurrentMileage()

                if (!Number.isFinite(maintenanceMileage) || maintenanceMileage < 0)
                    throw new Error('Para completar mantenimiento, el kilometraje es obligatorio y debe ser válido')

                if (!Number.isFinite(currentTruckMileage))
                    throw new Error('No se pudo obtener el kilometraje actual del camión seleccionado')

                if (maintenanceMileage !== currentTruckMileage)
                    throw new Error(`El kilometraje de cierre debe coincidir con el kilometraje actual del camión (${currentTruckMileage} km)`)
            }

            let res
            if (isStarting) {
                res = await requestJson(`${API_MAINTENANCE_URL}/${id}/start`, {
                    method: 'PUT', credentials: "include",
                    headers: { 'Content-type': 'application/json' },
                    body: JSON.stringify({ maintenance_id: Number(id) })
                }, 'Error al iniciar el mantenimiento')
            } else if (isCompleting) {
                res = await requestJson(`${API_MAINTENANCE_URL}/${id}/complete`, {
                    method: 'PUT', credentials: "include",
                    headers: { 'Content-type': 'application/json' },
                    body: JSON.stringify({
                        truck_id: Number(data.truck_id),
                        maintenance_mileage: Number(data.maintenance_mileage),
                        description: data.description
                    })
                }, 'Error al completar el mantenimiento')
            } else {
                const url    = isEdit ? `${API_MAINTENANCE_URL}/${id}` : API_MAINTENANCE_URL
                const method = isEdit ? 'PUT' : 'POST'
                res = await requestJson(url, {
                    method, credentials: "include",
                    headers: { 'Content-type': 'application/json' },
                    body: JSON.stringify(data)
                }, 'Error al guardar el mantenimiento')
            }

            if (res.status === 'success') {
                maintenanceModal.hide()
                await loadTrucksForSelect()
                await loadMaintenances(maintenanceTableBody, errorAlert)
            }
        } catch (error) {
            showError(error.message)
        }
    })

    // Confirmar eliminación
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!maintenanceToDelete) return
        confirmDeleteBtn.disabled = true
        try {
            await requestJson(`${API_MAINTENANCE_URL}/${maintenanceToDelete}`, {
                method: "DELETE", credentials: "include",
                headers: { 'Content-type': 'application/json' }
            }, 'Error al eliminar el mantenimiento')
            deleteModal.hide()
            await loadMaintenances(maintenanceTableBody, errorAlert)
        } catch (error) {
            // FIX #6: deleteAlert ahora existe en el HTML (ver admmant.view.html)
            const deleteAlert = document.getElementById('deleteAlert')
            if (deleteAlert) setAlert(deleteAlert, error.message, 'danger')
        } finally {
            maintenanceToDelete = null
            confirmDeleteBtn.disabled = false
        }
    })

    // Inicializar
    loadTrucksForSelect()
    loadMaintenances(maintenanceTableBody, errorAlert)
})
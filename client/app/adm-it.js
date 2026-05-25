import { requestJson, renderSidebar, escapeHtml, setAlert, toDateTimeLocal } from "./shared.js"

const API_BASE = "http://localhost:8000/api/ti"
const API_EQUIPMENTS_URL = `${API_BASE}/equipments`
const API_MAINTENANCES_URL = `${API_BASE}/maintenances`
const API_PARTS_URL = `${API_BASE}/parts`

export async function init() {
    renderSidebar('sidebarCol', [
        { label: 'Historial<br>de Mantenimientos', icon: 'bi bi-clock-history', target: 'historySection', active: true },
        { label: 'Inventario<br>de Piezas', icon: 'bi bi-box-seam', target: 'partsInventorySection', active: false },
        { label: 'Registrar Pieza', icon: 'bi bi-plus-square', target: 'registerPartSection', active: false },
        { label: 'Inventario<br>de Equipos', icon: 'bi bi-pc-display', target: 'equipmentsSection', active: false },
        { label: 'Registrar Equipo', icon: 'bi bi-laptop', target: 'registerEquipmentSection', active: false }
    ], 'adm_it_sidebar_collapsed')

    const historyTableBody        = document.getElementById('historyTableBody')
    const partsInventoryTableBody = document.getElementById('partsInventoryTableBody')
    
    // Part variables
    const partForm                = document.getElementById('formRegisterPart')
    const partFormTitle           = document.getElementById('partFormTitle')
    const partFormSubmit          = document.getElementById('partFormSubmit')
    const partIdInput             = document.getElementById('partId')
    const resetPartFormBtn        = document.getElementById('resetPartFormBtn')
    
    // Equipment variables
    const equipmentForm           = document.getElementById('formRegisterEquipment')
    const equipmentFormTitle      = document.getElementById('equipmentFormTitle')
    const equipmentFormSubmit     = document.getElementById('equipmentFormSubmit')
    const equipmentIdInput        = document.getElementById('equipmentId')
    const resetEquipmentFormBtn   = document.getElementById('resetEquipmentFormBtn')
    const stockModalEl            = document.getElementById('partStockModal')
    const stockModal              = stockModalEl ? new bootstrap.Modal(stockModalEl) : null
    const stockForm               = document.getElementById('formPartStockMovement')
    const btnConfirmMovement      = document.getElementById('btnConfirmMovement')
    
    const equipmentCache          = new Map()
    let editingEquipmentId = null

    const setFeedback = (message, type = 'danger', target = 'partsAlert') => {
        setAlert(document.getElementById(target), message, type, 0)
    }

    const resetPartForm = () => {
        if (!partForm) return
        partForm.reset()
        editingPartId = null
        if (partIdInput) partIdInput.value = ''
        if (partFormTitle) partFormTitle.textContent = 'Registrar Nueva Pieza'
        if (partFormSubmit) partFormSubmit.textContent = 'Registrar Pieza'
    }

    const resetEquipmentForm = () => {
        if (!equipmentForm) return
        equipmentForm.reset()
        editingEquipmentId = null
        if (equipmentIdInput) equipmentIdInput.value = ''
        if (equipmentFormTitle) equipmentFormTitle.textContent = 'Registrar Nuevo Equipo'
        if (equipmentFormSubmit) equipmentFormSubmit.textContent = 'Registrar Equipo'
    }

    if (resetPartFormBtn) resetPartFormBtn.addEventListener('click', resetPartForm)
    if (resetEquipmentFormBtn) resetEquipmentFormBtn.addEventListener('click', resetEquipmentForm)


    // ── Carga de datos ───────────────────────────────────────────────────────

    const loadEquipments = async () => {
        try {
            const response = await requestJson(API_EQUIPMENTS_URL, { credentials: 'include' }, 'No se pudieron cargar los equipos')
            const equipments = Array.isArray(response.payload) ? response.payload : []
            equipmentCache.clear()
            
            const equipmentsTableBody = document.getElementById('EquipmentsInventoryTableBody')
            if (equipmentsTableBody) {
                equipmentsTableBody.innerHTML = ''
                if (equipments.length === 0) {
                    equipmentsTableBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No hay registros de equipos.</td></tr>'
                }
            }

            equipments.forEach(eq => {
                equipmentCache.set(String(eq.id), eq)
                if (equipmentsTableBody) {
                    const row = document.createElement('tr')
                    const createdAt = eq.created_at ? new Date(eq.created_at).toLocaleDateString('es-CL') : ''
                    
                    let statusBadgeClass = 'secondary'
                    if (eq.status === 'operativo') statusBadgeClass = 'success'
                    else if (eq.status === 'en reparacion') statusBadgeClass = 'warning text-dark'
                    else if (eq.status === 'baja') statusBadgeClass = 'danger'

                    row.innerHTML = `
                        <td>${escapeHtml(eq.id)}</td>
                        <td>${escapeHtml(eq.inventory_code || '')}</td>
                        <td>${escapeHtml(eq.type || '')}</td>
                        <td>${escapeHtml(eq.brand || '')}</td>
                        <td>${escapeHtml(eq.model || '')}</td>
                        <td>${escapeHtml(eq.serial_number || '')}</td>
                        <td><span class="badge bg-${statusBadgeClass}">${escapeHtml(eq.status || '-')}</span></td>
                        <td>${escapeHtml(eq.location || '')}</td>
                        <td>${createdAt}</td>
                        <td>
                            <button type="button" class="btn btn-sm btn-outline-primary me-1" data-action="edit-equipment" data-id="${eq.id}" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-equipment" data-id="${eq.id}" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    `
                    equipmentsTableBody.appendChild(row)
                }
            })
        } catch (error) {
            console.error(error)
            const equipmentsTableBody = document.getElementById('EquipmentsInventoryTableBody')
            if (equipmentsTableBody) {
                equipmentsTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Error al cargar equipos: ${escapeHtml(error.message)}</td></tr>`
            }
        }
    }

    const loadMaintenanceHistory = async () => {
        if (!historyTableBody) return
        try {
            const response = await requestJson(API_MAINTENANCES_URL, { credentials: 'include' }, 'No se pudieron cargar los mantenimientos')
            const records  = Array.isArray(response.payload) ? response.payload : []
            historyTableBody.innerHTML = ''

            if (records.length === 0) {
                historyTableBody.innerHTML =
                    '<tr><td colspan="10" class="text-center text-muted">No hay registros de mantenimiento.</td></tr>'
                return
            }

            records.forEach(record => {
                const equipment = equipmentCache.get(String(record.equipment_id)) || {}
                const row       = document.createElement('tr')
                row.innerHTML = `
                    <td>${escapeHtml(record.id)}</td>
                    <td>${escapeHtml(equipment.inventory_code || record.equipment_id)}</td>
                    <td>${escapeHtml(equipment.model || '')}</td>
                    <td>${escapeHtml(equipment.location || '')}</td>
                    <td>${escapeHtml(record.type || '')}</td>
                    <td>${Number(record.cost || 0).toLocaleString('es-CL')}</td>
                    <td>${escapeHtml(equipment.status || '-')}</td>
                    <td>${record.intervention_date ? new Date(record.intervention_date).toLocaleString('es-CL') : '-'}</td>
                    <td>${escapeHtml(record.description || '')}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary" data-action="view-maintenance-details" data-id="${record.id}" title="Ver Detalles">
                            <i class="bi bi-eye"></i> Detalles
                        </button>
                    </td>
                `
                historyTableBody.appendChild(row)
            })
        } catch (error) {
            historyTableBody.innerHTML =
                `<tr><td colspan="10" class="text-center text-danger">Error al cargar historial: ${escapeHtml(error.message)}</td></tr>`
        }
    }

    const getPartStatus = (part) => {
        const stock    = Number(part.stock_quantity || 0)
        const critical = Number(part.critical_stock ?? part.min_stock ?? 0)
        return stock <= critical
            ? '<span class="badge bg-danger">Crítico</span>'
            : '<span class="badge bg-success">Disponible</span>'
    }

    const loadPartsInventory = async () => {
        if (!partsInventoryTableBody) return
        try {
            const response = await requestJson(API_PARTS_URL, { credentials: 'include' }, 'No se pudo cargar el inventario')
            const parts    = Array.isArray(response.payload) ? response.payload : []
            partsInventoryTableBody.innerHTML = ''

            if (parts.length === 0) {
                partsInventoryTableBody.innerHTML =
                    '<tr><td colspan="8" class="text-center text-muted">No hay registros de piezas.</td></tr>'
                return
            }

            parts.forEach(part => {
                const row = document.createElement('tr')
                row.innerHTML = `
                    <td>${escapeHtml(part.id)}</td>
                    <td>${escapeHtml(part.part_name || part.name || '')}</td>
                    <td>${escapeHtml(part.description || '')}</td>
                    <td>${Number(part.stock_quantity || 0).toLocaleString('es-CL')}</td>
                    <td>${Number(part.min_stock ?? part.critical_stock ?? 0).toLocaleString('es-CL')}</td>
                    <td>${Number(part.unit_price || 0).toLocaleString('es-CL')}</td>
                    <td>${getPartStatus(part)}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-success me-1" data-action="movement-in"  data-id="${part.id}" title="Ingreso"><i class="bi bi-plus-lg"></i></button>
                        <button type="button" class="btn btn-sm btn-warning me-1" data-action="movement-out" data-id="${part.id}" title="Salida"><i class="bi bi-dash-lg"></i></button>
                        <button type="button" class="btn btn-sm btn-outline-primary me-1" data-action="edit-part"   data-id="${part.id}" title="Editar"><i class="bi bi-pencil"></i></button>
                        <button type="button" class="btn btn-sm btn-outline-danger"        data-action="delete-part" data-id="${part.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                    </td>
                `
                partsInventoryTableBody.appendChild(row)
            })
        } catch (error) {
            partsInventoryTableBody.innerHTML =
                `<tr><td colspan="8" class="text-center text-danger">Error al cargar inventario: ${escapeHtml(error.message)}</td></tr>`
        }
    }

    // ── Modal de movimiento de stock ─────────────────────────────────────────

    const openStockModal = (partId, mode) => {
        if (!stockForm || !stockModal) return
        document.getElementById('movement_part_id').value    = String(partId)
        document.getElementById('movement_type').value       = mode === 'out' ? 'salida' : 'ingreso'
        document.getElementById('movement_quantity').value   = 1
        document.getElementById('movement_date').value       = toDateTimeLocal(new Date())
        document.getElementById('movement_notes').value      = ''
        stockModal.show()
    }

    const submitStockMovement = async () => {
        const partId       = document.getElementById('movement_part_id').value
        const movementType = document.getElementById('movement_type').value
        const quantity     = Number(document.getElementById('movement_quantity').value || 0)
        const date         = document.getElementById('movement_date').value
        const notes        = document.getElementById('movement_notes').value

        if (!partId || !Number.isFinite(quantity) || quantity <= 0) {
            throw new Error('Completa una cantidad válida')
        }

        const partRes    = await requestJson(`${API_PARTS_URL}/${partId}`, { credentials: 'include' }, 'No se pudo leer la pieza')
        const part       = partRes.payload || partRes
        const currentStock = Number(part.stock_quantity || 0)
        const newStock     = movementType === 'salida' ? currentStock - quantity : currentStock + quantity

        if (newStock < 0) throw new Error('Stock insuficiente para esta salida')

        try {
            await requestJson(`${API_PARTS_URL}/${partId}/movements`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: movementType, quantity, date, notes })
            }, 'No se pudo registrar el movimiento')
        } catch (_) { /* endpoint opcional, no bloquea */ }

        await requestJson(`${API_PARTS_URL}/${partId}`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                part_name:      part.part_name || part.name,
                description:    part.description || '',
                stock_quantity: newStock,
                min_stock:      part.min_stock ?? part.critical_stock ?? 0,
                unit_price:     part.unit_price || 0
            })
        }, 'No se pudo actualizar el stock')
    }

    // ── Eventos de la tabla de piezas y mantenimientos ────────────────────────────────────────

    if (historyTableBody) {
        historyTableBody.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-action]')
            if (!button) return
            
            const maintId = button.dataset.id
            if (button.dataset.action === 'view-maintenance-details') {
                try {
                    const response = await requestJson(`${API_MAINTENANCES_URL}/${maintId}`, { credentials: 'include' }, 'No se pudo cargar el mantenimiento')
                    const details = response.payload
                    
                    const modalEl = document.getElementById('maintenanceDetailsModal')
                    const modalBody = document.getElementById('maintenanceDetailsBody')
                    
                    if (modalEl && modalBody && details) {
                        let partsHtml = '<p class="text-muted">No se utilizaron piezas en este mantenimiento.</p>'
                        if (details.parts && details.parts.length > 0) {
                            partsHtml = `
                                <ul>
                                    ${details.parts.map(p => `<li><strong>${escapeHtml(p.part_name)}:</strong> ${p.quantity_used} unidad(es)</li>`).join('')}
                                </ul>
                            `
                        }
                        
                        modalBody.innerHTML = `
                            <hr>
                            <h2>Descripción</h2>
                            <p>${escapeHtml(details.description || 'Sin descripción')}</p>
                            <hr>
                            <h2>Piezas implementadas</h2>
                            ${partsHtml}
                        `
                        
                        const modal = new bootstrap.Modal(modalEl)
                        modal.show()
                    }
                } catch (error) {
                    setFeedback('Error al cargar detalles del mantenimiento: ' + error.message, 'danger', 'partsAlert')
                }
            }
        })
    }

    if (partsInventoryTableBody) {
        partsInventoryTableBody.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-action]')
            if (!button) return
            const partId = button.dataset.id

            if (button.dataset.action === 'movement-in') { openStockModal(partId, 'in'); return }
            if (button.dataset.action === 'movement-out') { openStockModal(partId, 'out'); return }

            if (button.dataset.action === 'delete-part') {
                if (!confirm('¿Eliminar esta pieza? Esta acción no se puede deshacer.')) return
                await requestJson(`${API_PARTS_URL}/${partId}`, { method: 'DELETE', credentials: 'include' }, 'No se pudo eliminar la pieza')
                setFeedback('Pieza eliminada.', 'success')
                await loadPartsInventory()
                return
            }

            if (button.dataset.action === 'edit-part') {
                const response = await requestJson(`${API_PARTS_URL}/${partId}`, { credentials: 'include' }, 'No se pudo cargar la pieza')
                const part     = response.payload || response
                editingPartId  = partId
                if (partIdInput)    partIdInput.value    = String(partId)
                if (partFormTitle)  partFormTitle.textContent  = 'Editar Pieza'
                if (partFormSubmit) partFormSubmit.textContent = 'Actualizar Pieza'
                document.getElementById('part_name').value        = part.part_name || part.name || ''
                document.getElementById('part_description').value = part.description || ''
                document.getElementById('stock_quantity').value   = part.stock_quantity ?? 0
                document.getElementById('critical_stock').value   = part.min_stock ?? part.critical_stock ?? 0
                document.getElementById('unit_price').value       = part.unit_price ?? 0
                document.querySelector('[data-section-target="registerPartSection"]')?.click()
            }
        })
    }

    // ── Formulario de registro/edición de pieza y equipo ──────────────────────────────

    if (partForm) {
        partForm.addEventListener('submit', async (event) => {
            event.preventDefault()
            const formData = new FormData(partForm)
            const data     = Object.fromEntries(formData.entries())
            const payload  = {
                part_name:      data.part_name,
                description:    data.description || '',
                stock_quantity: Number(data.stock_quantity || 0),
                min_stock:      Number(data.critical_stock || 0),
                unit_price:     Number(data.unit_price || 0)
            }

            const isEditing = Boolean(editingPartId)
            const url       = isEditing ? `${API_PARTS_URL}/${editingPartId}` : API_PARTS_URL
            const method    = isEditing ? 'PUT' : 'POST'

            try {
                await requestJson(url, {
                    method, credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }, isEditing ? 'No se pudo actualizar la pieza' : 'No se pudo registrar la pieza')

                setFeedback(
                    isEditing ? 'Pieza actualizada.' : 'Pieza registrada correctamente.',
                    'success',
                    'responseAlertPart'
                )
                resetPartForm()
                await loadPartsInventory()
            } catch (error) {
                setFeedback(error.message, 'danger', 'responseAlertPart')
            }
        })
    }

    if (equipmentForm) {
        equipmentForm.addEventListener('submit', async (event) => {
            event.preventDefault()
            const formData = new FormData(equipmentForm)
            const data     = Object.fromEntries(formData.entries())

            const payload  = {
                inventory_code: data.inventory_code,
                type:           data.type,
                brand:          data.brand,
                model:          data.model,
                serial_number:  data.serial_number,
                location:       data.location || '',
                status:         data.status || 'operativo'
            }

            const isEditing = Boolean(editingEquipmentId)
            const url       = isEditing ? `${API_EQUIPMENTS_URL}/${editingEquipmentId}` : API_EQUIPMENTS_URL
            const method    = isEditing ? 'PUT' : 'POST'

            try {
                // Mantenemos la lógica de la API
                await requestJson(url, {
                    method, credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }, isEditing ? 'No se pudo actualizar el equipo' : 'No se pudo registrar el equipo')

                setFeedback(
                    isEditing ? 'Equipo actualizado.' : 'Equipo registrado correctamente.',
                    'success',
                    'responseAlertAddEquipment'
                )
                resetEquipmentForm()
                await loadEquipments()
            } catch (error) {
                setFeedback(error.message, 'danger', 'responseAlertAddEquipment')
            }
        })
    }

    if (btnConfirmMovement) {
        btnConfirmMovement.addEventListener('click', async () => {
            try {
                btnConfirmMovement.disabled = true
                await submitStockMovement()
                stockModal?.hide()
                setFeedback('Movimiento registrado y stock actualizado.', 'success')
                await loadPartsInventory()
            } catch (error) {
                setFeedback(error.message, 'danger')
            } finally {
                btnConfirmMovement.disabled = false
            }
        })
    }

    const btnNewPartSidebar = document.getElementById('btnNewPartSidebar')
    if (btnNewPartSidebar) {
        btnNewPartSidebar.addEventListener('click', () => {
            resetPartForm()
            document.querySelector('[data-section-target="registerPartSection"]')?.click()
        })
    }

    const equipmentsTableBody = document.getElementById('EquipmentsInventoryTableBody')
    if (equipmentsTableBody) {
        equipmentsTableBody.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-action]')
            if (!button) return
            
            const eqId = button.dataset.id
            if (button.dataset.action === 'delete-equipment') {
                if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return
                try {
                    await requestJson(`${API_EQUIPMENTS_URL}/${eqId}`, { method: 'DELETE', credentials: 'include' }, 'No se pudo eliminar el equipo')
                    setFeedback('Equipo eliminado.', 'success', 'equipmentsAlert')
                    await loadEquipments()
                } catch (error) {
                    setFeedback(error.message, 'danger', 'equipmentsAlert')
                }
            } else if (button.dataset.action === 'edit-equipment') {
                try {
                    const response = await requestJson(`${API_EQUIPMENTS_URL}/${eqId}`, { credentials: 'include' }, 'No se pudo cargar el equipo')
                    const eq = response.payload || response
                    editingEquipmentId = eqId
                    
                    if (equipmentIdInput) equipmentIdInput.value = String(eqId)
                    if (equipmentFormTitle) equipmentFormTitle.innerHTML = '<i class="bi bi-pencil-square"></i> Editar Equipo'
                    if (equipmentFormSubmit) equipmentFormSubmit.textContent = 'Actualizar Equipo'
                    
                    document.getElementById('inventory_code').value = eq.inventory_code || ''
                    document.getElementById('eq_type').value = eq.type || 'PC'
                    document.getElementById('equipmentBrand').value = eq.brand || ''
                    document.getElementById('equipmentModel').value = eq.model || ''
                    document.getElementById('equipmentSerialNumber').value = eq.serial_number || ''
                    document.getElementById('equipmentLocation').value = eq.location || ''
                    document.getElementById('equipmentStatus').value = eq.status || 'operativo'
                    
                    // Switch to the form view
                    document.querySelector('[data-section-target="registerEquipmentSection"]')?.click()
                } catch (error) {
                    setFeedback(error.message, 'danger', 'equipmentsAlert')
                }
            }
        })
    }

    await loadEquipments()
    await loadMaintenanceHistory()
    await loadPartsInventory()
}

document.addEventListener('DOMContentLoaded', init)

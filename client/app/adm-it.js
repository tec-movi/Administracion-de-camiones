import { requestJson, renderSidebar, escapeHtml, setAlert, toDateTimeLocal } from "./shared.js"

const API_BASE = "http://localhost:8000/api/ti"
const API_EQUIPMENTS_URL = `${API_BASE}/equipments`
const API_MAINTENANCES_URL = `${API_BASE}/maintenances`
const API_PARTS_URL = `${API_BASE}/parts`

export async function init() {
    renderSidebar('sidebarCol', [
        { label: 'Historial<br>de Mantenimientos', icon: 'bi bi-clock-history', target: 'historySection', active: true },
        { label: 'Inventario de<br>Piezas', icon: 'bi bi-box-seam', target: 'partsInventorySection', active: false },
        { label: 'Registrar Pieza', icon: 'bi bi-plus-square', target: 'registerPartSection', active: false }
    ], 'adm_it_sidebar_collapsed')

    const historyTableBody = document.getElementById('historyTableBody')
    const partsInventoryTableBody = document.getElementById('partsInventoryTableBody')
    const partAlert = document.getElementById('partsAlert')
    const partForm = document.getElementById('formRegisterPart')
    const partFormTitle = document.getElementById('partFormTitle')
    const partFormSubmit = document.getElementById('partFormSubmit')
    const partIdInput = document.getElementById('partId')
    const resetPartFormBtn = document.getElementById('resetPartFormBtn')
    const stockModalEl = document.getElementById('partStockModal')
    const stockModal = stockModalEl ? new bootstrap.Modal(stockModalEl) : null
    const stockForm = document.getElementById('formPartStockMovement')
    const equipmentCache = new Map()
    let editingPartId = null

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

    if (resetPartFormBtn) {
        resetPartFormBtn.addEventListener('click', resetPartForm)
    }

    const loadEquipments = async () => {
        try {
            const response = await requestJson(API_EQUIPMENTS_URL, { credentials: 'include' }, 'No se pudieron cargar los equipos')
            const equipments = Array.isArray(response.payload) ? response.payload : []
            equipmentCache.clear()
            equipments.forEach((equipment) => {
                equipmentCache.set(String(equipment.id), equipment)
            })
        } catch (error) {
            console.error(error)
        }
    }

    const loadMaintenanceHistory = async () => {
        if (!historyTableBody) return
        try {
            const response = await requestJson(API_MAINTENANCES_URL, { credentials: 'include' }, 'No se pudieron cargar los mantenimientos')
            const records = Array.isArray(response.payload) ? response.payload : []
            historyTableBody.innerHTML = ''

            if (records.length === 0) {
                historyTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay registros de mantenimiento.</td></tr>'
                return
            }

            records.forEach((record) => {
                const equipment = equipmentCache.get(String(record.equipment_id)) || {}
                const row = document.createElement('tr')
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
                `
                historyTableBody.appendChild(row)
            })
        } catch (error) {
            if (historyTableBody) {
                historyTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Error al cargar historial: ${escapeHtml(error.message)}</td></tr>`
            }
        }
    }

    const getPartStatus = (part) => {
        const stock = Number(part.stock_quantity || 0)
        const critical = Number(part.critical_stock ?? part.min_stock ?? 0)
        return stock <= critical
            ? '<span class="badge bg-danger">Crítico</span>'
            : '<span class="badge bg-success">Disponible</span>'
    }

    const loadPartsInventory = async () => {
        if (!partsInventoryTableBody) return
        try {
            const response = await requestJson(API_PARTS_URL, { credentials: 'include' }, 'No se pudo cargar el inventario')
            const parts = Array.isArray(response.payload) ? response.payload : []
            partsInventoryTableBody.innerHTML = ''

            if (parts.length === 0) {
                partsInventoryTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay registros de piezas.</td></tr>'
                return
            }

            parts.forEach((part) => {
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
                        <button type="button" class="btn btn-sm btn-success me-1" data-action="movement-in" data-id="${part.id}" title="Registrar ingreso"><i class="bi bi-plus-lg"></i></button>
                        <button type="button" class="btn btn-sm btn-warning me-1" data-action="movement-out" data-id="${part.id}" title="Registrar salida"><i class="bi bi-dash-lg"></i></button>
                        <button type="button" class="btn btn-sm btn-outline-primary me-1" data-action="edit-part" data-id="${part.id}" title="Editar"><i class="bi bi-pencil"></i></button>
                        <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-part" data-id="${part.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                    </td>
                `
                partsInventoryTableBody.appendChild(row)
            })
        } catch (error) {
            if (partsInventoryTableBody) {
                partsInventoryTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error al cargar inventario: ${escapeHtml(error.message)}</td></tr>`
            }
        }
    }

    const openStockModal = (partId, mode) => {
        if (!stockForm || !stockModal) return
        document.getElementById('movement_part_id').value = String(partId)
        document.getElementById('movement_type').value = mode === 'out' ? 'salida' : 'ingreso'
        document.getElementById('movement_quantity').value = 1
        document.getElementById('movement_date').value = toDateTimeLocal(new Date())
        document.getElementById('movement_notes').value = ''
        stockModal.show()
    }

    const submitStockMovement = async () => {
        const partId = document.getElementById('movement_part_id').value
        const movementType = document.getElementById('movement_type').value
        const quantity = Number(document.getElementById('movement_quantity').value || 0)
        const date = document.getElementById('movement_date').value
        const notes = document.getElementById('movement_notes').value

        if (!partId || !Number.isFinite(quantity) || quantity <= 0) {
            throw new Error('Completa una cantidad válida')
        }

        const partRes = await requestJson(`${API_PARTS_URL}/${partId}`, { credentials: 'include' }, 'No se pudo leer la pieza')
        const part = partRes.payload || partRes
        const currentStock = Number(part.stock_quantity || 0)
        const newStock = movementType === 'salida' ? currentStock - quantity : currentStock + quantity

        if (newStock < 0) {
            throw new Error('Stock insuficiente para esta salida')
        }

        try {
            await requestJson(`${API_PARTS_URL}/${partId}/movements`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: movementType, quantity, date, notes })
            }, 'No se pudo registrar el movimiento')
        } catch (error) {
            console.warn(error)
        }

        await requestJson(`${API_PARTS_URL}/${partId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                part_name: part.part_name || part.name,
                description: part.description || '',
                stock_quantity: newStock,
                min_stock: part.min_stock ?? part.critical_stock ?? 0,
                unit_price: part.unit_price || 0
            })
        }, 'No se pudo actualizar el stock')
    }

    if (partsInventoryTableBody) {
        partsInventoryTableBody.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-action]')
            if (!button) return

            const partId = button.dataset.id

            if (button.dataset.action === 'movement-in') {
                openStockModal(partId, 'in')
                return
            }

            if (button.dataset.action === 'movement-out') {
                openStockModal(partId, 'out')
                return
            }

            if (button.dataset.action === 'delete-part') {
                if (!confirm('¿Eliminar esta pieza? Esta acción no se puede deshacer.')) return
                await requestJson(`${API_PARTS_URL}/${partId}`, { method: 'DELETE', credentials: 'include' }, 'No se pudo eliminar la pieza')
                setFeedback('Pieza eliminada.', 'success')
                await loadPartsInventory()
                return
            }

            if (button.dataset.action === 'edit-part') {
                const response = await requestJson(`${API_PARTS_URL}/${partId}`, { credentials: 'include' }, 'No se pudo cargar la pieza')
                const part = response.payload || response
                editingPartId = partId
                if (partIdInput) partIdInput.value = String(partId)
                if (partFormTitle) partFormTitle.textContent = 'Editar Pieza'
                if (partFormSubmit) partFormSubmit.textContent = 'Actualizar Pieza'
                document.getElementById('part_name').value = part.part_name || part.name || ''
                document.getElementById('part_description').value = part.description || ''
                document.getElementById('stock_quantity').value = part.stock_quantity ?? 0
                document.getElementById('critical_stock').value = part.min_stock ?? part.critical_stock ?? 0
                document.getElementById('unit_price').value = part.unit_price ?? 0
                document.querySelector('[data-section-target="registerPartSection"]')?.click()
            }
        })
    }

    if (partForm) {
        partForm.addEventListener('submit', async (event) => {
            event.preventDefault()
            const formData = new FormData(partForm)
            const data = Object.fromEntries(formData.entries())
            const payload = {
                part_name: data.part_name,
                description: data.description || '',
                stock_quantity: Number(data.stock_quantity || 0),
                min_stock: Number(data.critical_stock || 0),
                unit_price: Number(data.unit_price || 0)
            }

            const isEditing = Boolean(editingPartId)
            const url = isEditing ? `${API_PARTS_URL}/${editingPartId}` : API_PARTS_URL
            const method = isEditing ? 'PUT' : 'POST'

            await requestJson(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, isEditing ? 'No se pudo actualizar la pieza' : 'No se pudo registrar la pieza')

            setFeedback(isEditing ? 'Pieza actualizada.' : 'Pieza registrada correctamente.', 'success', 'responseAlertPart')
            resetPartForm()
            await loadPartsInventory()
        })
    }

    if (stockForm) {
        stockForm.addEventListener('submit', async (event) => {
            event.preventDefault()
            await submitStockMovement()
            stockModal?.hide()
            setFeedback('Movimiento registrado y stock actualizado.', 'success')
            await loadPartsInventory()
        })
    }

    const btnNewPartSidebar = document.getElementById('btnNewPartSidebar')
    if (btnNewPartSidebar) {
        btnNewPartSidebar.addEventListener('click', () => {
            resetPartForm()
            document.querySelector('[data-section-target="registerPartSection"]')?.click()
        })
    }

    await loadEquipments()
    await loadMaintenanceHistory()
    await loadPartsInventory()
}

document.addEventListener('DOMContentLoaded', init)
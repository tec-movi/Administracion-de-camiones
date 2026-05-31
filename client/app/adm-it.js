import { requestJson, renderSidebar, escapeHtml, setAlert, toDateTimeLocal, API_TI_BASE, createCell, createHtmlCell, createActionButton } from "./shared.js"

const API_BASE = API_TI_BASE
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
    let editingPartId = null

    // Reutilizamos helpers seguros desde shared.js: createCell, createHtmlCell, createActionButton

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
                // clear body safely
                equipmentsTableBody.textContent = ''
                if (equipments.length === 0) {
                    const tr = document.createElement('tr')
                    const td = document.createElement('td')
                    td.colSpan = 10
                    td.className = 'text-center text-muted'
                    td.textContent = 'No hay registros de equipos.'
                    tr.appendChild(td)
                    equipmentsTableBody.appendChild(tr)
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

                    row.appendChild(createCell('td', eq.id))
                    row.appendChild(createCell('td', eq.inventory_code || ''))
                    row.appendChild(createCell('td', eq.type || ''))
                    row.appendChild(createCell('td', eq.brand || ''))
                    row.appendChild(createCell('td', eq.model || ''))
                    row.appendChild(createCell('td', eq.serial_number || ''))
                    row.appendChild(createHtmlCell(`<span class="badge bg-${statusBadgeClass}">${escapeHtml(eq.status || '-')}</span>`))
                    row.appendChild(createCell('td', eq.location || ''))
                    row.appendChild(createCell('td', createdAt))

                    const actionsTd = document.createElement('td')
                    const btnEditEq = createActionButton('btn btn-sm btn-outline-primary me-1', 'edit-equipment', eq.id, 'Editar', 'bi bi-pencil')
                    const btnDeleteEq = createActionButton('btn btn-sm btn-outline-danger', 'delete-equipment', eq.id, 'Eliminar', 'bi bi-trash')
                    actionsTd.appendChild(btnEditEq)
                    actionsTd.appendChild(btnDeleteEq)
                    row.appendChild(actionsTd)
                    equipmentsTableBody.appendChild(row)
                }
            })
        } catch (error) {
            console.error(error)
            const equipmentsTableBody = document.getElementById('EquipmentsInventoryTableBody')
            if (equipmentsTableBody) {
                const tr = document.createElement('tr')
                const td = document.createElement('td')
                td.colSpan = 10
                td.className = 'text-center text-danger'
                td.textContent = `Error al cargar equipos: ${error.message || ''}`
                tr.appendChild(td)
                // clear history safely
                historyTableBody.textContent = ''
                equipmentsTableBody.appendChild(tr)
            }
        }
    }

    const loadMaintenanceHistory = async () => {
        if (!historyTableBody) return
        try {
            const response = await requestJson(API_MAINTENANCES_URL, { credentials: 'include' }, 'No se pudieron cargar los mantenimientos')
            const records  = Array.isArray(response.payload) ? response.payload : []
            // clear history safely
            historyTableBody.textContent = ''

            if (records.length === 0) {
                const tr = document.createElement('tr')
                const td = document.createElement('td')
                td.colSpan = 10
                td.className = 'text-center text-muted'
                td.textContent = 'No hay registros de mantenimiento.'
                tr.appendChild(td)
                historyTableBody.appendChild(tr)
                return
            }

            records.forEach(record => {
                const equipment = equipmentCache.get(String(record.equipment_id)) || {}
                const row       = document.createElement('tr')
                row.appendChild(createCell('td', record.id))
                row.appendChild(createCell('td', equipment.inventory_code || record.equipment_id))
                row.appendChild(createCell('td', equipment.model || ''))
                row.appendChild(createCell('td', equipment.location || ''))
                row.appendChild(createCell('td', record.type || ''))
                row.appendChild(createCell('td', Number(record.cost || 0).toLocaleString('es-CL')))
                row.appendChild(createHtmlCell(escapeHtml(equipment.status || '-')))
                row.appendChild(createCell('td', record.intervention_date ? new Date(record.intervention_date).toLocaleDateString('es-CL') : '-'))
                row.appendChild(createCell('td', record.description || ''))

                const actionsTd = document.createElement('td')
                const btnView = createActionButton('btn btn-sm btn-outline-primary', 'view-maintenance-details', record.id, 'Ver Detalles', 'bi bi-eye')
                btnView.appendChild(document.createTextNode(' Detalles'))
                actionsTd.appendChild(btnView)
                row.appendChild(actionsTd)

                historyTableBody.appendChild(row)
            })
        } catch (error) {
            const tr = document.createElement('tr')
            const td = document.createElement('td')
            td.colSpan = 10
            td.className = 'text-center text-danger'
            td.textContent = `Error al cargar historial: ${error.message || ''}`
            tr.appendChild(td)
            historyTableBody.textContent = ''
            historyTableBody.appendChild(tr)
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
            // limpiar cuerpo
            partsInventoryTableBody.textContent = ''

            if (parts.length === 0) {
                const tr = document.createElement('tr')
                const td = document.createElement('td')
                td.colSpan = 8
                td.className = 'text-center text-muted'
                td.textContent = 'No hay registros de piezas.'
                tr.appendChild(td)
                partsInventoryTableBody.appendChild(tr)
                return
            }

            parts.forEach(part => {
                const row = document.createElement('tr')
                row.appendChild(createCell('td', part.id))
                row.appendChild(createCell('td', part.part_name || part.name || ''))
                row.appendChild(createCell('td', part.description || ''))
                row.appendChild(createCell('td', Number(part.stock_quantity || 0).toLocaleString('es-CL')))
                row.appendChild(createCell('td', Number(part.min_stock ?? part.critical_stock ?? 0).toLocaleString('es-CL')))
                row.appendChild(createCell('td', Number(part.unit_price || 0).toLocaleString('es-CL')))
                // Badge (HTML controlado)
                row.appendChild(createHtmlCell(getPartStatus(part)))

                const actionsTd = document.createElement('td')
                const btnIn = createActionButton('btn btn-sm btn-success me-1', 'movement-in', part.id, 'Ingreso', 'bi bi-plus-lg')
                const btnOut = createActionButton('btn btn-sm btn-warning me-1', 'movement-out', part.id, 'Salida', 'bi bi-dash-lg')
                const btnEdit = createActionButton('btn btn-sm btn-outline-primary me-1', 'edit-part', part.id, 'Editar', 'bi bi-pencil')
                const btnDelete = createActionButton('btn btn-sm btn-outline-danger', 'delete-part', part.id, 'Eliminar', 'bi bi-trash')
                actionsTd.appendChild(btnIn)
                actionsTd.appendChild(btnOut)
                actionsTd.appendChild(btnEdit)
                actionsTd.appendChild(btnDelete)
                row.appendChild(actionsTd)

                partsInventoryTableBody.appendChild(row)
            })
        } catch (error) {
            const tr = document.createElement('tr')
            const td = document.createElement('td')
            td.colSpan = 8
            td.className = 'text-center text-danger'
            td.textContent = `Error al cargar inventario: ${error.message || ''}`
            tr.appendChild(td)
            partsInventoryTableBody.textContent = ''
            partsInventoryTableBody.appendChild(tr)
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
                        // build modal content with safe DOM operations
                        // clear existing content
                        modalBody.textContent = ''

                        const hr1 = document.createElement('hr')
                        modalBody.appendChild(hr1)

                        const hDesc = document.createElement('h2')
                        hDesc.textContent = 'Descripción'
                        modalBody.appendChild(hDesc)

                        const pDesc = document.createElement('p')
                        pDesc.textContent = details.description || 'Sin descripción'
                        modalBody.appendChild(pDesc)

                        const hr2 = document.createElement('hr')
                        modalBody.appendChild(hr2)

                        const hParts = document.createElement('h2')
                        hParts.textContent = 'Piezas implementadas'
                        modalBody.appendChild(hParts)

                        if (details.parts && details.parts.length > 0) {
                            const ul = document.createElement('ul')
                            details.parts.forEach(p => {
                                const li = document.createElement('li')
                                const strong = document.createElement('strong')
                                strong.textContent = (p.part_name || '') + ':'
                                li.appendChild(strong)
                                li.appendChild(document.createTextNode(' ' + (p.quantity_used ?? 0) + ' unidad(es)'))
                                ul.appendChild(li)
                            })
                            modalBody.appendChild(ul)
                        } else {
                            const none = document.createElement('p')
                            none.className = 'text-muted'
                            none.textContent = 'No se utilizaron piezas en este mantenimiento.'
                            modalBody.appendChild(none)
                        }

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
                // Mostrar la sección de edición de pieza
                document.querySelectorAll('.adm-section').forEach(section => {
                    section.classList.toggle('d-none', section.id !== 'registerPartSection')
                })
                document.querySelectorAll('.adm-sidebar-link').forEach(link => {
                    link.classList.toggle('active', link.dataset.sectionTarget === 'registerPartSection')
                })
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
    console.log('btnNewPartSidebar:', btnNewPartSidebar)
    if (btnNewPartSidebar) {
        btnNewPartSidebar.addEventListener('click', (e) => {
            console.log('Click en agregar pieza', e)
            e.preventDefault()
            e.stopPropagation()
            resetPartForm()
            // Mostrar la sección de registro de pieza
            const sections = document.querySelectorAll('.adm-section')
            console.log('Secciones encontradas:', sections.length)
            sections.forEach(section => {
                const shouldShow = section.id === 'registerPartSection'
                console.log(`Sección ${section.id}: ${shouldShow ? 'mostrar' : 'ocultar'}`)
                section.classList.toggle('d-none', !shouldShow)
            })
            // Marcar el link del sidebar como activo
            const links = document.querySelectorAll('.adm-sidebar-link')
            console.log('Links encontrados:', links.length)
            links.forEach(link => {
                const isActive = link.dataset.sectionTarget === 'registerPartSection'
                console.log(`Link ${link.dataset.sectionTarget}: ${isActive ? 'activo' : 'inactivo'}`)
                link.classList.toggle('active', isActive)
            })
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
                    if (equipmentFormTitle) {
                        // set icon + text safely
                        equipmentFormTitle.textContent = ''
                        const icon = document.createElement('i')
                        icon.className = 'bi bi-pencil-square'
                        icon.setAttribute('aria-hidden', 'true')
                        equipmentFormTitle.appendChild(icon)
                        equipmentFormTitle.appendChild(document.createTextNode(' Editar Equipo'))
                    }
                    if (equipmentFormSubmit) equipmentFormSubmit.textContent = 'Actualizar Equipo'
                    
                    document.getElementById('inventory_code').value = eq.inventory_code || ''
                    document.getElementById('eq_type').value = eq.type || 'PC'
                    document.getElementById('equipmentBrand').value = eq.brand || ''
                    document.getElementById('equipmentModel').value = eq.model || ''
                    document.getElementById('equipmentSerialNumber').value = eq.serial_number || ''
                    document.getElementById('equipmentLocation').value = eq.location || ''
                    document.getElementById('equipmentStatus').value = eq.status || 'operativo'
                    
                    // Mostrar la sección de edición de equipo
                    document.querySelectorAll('.adm-section').forEach(section => {
                        section.classList.toggle('d-none', section.id !== 'registerEquipmentSection')
                    })
                    document.querySelectorAll('.adm-sidebar-link').forEach(link => {
                        link.classList.toggle('active', link.dataset.sectionTarget === 'registerEquipmentSection')
                    })
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

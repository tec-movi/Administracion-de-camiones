import { requestJson, renderSidebar, escapeHtml, setAlert, toDateTimeLocal, API_TI_BASE, createCell, createActionButton, createHtmlCell } from './shared.js';

const API_BASE = API_TI_BASE

export async function init() {
    try {
        console.log("Módulo de Mantenimiento IT inicializado");

        renderSidebar('sidebarCol', [
            { label: 'Registrar Mantenimiento',       icon: 'bi bi-tools',                    target: 'registerItMaintenanceSection', active: true  },
            { label: 'Agregar Equipos',               icon: 'bi bi-plus-square',              target: 'addEquipmentSection',          active: false },
            { label: 'Añadir nuevo Software',         icon: 'bi bi-folder-plus',              target: 'addSoftwareSection',           active: false },
            { label: 'Implementación<br>de Software', icon: 'bi bi-file-earmark-arrow-down',  target: 'installSoftwareSection',       active: false },
            { label: 'Historial<br>de Software',      icon: 'bi bi-clock-history',            target: 'historySoftwareSection',       active: false }
        ], 'it_sidebar_collapsed');

        const form                  = document.getElementById('formItMaintenance');
        const selectEquipment       = document.getElementById('equipment_id');
        const selectInstallEquipment = document.getElementById('install_equipment_id');
        const selectInstallSoftware  = document.getElementById('install_software_id');
        const alertContainer        = document.getElementById('responseAlert');
        let equipmentsCache = [];
        
        let partsCache = [];
        let addedParts = [];
        const partSelect = document.getElementById('part_select');
        const btnAddPart = document.getElementById('btnAddPart');
        const partsAddedBody = document.getElementById('partsAddedBody');

        // Renderiza la tabla de partes agregadas en el form de Mantenimiento
        function renderAddedParts() {
                if (addedParts.length === 0) {
                    partsAddedBody.textContent = ''
                    const tr = document.createElement('tr')
                    const td = document.createElement('td')
                    td.colSpan = 3
                    td.className = 'text-center text-muted'
                    td.textContent = 'Aún no se han añadido piezas a este mantenimiento.'
                    tr.appendChild(td)
                    partsAddedBody.appendChild(tr)
                    return
                }
                partsAddedBody.textContent = '';
                addedParts.forEach((item, index) => {
                    const tr = document.createElement('tr');
                    tr.appendChild(createCell('td', item.part_name))
                    tr.appendChild(createCell('td', item.quantity_used))
                    const actionsTd = document.createElement('td')
                    const btn = createActionButton('btn btn-sm btn-outline-danger shadow-sm js-remove-part', null, null, null, 'bi bi-trash')
                    btn.dataset.index = String(index)
                    actionsTd.appendChild(btn)
                    tr.appendChild(actionsTd)
                    partsAddedBody.appendChild(tr);
                });

            // Re-asignar eventos de eliminar
            document.querySelectorAll('.js-remove-part').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = Number(e.currentTarget.dataset.index);
                    addedParts.splice(idx, 1);
                    renderAddedParts();
                });
            });
        }

        // ── Formulario: Registrar Mantenimiento ────────────────────────────
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                // Agregamos las partes seleccionadas al request
                data.parts = addedParts.map(p => ({
                    part_id: Number(p.part_id),
                    quantity_used: Number(p.quantity_used)
                }));

                try {
                    const response = await requestJson(`${API_BASE}/maintenances`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',    // FIX #9: faltaba credentials
                        body: JSON.stringify(data)
                    });

                    if (response) {
                        setAlert(alertContainer, 'Registro de mantenimiento guardado correctamente.', 'success');
                        form.reset();
                        addedParts = [];
                        renderAddedParts();
                        await loadEquipments();
                        await loadParts();
                    }
                } catch (error) {
                    setAlert(alertContainer, 'No se pudo guardar el registro: ' + error.message, 'danger');
                }
            });
        }

        // Handler para agregar pieza al listado local (preventivo previo al Submit)
        if (btnAddPart && partSelect) {
            btnAddPart.addEventListener('click', () => {
                const partId = partSelect.value;
                const qtyInput = document.getElementById('part_quantity');
                const quantity = Number(qtyInput.value);

                if (!partId || quantity <= 0) {
                    setAlert(alertContainer, 'Selecciona una pieza y una cantidad válida mayor a 0.', 'warning');
                    return;
                }

                const partObj = partsCache.find(p => String(p.id) === String(partId));
                if (!partObj) return;

                // Ver si ya fue añadida para actualizar cantidad
                const existing = addedParts.find(p => String(p.part_id) === String(partId));
                if (existing) {
                    existing.quantity_used += quantity;
                } else {
                    addedParts.push({
                        part_id: partObj.id,
                        part_name: partObj.part_name,
                        quantity_used: quantity
                    });
                }
                
                qtyInput.value = 1;
                partSelect.value = "";
                renderAddedParts();
            });
        }

        // ── Carga de piezas (Parts) ──────────────────────────────────
        async function loadParts() {
            try {
                const res = await requestJson(`${API_BASE}/parts`, { credentials: 'include' });
                partsCache = res.payload || [];
                if (partSelect) {
                    // populate part select safely
                    partSelect.textContent = ''
                    const placeholder = document.createElement('option')
                    placeholder.value = ''
                    placeholder.selected = true
                    placeholder.disabled = true
                    placeholder.textContent = 'Seleccione una pieza...'
                    partSelect.appendChild(placeholder)
                    partsCache.forEach(part => {
                        const opt = document.createElement('option')
                        opt.value = part.id
                        opt.textContent = part.part_name || part.name || String(part.id)
                        partSelect.appendChild(opt)
                    })
                }
                // parts select populated above
            } catch (error) {
                showFeedback('Error al cargar piezas: ' + error.message, 'danger', 'responseAlert');
            }
        }

        // Inicializar carga de piezas si el select existe
        if (partSelect) await loadParts();

        // ── Carga de equipos (compartida) ──────────────────────────────────
        async function loadEquipments() {
            try {
                const res = await requestJson(`${API_BASE}/equipments`, {
                    credentials: 'include'    // FIX #9: faltaba credentials
                });
                const equipments = res.payload || res;
                equipmentsCache = Array.isArray(equipments) ? equipments : [];

                if (selectEquipment) {
                    selectEquipment.textContent = ''
                    const placeholder = document.createElement('option')
                    placeholder.value = ''
                    placeholder.selected = true
                    placeholder.disabled = true
                    placeholder.textContent = 'Seleccione un equipo...'
                    selectEquipment.appendChild(placeholder)
                    equipmentsCache.forEach(eq => {
                        const opt = document.createElement('option');
                        opt.value = eq.id;
                        opt.textContent = `[${eq.inventory_code}] ${eq.model} - ${eq.type}`;
                        selectEquipment.appendChild(opt);
                    });
                }

                if (selectInstallEquipment) {
                    selectInstallEquipment.textContent = ''
                    const placeholder = document.createElement('option')
                    placeholder.value = ''
                    placeholder.selected = true
                    placeholder.disabled = true
                    placeholder.textContent = 'Seleccione un equipo...'
                    selectInstallEquipment.appendChild(placeholder)
                    equipmentsCache.forEach(eq => {
                        const opt = document.createElement('option');
                        opt.value = eq.id;
                        opt.textContent = `[${eq.inventory_code}] ${eq.model} - ${eq.type}`;
                        selectInstallEquipment.appendChild(opt);
                    });
                }
            } catch (error) {
                showFeedback('Error al cargar equipos: ' + error.message, 'danger', 'responseAlert');
            }
        }

        if (selectEquipment) await loadEquipments();

        // ── Formulario: Añadir Software al catálogo ────────────────────────
        const formAddSoftware = document.getElementById('formAddSoftware');
        if (formAddSoftware) {
            formAddSoftware.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formAddSoftware);
                const data = Object.fromEntries(formData.entries());
                if (!data.expiration_date) delete data.expiration_date;

                try {
                    const response = await requestJson(`${API_BASE}/software`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(data)
                    });

                    if (response && response.status === 'success') {
                        showFeedback('Software añadido al catálogo correctamente.', 'success', 'responseAlertSoftware');
                        formAddSoftware.reset();
                        await loadSoftware();
                    }
                } catch (error) {
                    showFeedback('No se pudo añadir el software: ' + error.message, 'danger', 'responseAlertSoftware');
                }
            });
        }

        // ── Formulario: Instalar Software en Equipo ────────────────────────
        const formInstallSoftware = document.getElementById('formInstallSoftware');
        if (formInstallSoftware) {
            formInstallSoftware.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formInstallSoftware);
                const data = Object.fromEntries(formData.entries());

                try {
                    // FIX #9: endpoint correcto para registrar instalación
                    const response = await requestJson(`${API_BASE}/equipment-software`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(data)
                    });

                    if (response && response.status === 'success') {
                        showFeedback('Instalación de software registrada en el equipo.', 'success', 'responseAlertInstall');
                        formInstallSoftware.reset();
                        const dateInput = document.getElementById('install_date');
                        if (dateInput) dateInput.valueAsDate = new Date();
                        await loadSoftwareHistory();
                    }
                } catch (error) {
                    showFeedback('No se pudo registrar la instalación: ' + error.message, 'danger', 'responseAlertInstall');
                }
            });
        }

        // ── Carga del catálogo de software ────────────────────────────────
        async function loadSoftware() {
            if (!selectInstallSoftware) return;
            try {
                const res = await requestJson(`${API_BASE}/software`, {
                    credentials: 'include'    // FIX #9
                });
                const softwareList = res.payload || res;
                selectInstallSoftware.textContent = ''
                const placeholderSw = document.createElement('option')
                placeholderSw.value = ''
                placeholderSw.selected = true
                placeholderSw.disabled = true
                placeholderSw.textContent = 'Seleccione un software...'
                selectInstallSoftware.appendChild(placeholderSw)
                if (Array.isArray(softwareList)) {
                    softwareList.forEach(sw => {
                        const opt = document.createElement('option');
                        opt.value = sw.id;
                        opt.textContent = `${sw.name} ${sw.version ? `(${sw.version})` : ''} - ${sw.license_type}`;
                        selectInstallSoftware.appendChild(opt);
                    });
                }
            } catch (error) {
                showFeedback('Error al cargar catálogo de software: ' + error.message, 'warning', 'responseAlertInstall');
            }
        }

        if (selectInstallSoftware) {
            await loadSoftware();
            const dateInput = document.getElementById('install_date');
            if (dateInput) dateInput.valueAsDate = new Date();
        }

        // ── Historial de instalaciones de software ─────────────────────────
        if (document.getElementById('historySoftwareTableBody')) {
            await loadSoftwareHistory();
        }

        async function loadSoftwareHistory() {
            try {
                // FIX #9: URL correcta. Antes llamaba a /api/ti/software/installations/all
                // que no existe. El router correcto es /api/ti/equipment-software.
                const res = await requestJson(`${API_BASE}/equipment-software`, {
                    credentials: 'include'
                });
                const records = res.payload || res;
                const tbody = document.getElementById('historySoftwareTableBody');
                if (!tbody) return;
                tbody.textContent = '';

                if (Array.isArray(records) && records.length > 0) {
                    records.forEach(rec => {
                        const equipment = equipmentsCache.find(e => e.id == rec.equipment_id) || {};
                        const tr = document.createElement('tr');
                        tr.appendChild(createCell('td', rec.id))
                        tr.appendChild(createCell('td', equipment.inventory_code || rec.equipment_id))
                        tr.appendChild(createCell('td', rec.software_name || rec.software_id))
                        tr.appendChild(createCell('td', rec.software_version || ''))
                        tr.appendChild(createCell('td', rec.license_type || ''))
                        tr.appendChild(createCell('td', rec.installation_date ? new Date(rec.installation_date).toLocaleString() : '-'))
                        const actionsTd = document.createElement('td')
                        const viewBtn = createActionButton('btn btn-sm btn-primary view-installation-btn', 'view-installation', rec.id, null, 'bi bi-eye')
                        viewBtn.dataset.id = String(rec.id)
                        viewBtn.appendChild(document.createTextNode(' Ver'))
                        actionsTd.appendChild(viewBtn)
                        tr.appendChild(actionsTd)
                        tbody.appendChild(tr);
                    });

                    document.querySelectorAll('.view-installation-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            await showInstallationDetails(e.currentTarget.getAttribute('data-id'));
                        });
                    });
                } else {
                    const tr = document.createElement('tr')
                    const td = document.createElement('td')
                    td.colSpan = 7
                    td.className = 'text-center text-muted'
                    td.textContent = 'No hay registros de instalaciones.'
                    tr.appendChild(td)
                    tbody.appendChild(tr)
                }
            } catch (error) {
                showFeedback('Error al cargar historial de software: ' + error.message, 'danger', 'responseAlertSoftware');
            }
        }

        async function showInstallationDetails(installationId) {
            try {
                // FIX #9: URL correcta para el detalle de una instalación.
                const res = await requestJson(
                    `${API_BASE}/equipment-software/${installationId}`,
                    { credentials: 'include' }
                );
                // El DAO devuelve un array; el payload es [detalles]
                const details = Array.isArray(res.payload) ? res.payload[0] : res.payload;

                if (!details) {
                    showFeedback('No se encontraron detalles de la instalación.', 'warning', 'responseAlertSoftware');
                    return;
                }

                // Eliminar modal anterior si existe
                document.getElementById('installationDetailsModal')?.remove();

                // Build modal DOM safely
                const modalEl = document.createElement('div')
                modalEl.className = 'modal fade'
                modalEl.id = 'installationDetailsModal'
                modalEl.tabIndex = -1

                const dialog = document.createElement('div')
                dialog.className = 'modal-dialog modal-lg'
                const content = document.createElement('div')
                content.className = 'modal-content'

                const header = document.createElement('div')
                header.className = 'modal-header'
                const title = document.createElement('h5')
                title.className = 'modal-title'
                title.textContent = 'Detalles de Instalación de Software'
                const btnClose = document.createElement('button')
                btnClose.type = 'button'
                btnClose.className = 'btn-close'
                btnClose.setAttribute('data-bs-dismiss', 'modal')
                header.appendChild(title)
                header.appendChild(btnClose)

                const body = document.createElement('div')
                body.className = 'modal-body'

                const row1 = document.createElement('div')
                row1.className = 'row mb-3'
                const colEq = document.createElement('div')
                colEq.className = 'col-md-6'
                const hEq = document.createElement('h1')
                hEq.className = 'fw-bold'
                hEq.textContent = 'Información del Equipo'
                colEq.appendChild(hEq)
                const p = (label, value) => {
                    const para = document.createElement('p')
                    const strong = document.createElement('strong')
                    strong.textContent = label
                    para.appendChild(strong)
                    para.appendChild(document.createTextNode(' ' + (value || 'N/A')))
                    return para
                }
                colEq.appendChild(p('Código:', details.inventory_code || 'N/A'))
                colEq.appendChild(p('Modelo:', details.equipment_model || 'N/A'))
                colEq.appendChild(p('Tipo:', details.equipment_type || 'N/A'))
                colEq.appendChild(p('N° de Serie:', details.serial_number || 'N/A'))
                colEq.appendChild(p('Ubicación:', details.location || 'N/A'))

                const colSw = document.createElement('div')
                colSw.className = 'col-md-6'
                const hr = document.createElement('hr')
                const hSw = document.createElement('h1')
                hSw.className = 'fw-bold'
                hSw.textContent = 'Información del Software'
                colSw.appendChild(hr)
                colSw.appendChild(hSw)
                colSw.appendChild(p('Nombre:', details.software_name || 'N/A'))
                colSw.appendChild(p('Versión:', details.software_version || 'N/A'))
                colSw.appendChild(p('Tipo de Licencia:', details.license_type || 'N/A'))
                colSw.appendChild(p('Expira:', details.expiration_date ? new Date(details.expiration_date).toLocaleDateString() : 'Permanente'))

                row1.appendChild(colEq)
                row1.appendChild(colSw)

                const row2 = document.createElement('div')
                row2.className = 'row'
                const colDetails = document.createElement('div')
                colDetails.className = 'col-12'
                const hr2 = document.createElement('hr')
                const hDetails = document.createElement('h1')
                hDetails.className = 'fw-bold'
                hDetails.textContent = 'Detalles de Instalación'
                colDetails.appendChild(hr2)
                colDetails.appendChild(hDetails)
                const pDate = document.createElement('p')
                const strongDate = document.createElement('strong')
                strongDate.textContent = 'Fecha:'
                pDate.appendChild(strongDate)
                pDate.appendChild(document.createTextNode(' ' + (details.installation_date ? new Date(details.installation_date).toLocaleString() : '-')))
                colDetails.appendChild(pDate)
                const pNotesLabel = document.createElement('p')
                const strongNotes = document.createElement('strong')
                strongNotes.textContent = 'Notas:'
                pNotesLabel.appendChild(strongNotes)
                colDetails.appendChild(pNotesLabel)
                const pNotes = document.createElement('p')
                pNotes.className = 'text-muted'
                pNotes.textContent = details.note || 'Sin notas'
                colDetails.appendChild(pNotes)

                row2.appendChild(colDetails)

                body.appendChild(row1)
                body.appendChild(row2)

                const footer = document.createElement('div')
                footer.className = 'modal-footer'
                const closeBtnFooter = document.createElement('button')
                closeBtnFooter.type = 'button'
                closeBtnFooter.className = 'btn btn-secondary'
                closeBtnFooter.setAttribute('data-bs-dismiss', 'modal')
                closeBtnFooter.textContent = 'Cerrar'
                footer.appendChild(closeBtnFooter)

                content.appendChild(header)
                content.appendChild(body)
                content.appendChild(footer)
                dialog.appendChild(content)
                modalEl.appendChild(dialog)

                document.body.appendChild(modalEl)
                new bootstrap.Modal(modalEl).show();
            } catch (error) {
                showFeedback('Error al cargar detalles: ' + error.message, 'danger', 'responseAlertSoftware');
            }
        }

    } catch (err) {
        console.error('Error inicializando módulo IT:', err);
        const alertContainer = document.getElementById('responseAlert') || document.body;
        try { setAlert(alertContainer, 'Error inicializando módulo IT: ' + (err?.message || String(err)), 'danger', 0); } catch (e) { console.error(e); }
    }
}

function showFeedback(message, type, targetElementId = 'responseAlert') {
    const container = document.getElementById(targetElementId);
    if (!container) return;
    setAlert(container, message, type, type === 'danger' || type === 'warning' ? 0 : 5000);
}
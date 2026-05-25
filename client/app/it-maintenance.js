import { requestJson, renderSidebar, escapeHtml, setAlert, toDateTimeLocal } from './shared.js';


const API_BASE = 'http://localhost:8000/api/ti'

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
                partsAddedBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Aún no se han añadido piezas a este mantenimiento.</td></tr>';
                return;
            }
            partsAddedBody.innerHTML = '';
            addedParts.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.part_name}</td>
                    <td>${item.quantity_used}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-danger shadow-sm js-remove-part" data-index="${index}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
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
                    partSelect.innerHTML = '<option value="" selected disabled>Seleccione una pieza...</option>';
                    partsCache.forEach(part => {
                        const opt = document.createElement('option');
                        opt.value = part.id;
                        opt.textContent = `${part.part_name} (Stock: ${part.stock_quantity})`;
                        // si no hay stock se podría deshabilitar, pero puede que ingresen repuestos al mismo tiempo.
                        if(Number(part.stock_quantity) <= 0) {
                            opt.textContent += " - SIN STOCK";
                        }
                        partSelect.appendChild(opt);
                    });
                }
            } catch (error) {
                console.error("Error al cargar piezas:", error);
            }
        }
        
        if(partSelect) await loadParts();

        // ── Formulario: Agregar Equipo ─────────────────────────────────────
        const formAddEquipment = document.getElementById('formAddEquipment');
        if (formAddEquipment) {
            formAddEquipment.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formAddEquipment);
                const data = Object.fromEntries(formData.entries());

                try {
                    const response = await requestJson(`${API_BASE}/equipments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(data)
                    });

                    if (response && response.status === 'success') {
                        showFeedback('Equipo agregado correctamente.', 'success', 'responseAlertAddEquipment');
                        formAddEquipment.reset();
                        await loadEquipments();
                    }
                } catch (error) {
                    showFeedback('No se pudo agregar el equipo: ' + error.message, 'danger', 'responseAlertAddEquipment');
                }
            });
        }

        // ── Carga de equipos (compartida) ──────────────────────────────────
        async function loadEquipments() {
            try {
                const res = await requestJson(`${API_BASE}/equipments`, {
                    credentials: 'include'    // FIX #9: faltaba credentials
                });
                const equipments = res.payload || res;
                equipmentsCache = Array.isArray(equipments) ? equipments : [];

                if (selectEquipment) {
                    selectEquipment.innerHTML = '<option value="" selected disabled>Seleccione un equipo...</option>';
                    equipmentsCache.forEach(eq => {
                        const opt = document.createElement('option');
                        opt.value = eq.id;
                        opt.textContent = `[${eq.inventory_code}] ${eq.model} - ${eq.type}`;
                        selectEquipment.appendChild(opt);
                    });
                }

                if (selectInstallEquipment) {
                    selectInstallEquipment.innerHTML = '<option value="" selected disabled>Seleccione un equipo...</option>';
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
                selectInstallSoftware.innerHTML = '<option value="" selected disabled>Seleccione un software...</option>';
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
                tbody.innerHTML = '';

                if (Array.isArray(records) && records.length > 0) {
                    records.forEach(rec => {
                        const equipment = equipmentsCache.find(e => e.id == rec.equipment_id) || {};
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${escapeHtml(rec.id)}</td>
                            <td>${escapeHtml(equipment.inventory_code || rec.equipment_id)}</td>
                            <td>${escapeHtml(rec.software_name || rec.software_id)}</td>
                            <td>${escapeHtml(rec.software_version || '')}</td>
                            <td>${escapeHtml(rec.license_type || '')}</td>
                            <td>${rec.installation_date ? new Date(rec.installation_date).toLocaleString() : '-'}</td>
                            <td>
                                <button class="btn btn-sm btn-primary view-installation-btn" data-id="${rec.id}">
                                    <i class="bi bi-eye"></i> Ver
                                </button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });

                    document.querySelectorAll('.view-installation-btn').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            await showInstallationDetails(e.currentTarget.getAttribute('data-id'));
                        });
                    });
                } else {
                    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay registros de instalaciones.</td></tr>`;
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

                const modalContent = `
                    <div class="modal fade" id="installationDetailsModal" tabindex="-1">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Detalles de Instalación de Software</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <h1 class="fw-bold"><strong>Información del Equipo</strong></h1>
                                            <p><strong>Código:</strong> ${escapeHtml(details.inventory_code || 'N/A')}</p>
                                            <p><strong>Modelo:</strong> ${escapeHtml(details.equipment_model || 'N/A')}</p>
                                            <p><strong>Tipo:</strong> ${escapeHtml(details.equipment_type || 'N/A')}</p>
                                            <p><strong>N° de Serie:</strong> ${escapeHtml(details.serial_number || 'N/A')}</p>
                                            <p><strong>Ubicación:</strong> ${escapeHtml(details.location || 'N/A')}</p>
                                        </div>
                                        <div class="col-md-6">
                                            <hr>
                                            <h1 class="fw-bold"><strong>Información del Software</strong></h1>
                                            <p><strong>Nombre:</strong> ${escapeHtml(details.software_name || 'N/A')}</p>
                                            <p><strong>Versión:</strong> ${escapeHtml(details.software_version || 'N/A')}</p>
                                            <p><strong>Tipo de Licencia:</strong> ${escapeHtml(details.license_type || 'N/A')}</p>
                                            <p><strong>Expira:</strong> ${details.expiration_date ? new Date(details.expiration_date).toLocaleDateString() : 'Permanente'}</p>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-12">
                                            <hr>
                                            <h1 class="fw-bold"><strong>Detalles de Instalación</strong></h1>
                                            <p><strong>Fecha:</strong> ${details.installation_date ? new Date(details.installation_date).toLocaleString() : '-'}</p>
                                            <p><strong>Notas:</strong></p>
                                            <p class="text-muted">${escapeHtml(details.note || 'Sin notas')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                document.body.insertAdjacentHTML('beforeend', modalContent);
                new bootstrap.Modal(document.getElementById('installationDetailsModal')).show();
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
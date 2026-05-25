import { requestJson, renderSidebar, escapeHtml, setAlert, toDateTimeLocal } from './shared.js';

export async function init() {
    try {
    console.log("Módulo de Mantenimiento IT inicializado");
    
    // Renderizar sidebar específico para IT Mantenimiento
    renderSidebar('sidebarCol', [
        { label: 'Registrar Mantenimiento', icon: 'bi bi-tools', target: 'registerItMaintenanceSection', active: true },
        { label: 'Agregar Equipos', icon: 'bi bi-plus-square', target: 'addEquipmentSection', active: false },
        { label: 'Añadir nuevo Software', icon: 'bi bi-folder-plus', target: 'addSoftwareSection', active: false },
        { label: 'Implementación<br>de Software', icon: 'bi bi-file-earmark-arrow-down', target: 'installSoftwareSection', active: false },
        { label: 'Historial<br>de Software', icon: 'bi bi-clock-history', target: 'historySoftwareSection', active: false }
    ], 'it_sidebar_collapsed');

    const form = document.getElementById('formItMaintenance');
    const selectEquipment = document.getElementById('equipment_id');
    const selectInstallEquipment = document.getElementById('install_equipment_id');
    const selectInstallSoftware = document.getElementById('install_software_id');
    const historySoftwareSection = document.getElementById('historySoftwareSection');
    const alertContainer = document.getElementById('responseAlert');
    let equipmentsCache = [];

    // 2. Manejar el envío del formulario de mantenimiento (si existe)
    if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await requestJson('http://localhost:8000/api/ti/maintenances', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response) {
                setAlert(alertContainer, 'Registro de mantenimiento guardado correctamente.', 'success');
                form.reset();
                await loadEquipments();
            }
        } catch (error) {
            setAlert(alertContainer, 'No se pudo guardar el registro: ' + error.message, 'danger');
        }
    });
    } else {
        console.warn('formItMaintenance no encontrado en DOM');
    }

    // 3. Manejar el envío del formulario Agregar Equipo (si existe)
    const formAddEquipment = document.getElementById('formAddEquipment');
    if (formAddEquipment) {
    formAddEquipment.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(formAddEquipment);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await requestJson('http://localhost:8000/api/ti/equipments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response && response.status === 'success') {
                showFeedback('Equipo agregado correctamente.', 'success', 'responseAlertAddEquipment');
                formAddEquipment.reset();
                // Actualizar la lista del selector de equipos en el formulario de mantenimiento
                await loadEquipments();
            }
        } catch (error) {
            showFeedback('No se pudo agregar el equipo: ' + error.message, 'danger', 'responseAlertAddEquipment');
        }
    });
    } else {
        console.warn('formAddEquipment no encontrado en DOM');
    }

    // Encapsulamos la carga de equipos para reutilizarla
    async function loadEquipments() {
        try {
            // Ajustamos cómo leemos la respuesta del backend
            const res = await requestJson('http://localhost:8000/api/ti/equipments');
            // La API de equipments devuelve { status: 'success', payload: [...] }
            const equipments = res.payload || res; 
            equipmentsCache = Array.isArray(equipments) ? equipments : [];

            selectEquipment.innerHTML = '<option value="" selected disabled>Seleccione un equipo...</option>';
            if(selectInstallEquipment) selectInstallEquipment.innerHTML = '<option value="" selected disabled>Seleccione un equipo...</option>';
            
            if (Array.isArray(equipments)) {
                equipments.forEach(eq => {
                    // Para Registrar Mantenimiento
                    const option = document.createElement('option');
                    option.value = eq.id;
                    option.textContent = `[${eq.inventory_code}] ${eq.model} - ${eq.type}`;
                    selectEquipment.appendChild(option);
                    
                    // Para Instalar/Actualizar Software
                    if(selectInstallEquipment) {
                        const optionInstall = document.createElement('option');
                        optionInstall.value = eq.id;
                        optionInstall.textContent = `[${eq.inventory_code}] ${eq.model} - ${eq.type}`;
                        selectInstallEquipment.appendChild(optionInstall);
                    }
                });
            }
        } catch (error) {
            showFeedback('Error al cargar equipos: ' + error.message, 'danger', 'responseAlert');
        }
    }

    // Cargar equipos inicialmente (solo si existe el selector)
    if (selectEquipment) {
        await loadEquipments();
    } else {
        console.warn('selectEquipment no encontrado en DOM; se omite carga de equipos');
    }
    // Cargar historial de mantenimientos
    

    // =============== LOGICA DE SOFTWARE ===============

    // 4. Manejar el envío del Catálogo de Software (si existe el formulario)
    const formAddSoftware = document.getElementById('formAddSoftware');
    if (formAddSoftware) {
        formAddSoftware.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(formAddSoftware);
        const data = Object.fromEntries(formData.entries());

        // Limpiar el string vacio de expiración si viene vacío (en DB es nulo o fecha)
        if (!data.expiration_date) {
            delete data.expiration_date;
        }

        try {
            const response = await requestJson('http://localhost:8000/api/ti/software', { // Supondremos que esta ruta existe
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response && response.status === 'success') {
                showFeedback('Software añadido al catálogo correctamente.', 'success', 'responseAlertSoftware');
                formAddSoftware.reset();
                await loadSoftware(); // Recargar el combobox de actualizar software
            }
        } catch (error) {
            showFeedback('No se pudo añadir el software: ' + error.message, 'danger', 'responseAlertSoftware');
        }
    });

    }

    // 5. Manejar el envío para Instalar/Actualizar Software (si existe el formulario)
    const formInstallSoftware = document.getElementById('formInstallSoftware');
    if (formInstallSoftware) {
        formInstallSoftware.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(formInstallSoftware);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await requestJson('http://localhost:8000/api/ti/software/install', { // Supondremos ruta
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response && response.status === 'success') {
                showFeedback('Actualización/Instalación de software registrada en el equipo.', 'success', 'responseAlertInstall');
                formInstallSoftware.reset();
                document.getElementById('install_date').valueAsDate = toDateTimeLocal(new Date()); // Resetear fecha a HOY
                await loadSoftwareHistory(); // Recargar el historial de software
            }
        } catch (error) {
            showFeedback('No se pudo registrar la instalación: ' + error.message, 'danger', 'responseAlertInstall');
        }
    });

    }

    // Encapsulamos la carga del catálogo de software
    async function loadSoftware() {
        if (!selectInstallSoftware) return;
        try {
            const res = await requestJson('http://localhost:8000/api/ti/software');
            const sofwareList = res.payload || res; 

            selectInstallSoftware.innerHTML = '<option value="" selected disabled>Seleccione un software...</option>';
            
            if (Array.isArray(sofwareList)) {
                sofwareList.forEach(sw => {
                    const option = document.createElement('option');
                    option.value = sw.id;
                    option.textContent = `${sw.name} ${sw.version ? `(${sw.version})` : ''} - ${sw.license_type}`;
                    selectInstallSoftware.appendChild(option);
                });
            }
        } catch (error) {
            showFeedback('Error al cargar catálogo de software (¿Ruta /api/ti/software creada?): ' + error.message, 'warning', 'responseAlertInstall');
        }
    }

    // Cargar software inicialmente (si existe el selector de instalación) y definir fecha por defecto
    if (selectInstallSoftware) {
        await loadSoftware();
        const dateInput = document.getElementById('install_date');
        if(dateInput) dateInput.valueAsDate = new Date();
    }
    // Cargar historial de software inicialmente (si existe la tabla)
    if (document.getElementById('historySoftwareTableBody')) {
        await loadSoftwareHistory();
    }

    async function loadSoftwareHistory() {
        try {
            const res = await requestJson('http://localhost:8000/api/ti/software/installations/all', { credentials: 'include' });
            const records = res.payload || res;
            const tbody = document.getElementById('historySoftwareTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (Array.isArray(records) && records.length > 0) {
                records.forEach((rec) => {
                    // Buscar equipo en cache para obtener el código de inventario
                    const equipment = equipmentsCache.find(e => e.id == rec.equipment_id) || {};
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${escapeHtml(rec.id)}</td>
                        <td>${escapeHtml(equipment.inventory_code || rec.equipment_id)}</td>
                        <td>${escapeHtml(rec.software_name || rec.software_id)}</td>
                        <td>${escapeHtml(rec.software_version || '')}</td>
                        <td>${escapeHtml(rec.license_type || '')}</td>
                        <td>${new Date(rec.installation_date).toLocaleString()}</td>
                        <td>
                            <button class="btn btn-sm btn-primary view-installation-btn" data-id="${rec.id}">
                                <i class="bi bi-eye"></i> Ver
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Agregar event listeners a los botones de "Ver"
                document.querySelectorAll('.view-installation-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const installationId = e.currentTarget.getAttribute('data-id');
                        await showInstallationDetails(installationId);
                    });
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay registros de instalaciones de software.</td></tr>`;
            }
        } catch (error) {
            showFeedback('Error al cargar historial de software: ' + error.message, 'danger', 'responseAlertSoftware');
        }
    }

    async function showInstallationDetails(installationId) {
        try {
            const res = await requestJson(`http://localhost:8000/api/ti/software/installations/${installationId}`, { credentials: 'include' });
            const details = (res.payload && res.payload[0]) || res[0];
            
            if (!details) {
                showFeedback('No se encontraron detalles de la instalación.', 'warning', 'responseAlertSoftware');
                return;
            }

            // Crear modal con detalles
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
                                        <hr>
                                        <h1 class="fw-bold"><strong>Información del Equipo</strong></h1>
                                        <p><strong>Código de Inventario:</strong> ${escapeHtml(details.inventory_code || 'N/A')}</p>
                                        <p><strong>Modelo:</strong> ${escapeHtml(details.equipment_model || 'N/A')}</p>
                                        <p><strong>Tipo:</strong> ${escapeHtml(details.equipment_type || 'N/A')}</p>
                                        <p><strong>Número de Serie:</strong> ${escapeHtml(details.serial_number || 'N/A')}</p>
                                        <p><strong>Ubicación:</strong> ${escapeHtml(details.location || 'N/A')}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <hr>
                                        <h1 class="fw-bold"><strong>Información del Software</strong></h1>
                                        <p><strong>Nombre:</strong> ${escapeHtml(details.software_name || 'N/A')}</p>
                                        <p><strong>Versión:</strong> ${escapeHtml(details.software_version || 'N/A')}</p>
                                        <p><strong>Tipo de Licencia:</strong> ${escapeHtml(details.license_type || 'N/A')}</p>
                                        <p><strong>Fecha de Expiración:</strong> ${details.expiration_date ? new Date(details.expiration_date).toLocaleDateString() : 'Permanente'}</p>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-12">
                                        <hr>
                                        <h1 class="fw-bold"><strong>Detalles de Instalación</strong></h1>
                                        <p><strong>Fecha de Instalación:</strong> ${new Date(details.installation_date).toLocaleString()}</p>
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

            // Insertar modal en el DOM
            let modalDiv = document.getElementById('installationDetailsModal');
            if (modalDiv) {
                modalDiv.remove();
            }
            document.body.insertAdjacentHTML('beforeend', modalContent);

            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('installationDetailsModal'));
            modal.show();
        } catch (error) {
            showFeedback('Error al cargar detalles: ' + error.message, 'danger', 'responseAlertSoftware');
        }
    }
    }
    catch (err) {
        console.error('Error inicializando módulo IT:', err);
        const alertContainer = document.getElementById('responseAlert') || document.getElementById('responseAlertAddEquipment') || document.body;
        try { setAlert(alertContainer, 'Error inicializando módulo IT: ' + (err?.message || String(err)), 'danger', 0) } catch(e){ console.error(e) }
    }
}

function showFeedback(message, type, targetElementId = 'responseAlert') {
    const container = document.getElementById(targetElementId);
    if (!container) return;
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}




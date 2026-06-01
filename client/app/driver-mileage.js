import { clearAlert, requestJson, setAlert, toDateTimeLocal, API_BASE } from "./shared.js"

const API_NOTIFICATIONS_URL = `${API_BASE}/notifications`

const validateMileageForm = (mileage, date, initialMileage) => {
    const mileageNum = parseInt(mileage, 10);
    const currentTotal = parseInt(initialMileage, 10) || 0;

    if (isNaN(mileageNum) || mileageNum <= 0) {
        return "El kilometraje debe ser un número mayor a 0";
    }
    
    if (mileageNum <= currentTotal) {
        return `El kilometraje debe ser mayor al actual (${currentTotal} km)`;
    }

    if (!date) return "La fecha del recorrido es requerida";
    return null;
};

// Consulta el camión asignado y maneja las alertas de mantenimiento
const loadAssignedTruck = async (container, alert) => {
    try {
        const data = await requestJson(`${API_BASE}/trucks/my-truck`, {
            method: "GET",
            credentials: "include",
            headers: { 'Content-Type': 'application/json' }
        }, "Error al obtener el vehículo")

        const truck = data.payload;
        const submitBtn = document.getElementById("saveMileageBtn");

        if (container) {
            container.dataset.initialMileage = String(Number(truck.total_mileage || 0));
            container.value = `${truck.plate_number} (${truck.total_mileage} km)`;
        }
        // Lógica preventiva no restrictiva
        const totalMileage = Number(truck.total_mileage || 0)
        const serverLastMaintenance = Number(truck.last_maintenance_mileage || 0)
        const hasPendingMaintenance = Number(truck.has_pending_maintenance || 0)
        const threshold = Number(truck.maintenance_threshold ?? 5000)

        // Persistimos el estado previo y un override por camión para evitar
        // re-disparar la alerta inmediatamente tras completar mantenimiento.
        const statusKey = `hirata_truck_status_${truck.id}`
        const overrideKey = `hirata_last_maintenance_override_${truck.id}`
        const prevStatus = localStorage.getItem(statusKey)

        // Si hubo una transición de 'en mantenimiento' -> otro estado, establecemos
        // un override al kilometraje actual para reiniciar el ciclo.
        if (prevStatus === 'en mantenimiento' && truck.status !== 'en mantenimiento') {
            try {
                localStorage.setItem(overrideKey, String(totalMileage))
            } catch (e) { /* no bloquear por storage */ }
        }

        // Actualizamos el estado almacenado
        try { localStorage.setItem(statusKey, truck.status || '') } catch (e) {}

        // Usar el mayor entre lo que diga el servidor y el override (no bajar la referencia)
        const overrideVal = Number(localStorage.getItem(overrideKey) || NaN)
        const effectiveLastMaintenance = Number.isFinite(overrideVal)
            ? Math.max(serverLastMaintenance, overrideVal)
            : serverLastMaintenance

        const diff = totalMileage - effectiveLastMaintenance

    
        try {
        } catch (e) {}

        if (truck.status === 'en mantenimiento') {
            // BLOQUEO TOTAL: El vehículo ya está en manos del taller
            if (alert) {
                setAlert(alert, "Vehículo en mantenimiento. No puedes registrar kilometraje hasta que el taller lo libere.", "danger");
            }
            if (submitBtn) submitBtn.disabled = true;
            return
        }

        if (diff >= threshold && !hasPendingMaintenance) {
            // ADVERTENCIA: Se superó el umbral y no existe mantenimiento pendiente
            if (alert) {
                setAlert(alert, `Vehículo ha superado el umbral de mantenimiento preventivo (${threshold} km). Por favor, diríjase al taller o contacte al Administrador de Mantenimiento para programar su ingreso.`, "warning");
            }
            if (submitBtn) submitBtn.disabled = false;
        } else {
            // ESTADO NORMAL: Si hay mantenimiento pendiente o no se superó el umbral, no mostrar warning
            if (submitBtn) submitBtn.disabled = false;
            if (alert) {
                clearAlert(alert)
            }
        }
    } catch (error) {
        if (container) {
            container.dataset.initialMileage = "";
            container.value = "Sin vehículo asignado";
        }
    }
};

const submitMileage = async (mileage, date) => {
    const payload = {
        mileage_value: parseInt(mileage, 10),
        registration_date: date
    };

    try {
        const responseData = await requestJson(`${API_BASE}/mileageLogs/save`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }, "No se pudo guardar el kilometraje")

        return { success: true, message: responseData.message || "Kilometraje registrado exitosamente" };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export function initMileageForm() {
    const form = document.getElementById("kilometrajeForm");
    const assignedTruckContainer = document.getElementById("assignedTruck");
    const mileageInput = document.getElementById("driverMileageValue");
    const dateInput = document.getElementById("driverRouteDate");
    const submitBtn = document.getElementById("saveMileageBtn");
    const clearBtn = document.getElementById("clearMileageBtn");
    const alert = document.getElementById("mileageAlert");

    if (!form || !submitBtn) return;

    const defaultSubmitLabel = 'Guardar kilometraje'
    const setSubmitState = ({ disabled, processing = false, processed = false }) => {
        submitBtn.disabled = disabled
        submitBtn.classList.remove('is-processing', 'btn-success')
        submitBtn.classList.add('btn-primary')

        if (processing) {
            submitBtn.classList.add('is-processing')
            // build spinner + text safely
            submitBtn.textContent = ''
            const spinner = document.createElement('span')
            spinner.className = 'spinner-border spinner-border-sm me-2'
            spinner.setAttribute('aria-hidden', 'true')
            submitBtn.appendChild(spinner)
            submitBtn.appendChild(document.createTextNode('Guardando...'))
            return
        }

        if (processed) {
            submitBtn.classList.remove('btn-primary')
            submitBtn.classList.add('btn-success')
            submitBtn.textContent = ''
            const icon = document.createElement('i')
            icon.className = 'bi bi-check-circle me-1'
            icon.setAttribute('aria-hidden', 'true')
            submitBtn.appendChild(icon)
            submitBtn.appendChild(document.createTextNode('Procesado'))
            return
        }

        submitBtn.textContent = defaultSubmitLabel
    }

    if (dateInput) dateInput.value = toDateTimeLocal();
    loadAssignedTruck(assignedTruckContainer, alert);

    submitBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const currentMileage = assignedTruckContainer.dataset.initialMileage;
        const error = validateMileageForm(mileageInput.value, dateInput.value, currentMileage);
        if (error) {
            if (alert) setAlert(alert, error, "danger", 0)
            return;
        }

        setSubmitState({ disabled: true, processing: true })
        if (alert) {
            setAlert(alert, "Guardando kilometraje...", "info", 1500)
        }

        const result = await submitMileage(mileageInput.value, dateInput.value);

        if (alert) {
            setAlert(alert, result.message, result.success ? "success" : "danger", result.success ? 3500 : 0)
        }

        if (result.success) {
            setSubmitState({ disabled: true, processed: true })
            mileageInput.value = "";
            if (dateInput) dateInput.value = toDateTimeLocal();
            await loadAssignedTruck(assignedTruckContainer, alert);
            setTimeout(() => {
                setSubmitState({ disabled: submitBtn.disabled })
            }, 1100)
        } else {
            setSubmitState({ disabled: false })
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            mileageInput.value = "";
            if (dateInput) dateInput.value = toDateTimeLocal();
            await loadAssignedTruck(assignedTruckContainer, alert);
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMileageForm);
} else {
    initMileageForm();
}

// --- Notificaciones para conductor ---
const renderDriverNotifications = (items) => {
    const slot = document.getElementById("driverNotificationSlot")
        if (!slot) return
        if (!items || items.length === 0) {
                // No mostrar nada cuando no hay notificaciones (se gestionan en el navbar)
                slot.textContent = ''
                return
        }

        slot.textContent = ''
        items.forEach(item => {
                const unreadClass = item.is_read ? '' : 'border-start border-3 border-primary'
                const date = item.created_at ? new Date(item.created_at).toLocaleString() : ''

                const card = document.createElement('div')
                card.className = 'card mb-2 ' + unreadClass
                const body = document.createElement('div')
                body.className = 'card-body py-2'
                const inner = document.createElement('div')
                inner.className = 'd-flex justify-content-between align-items-start'
                const left = document.createElement('div')
                const title = document.createElement('div')
                title.className = 'small fw-semibold'
                title.textContent = item.title || 'Notificación'
                const msg = document.createElement('div')
                msg.className = 'small text-muted'
                msg.textContent = item.message || ''
                const dateDiv = document.createElement('div')
                dateDiv.className = 'small text-secondary mt-1'
                const ic = document.createElement('i')
                ic.className = 'bi bi-clock me-1'
                ic.setAttribute('aria-hidden', 'true')
                dateDiv.appendChild(ic)
                dateDiv.appendChild(document.createTextNode(date))
                left.appendChild(title)
                left.appendChild(msg)
                left.appendChild(dateDiv)

                const right = document.createElement('div')
                right.className = 'ms-3'
                if (!item.is_read) {
                        const btn = document.createElement('button')
                        btn.dataset.nid = item.id
                        btn.className = 'btn btn-sm btn-outline-primary mark-notif-btn'
                        btn.textContent = 'Marcar leída'
                        right.appendChild(btn)
                }

                inner.appendChild(left)
                inner.appendChild(right)
                body.appendChild(inner)
                card.appendChild(body)
                slot.appendChild(card)
        })
}
const initDriverNotifications = async () => {
    const slot = document.getElementById("driverNotificationSlot")
    if (!slot) return

    const renderFromCache = (items) => {
        // Excluir notificaciones de mantenimiento del slot principal (se muestran en el navbar)
        const mainItems = Array.isArray(items) ? items.filter(i => i.reference_type !== 'maintenance') : []
        // Mostrar primero las no-leídas dentro del conjunto permitido
        const visible = mainItems.filter(i => !i.is_read)
        // si no hay no-leídas mostrar todas las permitidas; si no hay permitidas, mostrar mensaje vacío
        if (mainItems.length === 0) {
            renderDriverNotifications([])
            return
        }
        renderDriverNotifications(visible.length > 0 ? visible : mainItems)
    }

    // Manejar clicks de marcar como leída
    slot.addEventListener('click', async (ev) => {
        const btn = ev.target.closest('.mark-notif-btn')
        if (!btn) return
        const nid = btn.dataset.nid
        try {
            if (window.notificationStore && window.notificationStore.markAsRead) {
                await window.notificationStore.markAsRead(nid)
            } else {
                // fallback directo a la API
                await requestJson(`${API_NOTIFICATIONS_URL}/${nid}`, {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" }
                }, "No se pudo marcar la notificación")
            }
        } catch (error) {
            console.error('No se pudo marcar notificación', error)
        }
    })

    if (window.notificationStore) {
        // render inicial (excluye maintenance)
        renderFromCache(window.notificationStore.getCached())
        // suscribirse a cambios
        window.notificationStore.subscribe(renderFromCache)
    } else {
        // fallback: cargar directamente
        const load = async () => {
            try {
                const data = await requestJson(API_NOTIFICATIONS_URL, {
                    method: "GET",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" }
                }, "No se pudieron cargar las notificaciones")
                const items = Array.isArray(data.payload) ? data.payload : []
                renderFromCache(items)
            } catch (error) {
                slot.textContent = ''
                const err = document.createElement('div')
                err.className = 'alert alert-danger mb-0'
                err.textContent = error.message || 'Error cargando notificaciones'
                slot.appendChild(err)
            }
        }
        await load()
        window.setInterval(load, 30000)
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDriverNotifications);
} else {
    initDriverNotifications();
}
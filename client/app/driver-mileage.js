import { clearAlert, requestJson, setAlert, toDateTimeLocal } from "./shared.js"

const API_BASE = "http://localhost:8000/api";

const validateMileageForm = (mileage, date) => {
    const mileageNum = parseInt(mileage, 10);
    if (isNaN(mileageNum) || mileageNum <= 0) {
        return "El kilometraje debe ser un número mayor a 0";
    }
    if (!date) {
        return "La fecha del recorrido es requerida";
    }
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
        const diff = (truck.total_mileage || 0) - (truck.last_maintenance_mileage || 0);

        if (truck.status === 'en mantenimiento') {
            // BLOQUEO TOTAL: El vehículo ya está en manos del taller
            if(alert) setAlert(alert, "Vehículo en mantenimiento. No puedes registrar kilometraje hasta que el taller lo libere.", "danger");
            if(submitBtn) submitBtn.disabled = true;
        } else if (diff >= 5000) {
            // ADVERTENCIA: Se superó el umbral y se informa al conductor sin bloquear la operación
            if(alert) setAlert(alert, "Vehículo ha superado el umbral de 5,000 km. Por favor, diríjase al taller o contacte al Administrador de Mantenimiento para programar su ingreso.", "warning");
            if(submitBtn) submitBtn.disabled = false;
        } else {
            // ESTADO NORMAL: Limpieza total del ciclo de alerta tras mantenimiento
            if(submitBtn) submitBtn.disabled = false;
            if(alert) clearAlert(alert)
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
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Guardando...'
            return
        }

        if (processed) {
            submitBtn.classList.remove('btn-primary')
            submitBtn.classList.add('btn-success')
            submitBtn.innerHTML = '<i class="bi bi-check-circle me-1" aria-hidden="true"></i>Procesado'
            return
        }

        submitBtn.innerHTML = defaultSubmitLabel
    }

    if (dateInput) dateInput.value = toDateTimeLocal();
    loadAssignedTruck(assignedTruckContainer, alert);

    submitBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const error = validateMileageForm(mileageInput.value, dateInput.value);
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
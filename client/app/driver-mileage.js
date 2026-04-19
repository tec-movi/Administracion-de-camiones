import { requestJson, setAlert, toDateTimeLocal } from "./shared.js"

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

// Consulta el camión asignado al conductor y muestra patente + kilometraje acumulado.
const loadAssignedTruck = async (container, alert) => {
    try {
        const data = await requestJson(`${API_BASE}/trucks/my-truck`, {
            method: "GET",
            credentials: "include",
            headers: { 'Content-Type': 'application/json' }
        }, "Error al obtener el vehículo")

        const truck = data.payload;

        // Guarda el kilometraje actual como base para la siguiente comparación en frontend.
        if (container) {
            container.dataset.initialMileage = String(Number(truck.total_mileage || 0));
            container.value = `${truck.plate_number} (${truck.total_mileage} km)`;
        }

        // Validación visual en caso de que esté en mantenimiento
        if (truck.status === 'en mantenimiento') {
            if(alert) setAlert(alert, "⚠️ Tu vehículo se encuentra actualmente 'en mantenimiento'. No puedes registrar kilometraje hasta que sea liberado.", "warning");
            const submitBtn = document.getElementById("saveMileageBtn");
            if(submitBtn) submitBtn.disabled = true;
        } else {
            const submitBtn = document.getElementById("saveMileageBtn");
            if(submitBtn) submitBtn.disabled = false;
        }
    } catch (error) {
        if (container) {
            container.dataset.initialMileage = "";
            container.value = "Sin vehículo asignado";
        }
        if (alert) {
            console.error("Error cargando camión:", error)
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
        // [RF-01] Captura explícita del error validado desde el backend (ej: kilometraje menor al actual).
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

    // Inicializa fecha/hora actual y datos del vehículo.
    if (dateInput) dateInput.value = toDateTimeLocal();
    loadAssignedTruck(assignedTruckContainer, alert);

    // Guarda el kilometraje final del viaje y actualiza la referencia del camión.
    submitBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const error = validateMileageForm(mileageInput.value, dateInput.value);
        if (error) {
            if (alert) {
                alert.textContent = error;
                alert.className = "mt-3 text-danger";
            }
            return;
        }

        submitBtn.disabled = true;
        if (alert) {
            setAlert(alert, "Guardando...", "info");
        }

        const result = await submitMileage(mileageInput.value, dateInput.value);

        if (alert) {
            setAlert(alert, result.message, result.success ? "success" : "danger");
        }

        // Se asegura que tras un éxito, re-renderiza el camión con el kilometraje ya impactado en la Base de Datos.
        if (result.success) {
            mileageInput.value = "";
            if (dateInput) dateInput.value = toDateTimeLocal();
            
            await loadAssignedTruck(assignedTruckContainer, alert);
        }

        submitBtn.disabled = false;
    });

    // Restablece entradas locales del formulario y vuelve a consultar la información actualizada del camión al back (sincronizando kilometraje).
    if (clearBtn) {
        clearBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            
            mileageInput.value = "";
            if (dateInput) dateInput.value = toDateTimeLocal();
            
            if (alert) {
                setAlert(alert, "Recargando datos actualizados del vehículo...", "info");
            }
            
            await loadAssignedTruck(assignedTruckContainer, alert);
            
            if (alert) {
                setAlert(alert, "Formulario limpio y datos actualizados correctamente", "success");
                setTimeout(() => { alert.textContent = ""; alert.className = "mt-3 text-secondary"; }, 3000);
            }
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMileageForm);
} else {
    initMileageForm();
}

import { requestJson, setAlert } from "./shared.js"
// Endpoint backend de autenticación.
const API_LOGIN_URL = "http://localhost:8000/api/sessions/login";
// Rutas de entrada según rol.
const DRIVER_VIEW_URL = "module/driver/driver.view.html";
const ADM_FLOTA_VIEW_URL = "module/admflota/admflota.view.html";
const ADM_MANT_VIEW_URL = "module/admmantenimiento/admmant.view.html";
// Resuelve la ruta de inicio de acuerdo al rol autenticado.
const getRedirectByRole = (role) => {
    const routes = {
      admin: ADM_FLOTA_VIEW_URL,
      superadmin: ADM_FLOTA_VIEW_URL,
      maintenance: ADM_MANT_VIEW_URL,
      driver: DRIVER_VIEW_URL
    }
    return routes[role] || DRIVER_VIEW_URL
};

// Controla estado visual de carga (overlay + botón deshabilitado).
const setLoading = (isLoading) => {
    const overlay = document.getElementById("loadingOverlay");
    const submitButton = document.querySelector("#loginForm button[type='submit']");
    if (overlay) {
        overlay.classList.toggle("is-visible", isLoading);
        overlay.setAttribute("aria-hidden", isLoading ? "false" : "true");
    }
    if (submitButton) {
        submitButton.disabled = isLoading;
    }
};

// Inicializa botón de mostrar/ocultar contraseña.
const initPasswordToggle = () => {
    const passwordInput = document.getElementById("password");
    const toggleBtn = document.getElementById("togglePassword");
    const toggleIcon = document.getElementById("togglePasswordIcon");
    if (!passwordInput || !toggleBtn || !toggleIcon) return;

    toggleBtn.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";
        toggleIcon.classList.toggle("bi-eye", !isPassword);
        toggleIcon.classList.toggle("bi-eye-slash", isPassword);
        toggleBtn.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña");
    });
};
initPasswordToggle();

// Flujo principal de inicio de sesión.
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    // Lectura de campos y normalización básica de email.
    const usuario = document.getElementById("usuario").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const alerta = document.getElementById("alertaLogin");
    // Estado inicial limpio antes del intento de autenticación.
    setAlert(alerta, "", "secondary");
    setLoading(true);

    try {
        // Intenta autenticación contra backend.
        const data = await requestJson(API_LOGIN_URL, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: usuario, password })
        }, "Credenciales incorrectas")

        // Valida contrato de respuesta esperado.
        if (data.status !== "success" || !data.payload) {
            setAlert(alerta, "Credenciales incorrectas", "danger");
            return;
        }
        
        const perfil = data.payload;
        // Persiste perfil para control de sesión y redirige según rol.
        window.location.href = getRedirectByRole(perfil.role);
    } catch (error) {
        // Muestra en pantalla si la "contraseña es incorrecta"
        setAlert(alerta, error.message || "No se pudo conectar al servidor.", "danger");
    } finally {
        // Siempre restaura UI al terminar el proceso.
        setLoading(false);
    }
});
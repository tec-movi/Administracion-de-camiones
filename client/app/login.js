import { requestJson, setAlert, API_BASE } from "./shared.js"
import { ROLE_ROUTES } from "./routes.js"

const API_LOGIN_URL = `${API_BASE}/sessions/login`

// Resuelve ruta usando el mismo mapa que app.js — fuente única de verdad.
const getRedirectByRole = (role) => ROLE_ROUTES[role] ?? "module/driver/driver.view.html"

const setLoading = (isLoading) => {
    const overlay      = document.getElementById("loadingOverlay")
    const submitButton = document.querySelector("#loginForm button[type='submit']")
    if (overlay) {
        overlay.classList.toggle("is-visible", isLoading)
        overlay.setAttribute("aria-hidden", isLoading ? "false" : "true")
    }
    if (submitButton) submitButton.disabled = isLoading
}

const initPasswordToggle = () => {
    const passwordInput = document.getElementById("password")
    const toggleBtn     = document.getElementById("togglePassword")
    const toggleIcon    = document.getElementById("togglePasswordIcon")
    if (!passwordInput || !toggleBtn || !toggleIcon) return
    toggleBtn.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password"
        passwordInput.type = isPassword ? "text" : "password"
        toggleIcon.classList.toggle("bi-eye",       !isPassword)
        toggleIcon.classList.toggle("bi-eye-slash",  isPassword)
        toggleBtn.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña")
    })
}
initPasswordToggle()

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault()
    const usuario  = document.getElementById("usuario").value.trim().toLowerCase()
    const password = document.getElementById("password").value
    const alerta   = document.getElementById("alertaLogin")

    setAlert(alerta, "", "secondary")
    setLoading(true)

    try {
        const data = await requestJson(API_LOGIN_URL, {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: usuario, password })
        }, "Credenciales incorrectas")

        if (data.status !== "success" || !data.payload) {
            setAlert(alerta, "Credenciales incorrectas", "danger")
            return
        }

        // Sesión en cookie httpOnly — no se guarda nada en localStorage.
        window.location.href = getRedirectByRole(data.payload.role)

    } catch (error) {
        setAlert(alerta, error.message || "No se pudo conectar al servidor.", "danger")
    } finally {
        setLoading(false)
    }
})
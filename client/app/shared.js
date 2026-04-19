// Utilidades compartidas por las vistas del cliente:
// centraliza llamadas HTTP, alertas UI, formato de fecha y helpers de seguridad/UX.
export const readJson = async (response) => {
    return response.json().catch(() => ({}))
}
// Ejecuta fetch y estandariza el manejo de errores devueltos por el backend.
export const requestJson = async (url, options = {}, fallbackError = "Request failed") => {
    const response = await fetch(url, options)
    const data = await readJson(response)
    if (!response.ok) {
        throw new Error(data.error || data.message || fallbackError)
    }
    return data
}
// Muestra mensajes en la vista reutilizando un único formato de alerta.
export const setAlert = (element, message, type = "danger") => {
    if (!element) return
    element.textContent = message
    element.className = `mt-3 text-${type}`
}
// Convierte fechas al formato requerido por inputs datetime-local.
export const toDateTimeLocal = (date = new Date()) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return localDate.toISOString().slice(0, 16)
}
// Escapa HTML para evitar inyección al renderizar texto dinámico.
export const escapeHtml = (value) => {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
}
    // Bloquea el scroll del body al abrir overlays en móvil.
export const lockBodyScroll = () => {
    const scrollY = window.scrollY || window.pageYOffset || 0
    document.body.dataset.scrollY = String(scrollY)
    document.body.classList.add("mobile-notifications-open")
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = "0"
    document.body.style.right = "0"
    document.body.style.width = "100%"
}
// Restaura el scroll y la posición previa al cerrar overlays.
export const unlockBodyScroll = () => {
    const scrollY = Number(document.body.dataset.scrollY || 0)
    document.body.classList.remove("mobile-notifications-open")
    document.body.style.position = ""
    document.body.style.top = ""
    document.body.style.left = ""
    document.body.style.right = ""
    document.body.style.width = ""
    delete document.body.dataset.scrollY
    if (scrollY > 0) {
        window.scrollTo(0, scrollY)
    }
}

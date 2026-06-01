import { requestJson, escapeHtml, lockBodyScroll, unlockBodyScroll, API_BASE, createActionButton } from "./shared.js"
import { ROLE_PATH_FRAGMENTS } from "./routes.js"

const API_CURRENT_URL       = `${API_BASE}/sessions/current`
const API_LOGOUT_URL        = `${API_BASE}/sessions/logout`
const API_NOTIFICATIONS_URL = `${API_BASE}/notifications`

const ADMIN_NOTIFICATION_ROLES = new Set(["admin", "superadmin", "maintenance", "it_tech"])

// ── Sesión ─────────────────────────────────────────────────────────────────

const getLoginPath = () => {
    const path = window.location.pathname.replace(/\\/g, "/")
    return path.includes("/module/") ? "../../login.html" : "login.html"
}

//cierre de sesión elimina cualquier dato residual de localStorage
//    y confía en que el backend invalida la cookie.
const cerrarSesion = async () => {
    try {
        await fetch(API_LOGOUT_URL, { method: "POST", credentials: "include" })
    } catch (error) {
        console.error("Error cerrando sesión:", error)
    } finally {
        // Limpiar cualquier residuo de versiones anteriores que usaban localStorage
        try { localStorage.removeItem('hirata_session') } catch (_) {}
        window.location.href = getLoginPath()
    }
}

const getCurrentUser = async () => {
    try {
        const res = await fetch(API_CURRENT_URL, { credentials: "include" })
        if (!res.ok) return null
        const data = await res.json()
        return data.payload
    } catch (error) {
        console.error("Error obteniendo sesión:", error)
        return null
    }
}

// ── Navbar ─────────────────────────────────────────────────────────────────

const initNavbarUser = (usuario) => {
    const nombreEl = document.getElementById("nombreUsuario")
    if (nombreEl) nombreEl.textContent = "Hola, " + (usuario.nombre || usuario.full_name || "Usuario")
    const badgeEl = document.getElementById("personajeBadge")
    if (badgeEl) badgeEl.textContent = usuario.role || "Conductor"
}

const initLogoutControl = () => {
    const slot = document.getElementById("logoutNavSlot")
    if (!slot) return

    let confirmVisible = false
    const render = () => {
        slot.textContent = ''
        if (confirmVisible) {
            const wrap = document.createElement('div')
            wrap.className = 'd-flex align-items-center gap-2 flex-wrap nav-logout-confirm'
            const span = document.createElement('span')
            span.className = 'small text-white-50'
            span.textContent = '¿Salir?'
            const btnConfirm = document.createElement('button')
            btnConfirm.type = 'button'
            btnConfirm.className = 'btn btn-sm btn-light'
            btnConfirm.dataset.action = 'logout-confirm'
            btnConfirm.textContent = 'Confirmar'
            const btnCancel = document.createElement('button')
            btnCancel.type = 'button'
            btnCancel.className = 'btn btn-sm btn-outline-light'
            btnCancel.dataset.action = 'logout-cancel'
            btnCancel.textContent = 'Cancelar'
            wrap.appendChild(span)
            wrap.appendChild(btnConfirm)
            wrap.appendChild(btnCancel)
            slot.appendChild(wrap)
            return
        }
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn btn-outline-light btn-sm'
        btn.dataset.action = 'logout-request'
        btn.textContent = 'Salir'
        slot.appendChild(btn)
    }

    render()
    slot.addEventListener("click", async (event) => {
        const actionTarget = event.target.closest("[data-action]")
        if (!actionTarget) return
        const action = actionTarget.dataset.action
        if (action === "logout-request") { confirmVisible = true;  render(); return }
        if (action === "logout-cancel")  { confirmVisible = false; render(); return }
        if (action === "logout-confirm") { await cerrarSesion() }
    })
}

// ── Notificaciones ─────────────────────────────────────────────────────────

const canUseAdminNotifications = (usuario) => {
    const path = window.location.pathname.replace(/\\/g, "/")
    return path.includes("/module/admmantenimiento/") && ADMIN_NOTIFICATION_ROLES.has(usuario.role)
}

const formatNotificationDate = (isoDate) => {
    if (!isoDate) return ""
    const date = new Date(isoDate)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleString("es-CL", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    })
}

const fetchUserNotifications = async () => {
    const data = await requestJson(API_NOTIFICATIONS_URL, {
        method: "GET", credentials: "include",
        headers: { "Content-Type": "application/json" }
    }, "No se pudieron cargar las notificaciones")
    return Array.isArray(data.payload) ? data.payload : []
}

const markNotificationAsRead = async (notificationId) => {
    await requestJson(`${API_NOTIFICATIONS_URL}/${notificationId}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" }
    }, "No se pudo marcar la notificación")
}

const markAllNotificationsAsRead = async () => {
    await requestJson(`${API_NOTIFICATIONS_URL}/read-all`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" }
    }, "No se pudieron marcar las notificaciones")
}

const initAdminNotifications = (usuario) => {
    if (!canUseAdminNotifications(usuario)) return
    const slot = document.getElementById("notificationNavSlot")
    if (!slot) return

    slot.textContent = ''
    const dropdown = document.createElement('div')
    dropdown.className = 'dropdown'
    const btn = document.createElement('button')
    btn.className = 'btn btn-outline-light btn-sm position-relative'
    btn.type = 'button'
    btn.id = 'notificationsDropdownBtn'
    btn.setAttribute('data-bs-toggle', 'dropdown')
    btn.setAttribute('data-bs-auto-close', 'outside')
    btn.setAttribute('aria-expanded', 'false')
    btn.setAttribute('aria-label', 'Notificaciones')
    const bell = document.createElement('i')
    bell.className = 'bi bi-bell'
    btn.appendChild(bell)
    const unreadBadge = document.createElement('span')
    unreadBadge.id = 'notificationsUnreadBadge'
    unreadBadge.className = 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none'
    unreadBadge.textContent = '0'
    btn.appendChild(unreadBadge)
    const menu = document.createElement('div')
    menu.className = 'dropdown-menu dropdown-menu-end p-0 nav-notification-menu'
    menu.setAttribute('aria-labelledby', 'notificationsDropdownBtn')
    const header = document.createElement('div')
    header.className = 'd-flex align-items-center justify-content-between px-3 py-2 border-bottom'
    const strongEl = document.createElement('strong')
    strongEl.className = 'small text-uppercase'
    strongEl.textContent = 'Notificaciones'
    const markAllSlot = document.createElement('div')
    markAllSlot.id = 'markAllNotificationsSlot'
    header.appendChild(strongEl)
    header.appendChild(markAllSlot)
    const list = document.createElement('div')
    list.id = 'notificationsList'
    list.className = 'list-group list-group-flush'
    menu.appendChild(header)
    menu.appendChild(list)
    dropdown.appendChild(btn)
    dropdown.appendChild(menu)
    slot.appendChild(dropdown)

    const listEl        = document.getElementById("notificationsList")
    const unreadBadgeEl = document.getElementById("notificationsUnreadBadge")
    const markAllSlotEl = document.getElementById("markAllNotificationsSlot")
    const notificationsDropdownEl = slot.querySelector(".dropdown")
    let pendingCloseNotificationId = null
    let pendingMarkAllConfirm      = false
    let cachedNotifications        = []

    // loadNotifications definida en el scope correcto para que
    //    el handler de "marcar todas" pueda invocarla sin error de referencia.
    const loadNotifications = async () => {
        try {
            const items = await fetchUserNotifications()
            cachedNotifications = items
            renderNotifications(items)
        } catch (error) {
            showLoadError(error.message || "Error cargando notificaciones")
        }
    }

    const renderMarkAllControl = (unreadCount) => {
        if (!markAllSlotEl) return
        if (unreadCount === 0) {
            pendingMarkAllConfirm = false
            markAllSlotEl.textContent = ''
            const span = document.createElement('span')
            span.className = 'small text-muted'
            span.textContent = 'Sin pendientes'
            markAllSlotEl.appendChild(span)
            return
        }
        if (!pendingMarkAllConfirm) {
            markAllSlotEl.textContent = ''
            const btnLink = document.createElement('button')
            btnLink.type = 'button'
            btnLink.className = 'btn btn-link btn-sm text-decoration-none p-0'
            btnLink.dataset.action = 'mark-all-request'
            btnLink.textContent = 'Marcar todas'
            markAllSlotEl.appendChild(btnLink)
            return
        }
        markAllSlotEl.textContent = ''
        const wrap = document.createElement('div')
        wrap.className = 'nav-notification-markall-confirm'
        const spanC = document.createElement('span')
        spanC.className = 'small text-muted'
        spanC.textContent = '¿Marcar todas como leídas?'
        const btnC = document.createElement('button')
        btnC.type = 'button'
        btnC.className = 'btn btn-sm btn-primary'
        btnC.dataset.action = 'mark-all-confirm'
        btnC.textContent = 'Confirmar'
        const btnX = document.createElement('button')
        btnX.type = 'button'
        btnX.className = 'btn btn-sm btn-outline-secondary'
        btnX.dataset.action = 'mark-all-cancel'
        btnX.textContent = 'Cancelar'
        wrap.appendChild(spanC)
        wrap.appendChild(btnC)
        wrap.appendChild(btnX)
        markAllSlotEl.appendChild(wrap)
    }

    const renderNotifications = (items) => {
        if (!listEl || !unreadBadgeEl) return
        const unreadCount = items.filter(i => !i.is_read).length
        unreadBadgeEl.textContent = String(unreadCount)
        unreadBadgeEl.classList.toggle("d-none", unreadCount === 0)
        renderMarkAllControl(unreadCount)

        if (items.length === 0) {
            listEl.textContent = ''
            const empty = document.createElement('div')
            empty.className = 'px-3 py-3 text-muted small'
            empty.textContent = 'No hay notificaciones'
            listEl.appendChild(empty)
            return
        }
        listEl.textContent = ''
        items.forEach((item) => {
            const unreadClass   = item.is_read ? '' : ' nav-notification-item-unread'
            const safeTitle     = escapeHtml(item.title || 'Notificación')
            const safeMessage   = escapeHtml(item.message || '')
            const safeDate      = escapeHtml(formatNotificationDate(item.created_at))
            const isPendingConfirm = String(item.id) === String(pendingCloseNotificationId)

            const itemEl = document.createElement('div')
            itemEl.className = `list-group-item nav-notification-item${unreadClass}`
            itemEl.dataset.notificationId   = String(item.id)
            itemEl.dataset.notificationRead = String(Boolean(item.is_read))

            const row = document.createElement('div')
            row.className = 'nav-notification-item-row'
            const dotWrapper = document.createElement('div')
            dotWrapper.className = 'nav-notification-dot-wrapper'
            const dot = document.createElement('span')
            dot.className = `nav-notification-dot ${item.is_read ? 'invisible' : ''}`
            dotWrapper.appendChild(dot)

            const content = document.createElement('div')
            content.className = 'nav-notification-content text-start'
            const titleEl = document.createElement('div')
            titleEl.className = 'small fw-semibold text-dark'
            titleEl.textContent = safeTitle
            const msgEl = document.createElement('div')
            msgEl.className = 'small text-muted mt-1'
            msgEl.textContent = safeMessage
            const dateEl = document.createElement('div')
            dateEl.className = 'small text-secondary mt-2'
            const iconClock = document.createElement('i')
            iconClock.className = 'bi bi-clock me-1'
            iconClock.setAttribute('aria-hidden', 'true')
            dateEl.appendChild(iconClock)
            dateEl.appendChild(document.createTextNode(safeDate))
            content.appendChild(titleEl)
            content.appendChild(msgEl)
            content.appendChild(dateEl)

            if (isPendingConfirm) {
                const confirmDiv = document.createElement('div')
                confirmDiv.className = 'nav-notification-confirm mt-2'
                const span = document.createElement('span')
                span.className = 'small text-muted'
                span.textContent = '¿Confirmar marcar como leído?'
                const actionsWrap = document.createElement('div')
                actionsWrap.className = 'nav-notification-confirm-actions mt-2'
                const btnCf = document.createElement('button')
                btnCf.type = 'button'
                btnCf.className = 'btn btn-sm btn-primary'
                btnCf.dataset.action = 'confirm-close'
                btnCf.dataset.notificationId = String(item.id)
                btnCf.textContent = 'Confirmar'
                const btnCa = document.createElement('button')
                btnCa.type = 'button'
                btnCa.className = 'btn btn-sm btn-outline-secondary'
                btnCa.dataset.action = 'cancel-close'
                btnCa.dataset.notificationId = String(item.id)
                btnCa.textContent = 'Cancelar'
                actionsWrap.appendChild(btnCf)
                actionsWrap.appendChild(btnCa)
                confirmDiv.appendChild(span)
                confirmDiv.appendChild(actionsWrap)
                content.appendChild(confirmDiv)
            }

            const actionsDiv = document.createElement('div')
            if (!item.is_read) {
                const closeBtn = createActionButton(
                    'btn btn-outline-secondary btn-sm nav-notification-close-btn',
                    'request-close', item.id, 'Cerrar notificación', 'bi bi-x-lg')
                closeBtn.setAttribute('aria-label', 'Cerrar notificación')
                actionsDiv.appendChild(closeBtn)
            }

            row.appendChild(dotWrapper)
            row.appendChild(content)
            row.appendChild(actionsDiv)
            itemEl.appendChild(row)
            listEl.appendChild(itemEl)
        })
    }

    const showLoadError = (message) => {
        if (!listEl) return
        listEl.textContent = ''
        const err = document.createElement('div')
        err.className = 'px-3 py-3 text-danger small'
        err.textContent = String(message || '')
        listEl.appendChild(err)
    }

    const handleStoreUpdate = (items) => {
        cachedNotifications = Array.isArray(items) ? items : []
        renderNotifications(cachedNotifications)
    }

    if (window.notificationStore) {
        handleStoreUpdate(window.notificationStore.getCached())
        window.notificationStore.subscribe(handleStoreUpdate)
    } else {
        loadNotifications()
        window.setInterval(loadNotifications, 30000)
    }

    if (markAllSlotEl) {
        markAllSlotEl.addEventListener("click", async (event) => {
            const actionTarget = event.target.closest("[data-action]")
            if (!actionTarget) return
            const action = actionTarget.dataset.action
            if (action === "mark-all-request") {
                pendingMarkAllConfirm = true
                renderMarkAllControl(cachedNotifications.filter(i => !i.is_read).length)
                return
            }
            if (action === "mark-all-cancel") {
                pendingMarkAllConfirm = false
                renderMarkAllControl(cachedNotifications.filter(i => !i.is_read).length)
                return
            }
            if (action === "mark-all-confirm") {
                try {
                    await markAllNotificationsAsRead()
                    pendingMarkAllConfirm      = false
                    pendingCloseNotificationId = null
                    // ✅ BUG FIX: loadNotifications está en scope, no falla
                    await loadNotifications()
                } catch (error) {
                    showLoadError(error.message || "No se pudieron actualizar las notificaciones")
                }
            }
        })
    }

    if (listEl) {
        listEl.addEventListener("click", async (event) => {
            const actionTarget = event.target.closest("[data-action]")
            if (!actionTarget) return
            const action         = actionTarget.dataset.action
            const notificationId = actionTarget.dataset.notificationId
            if (!action || !notificationId) return
            if (action === "request-close") {
                pendingCloseNotificationId = notificationId
                renderNotifications(cachedNotifications)
                return
            }
            if (action === "cancel-close") {
                pendingCloseNotificationId = null
                renderNotifications(cachedNotifications)
                return
            }
            if (action === "confirm-close") {
                try {
                    await markNotificationAsRead(notificationId)
                    pendingCloseNotificationId = null
                    // ✅ BUG FIX: en scope correcto
                    await loadNotifications()
                } catch (error) {
                    showLoadError(error.message || "No se pudo cerrar la notificación")
                }
            }
        })
    }

    if (notificationsDropdownEl) {
        notificationsDropdownEl.addEventListener("shown.bs.dropdown",  lockBodyScroll)
        notificationsDropdownEl.addEventListener("hidden.bs.dropdown", unlockBodyScroll)
        window.addEventListener("resize", unlockBodyScroll)
    }
}

// ── Notification store global ──────────────────────────────────────────────
;(() => {
    if (window.notificationStore) return
    let cache = []
    let subs  = []
    const notifySubs = () => subs.forEach(s => { try { s(cache) } catch (e) { console.error(e) } })

    const load = async () => {
        try {
            cache = Array.isArray(await fetchUserNotifications()
                .then(items => items)) ? await fetchUserNotifications() : []
            notifySubs()
        } catch (error) {
            console.error('Error cargando notificaciones', error)
        }
    }

    const markAsRead = async (id) => {
        try {
            await markNotificationAsRead(id)
            await load()
        } catch (error) {
            console.error('Error marcando notificación como leída', error)
            throw error
        }
    }

    window.notificationStore = {
        getCached:  () => cache,
        load,
        markAsRead,
        subscribe: (fn) => {
            if (typeof fn !== 'function') return () => {}
            subs.push(fn)
            return () => { subs = subs.filter(s => s !== fn) }
        }
    }

    load()
    window.setInterval(load, 30000)
})()

// ── Notificaciones para conductor (vistas no-admin) ───────────────────────
const initUserNotifications = (usuario) => {
    const path = window.location.pathname.replace(/\\/g, "/")
    if (path.includes('/module/admin-it/') || path.includes('/module/itmaintenance/')) return

    const slot = document.getElementById("notificationNavSlot")
    if (!slot) return

    slot.textContent = ''
    const dd = document.createElement('div')
    dd.className = 'dropdown'
    const userBtn = document.createElement('button')
    userBtn.className = 'btn btn-outline-light btn-sm position-relative'
    userBtn.type = 'button'
    userBtn.id = 'userNotificationsDropdownBtn'
    userBtn.setAttribute('data-bs-toggle', 'dropdown')
    userBtn.setAttribute('data-bs-auto-close', 'outside')
    userBtn.setAttribute('aria-expanded', 'false')
    userBtn.setAttribute('aria-label', 'Notificaciones')
    const bell = document.createElement('i')
    bell.className = 'bi bi-bell'
    userBtn.appendChild(bell)
    const badge = document.createElement('span')
    badge.id = 'userNotificationsUnreadBadge'
    badge.className = 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none'
    badge.textContent = '0'
    userBtn.appendChild(badge)
    const menu = document.createElement('div')
    menu.className = 'dropdown-menu dropdown-menu-end p-0 nav-notification-menu'
    menu.setAttribute('aria-labelledby', 'userNotificationsDropdownBtn')
    const header = document.createElement('div')
    header.className = 'px-3 py-2 border-bottom'
    const strongEl = document.createElement('strong')
    strongEl.className = 'small text-uppercase'
    strongEl.textContent = 'Notificaciones'
    header.appendChild(strongEl)
    const listDiv = document.createElement('div')
    listDiv.id = 'userNotificationsList'
    listDiv.className = 'list-group list-group-flush'
    menu.appendChild(header)
    menu.appendChild(listDiv)
    dd.appendChild(userBtn)
    dd.appendChild(menu)
    slot.appendChild(dd)

    const listEl  = document.getElementById('userNotificationsList')
    const badgeEl = document.getElementById('userNotificationsUnreadBadge')

    const render = (items) => {
        if (!listEl || !badgeEl) return
        const unreadCount = items.filter(i => !i.is_read).length
        badgeEl.textContent = String(unreadCount)
        badgeEl.classList.toggle('d-none', unreadCount === 0)

        if (items.length === 0) {
            listEl.textContent = ''
            const emptyDiv = document.createElement('div')
            emptyDiv.className = 'px-3 py-3 text-muted small'
            emptyDiv.textContent = 'No hay notificaciones'
            listEl.appendChild(emptyDiv)
            return
        }
        listEl.textContent = ''
        items.forEach(item => {
            const wrapper = document.createElement('div')
            wrapper.className = 'list-group-item ' + (item.is_read ? '' : 'fw-semibold')
            const t = document.createElement('div')
            t.className = 'small'
            t.textContent = item.title || 'Notificación'
            const m = document.createElement('div')
            m.className = 'small text-muted'
            m.textContent = item.message || ''
            const d = document.createElement('div')
            d.className = 'small text-secondary mt-1'
            const ic = document.createElement('i')
            ic.className = 'bi bi-clock me-1'
            ic.setAttribute('aria-hidden', 'true')
            d.appendChild(ic)
            d.appendChild(document.createTextNode(formatNotificationDate(item.created_at)))
            wrapper.appendChild(t)
            wrapper.appendChild(m)
            wrapper.appendChild(d)
            if (!item.is_read) {
                const actionWrap = document.createElement('div')
                actionWrap.className = 'mt-2'
                const btn = document.createElement('button')
                btn.dataset.nid = item.id
                btn.className = 'btn btn-sm btn-outline-primary user-mark-read'
                btn.textContent = 'Marcar leída'
                actionWrap.appendChild(btn)
                wrapper.appendChild(actionWrap)
            }
            listEl.appendChild(wrapper)
        })
    }

    slot.addEventListener('click', async (ev) => {
        const btn = ev.target.closest('.user-mark-read')
        if (!btn) return
        const nid = btn.dataset.nid
        try {
            if (window.notificationStore?.markAsRead) {
                await window.notificationStore.markAsRead(nid)
            } else {
                await markNotificationAsRead(nid)
            }
        } catch (error) {
            console.error('Error marcando notificación', error)
        }
    })

    if (window.notificationStore) {
        render(window.notificationStore.getCached())
        window.notificationStore.subscribe(render)
    } else {
        const reload = async () => {
            try { render(await fetchUserNotifications()) }
            catch (error) { console.error('Error cargando notificaciones', error) }
        }
        reload()
        window.setInterval(reload, 30000)
    }
}

// ── DOMContentLoaded ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const usuario = await getCurrentUser()

        if (!usuario) {
            window.location.href = getLoginPath()
            return
        }

        // SEGURIDAD: limpiar cualquier dato residual de versiones anteriores
        try { localStorage.removeItem('hirata_session') } catch (_) {}

        const currentPath = window.location.pathname.replace(/\\/g, "/")
        const expectedFragment = ROLE_PATH_FRAGMENTS[usuario.role]

        // Redirigir si el usuario está en el módulo equivocado
        if (expectedFragment && !currentPath.includes(expectedFragment)) {
            window.location.href = ROLE_ROUTES[usuario.role]
            return
        }

        initNavbarUser(usuario)
        initAdminNotifications(usuario)
        initLogoutControl()
        initUserNotifications(usuario)

    } catch (error) {
        console.error("Error leyendo usuario:", error)
    }
})
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
const alertTimers = new WeakMap()

const ALERT_ICONS = {
    success: 'bi-check-circle-fill',
    danger: 'bi-x-octagon-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
    secondary: 'bi-bell'
}

const AUTO_CLOSE_TYPES = new Set(['success', 'info'])
const PERSISTENT_CLOSE_TYPES = new Set(['danger', 'warning'])

const clearAlertTimer = (element) => {
    const timer = alertTimers.get(element)
    if (timer) {
        clearTimeout(timer)
        alertTimers.delete(element)
    }
}

export const clearAlert = (element) => {
    if (!element) return
    clearAlertTimer(element)
    const activeToast = element.querySelector('.hirata-toast')
    if (!activeToast) {
        element.innerHTML = ''
        return
    }
    activeToast.classList.remove('is-visible')
    activeToast.classList.add('is-leaving')
    setTimeout(() => {
        if (!element.querySelector('.hirata-toast.is-visible')) {
            element.innerHTML = ''
        }
    }, 240)
}

export function initSidebarLogic(prefKey = 'sidebar_collapsed') {
    const toggleBtnDesktop = document.getElementById('toggleSidebarBtn');
    const toggleBtnMobile = document.getElementById('toggleSidebarBtnMobile');
    const sidebarCol = document.getElementById('sidebarCol');
    const sidebar = document.getElementById('admSidebar');
    const contentCol = document.getElementById('contentCol');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const sidebarLinks = document.querySelectorAll('.adm-sidebar-link');
    const sections = document.querySelectorAll('.adm-section');

    if (!sidebarCol || !sidebar || !contentCol) return;

    const isDesktop = () => window.matchMedia('(min-width: 992px)').matches;

    const setDesktopSidebarState = (collapsed, persist = true) => {
        sidebar.classList.toggle('is-collapsed', collapsed);
        sidebarCol.classList.toggle('is-collapsed', collapsed);
        if (toggleBtnDesktop) toggleBtnDesktop.setAttribute('aria-expanded', String(!collapsed));

        if (persist) {
            localStorage.setItem(prefKey, collapsed ? 'collapsed' : 'expanded');
        }
    };

    const hideMobileSidebar = () => {
        closeMobileSidebar();
        sidebarCol.classList.add('d-none');
    };

    const openMobileSidebar = () => {
        sidebarCol.classList.remove('d-none');
        sidebarCol.classList.add('sidebar-mobile-open');
        if (sidebarBackdrop) sidebarBackdrop.classList.add('is-visible');
        document.body.classList.add('sidebar-mobile-open');
    };

    const closeMobileSidebar = () => {
        sidebarCol.classList.remove('sidebar-mobile-open');
        if (sidebarBackdrop) sidebarBackdrop.classList.remove('is-visible');
        document.body.classList.remove('sidebar-mobile-open');
    };

    const syncSidebarForViewport = () => {
        if (isDesktop()) {
            closeMobileSidebar();
            const savedCollapsed = localStorage.getItem(prefKey) === 'collapsed';
            setDesktopSidebarState(savedCollapsed, false);
            return;
        }

        setDesktopSidebarState(false, false);
        hideMobileSidebar();
    };

    const showSection = (targetId) => {
        sections.forEach((section) => {
            section.classList.toggle('d-none', section.id !== targetId);
        });
    };

    sidebarLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = link.dataset.sectionTarget;
            if (!targetId) return;

            sidebarLinks.forEach((item) => item.classList.remove('active'));
            link.classList.add('active');
            showSection(targetId);

            if (!isDesktop()) {
                hideMobileSidebar();
            }
        });
    });

    if (toggleBtnDesktop) {
        toggleBtnDesktop.addEventListener('click', () => {
            const collapsed = !sidebar.classList.contains('is-collapsed');
            setDesktopSidebarState(collapsed);
        });
    }

    if (toggleBtnMobile) {
        toggleBtnMobile.addEventListener('click', () => {
            const isOpen = sidebarCol.classList.contains('sidebar-mobile-open');
            if (isOpen) {
                hideMobileSidebar();
                return;
            }
            openMobileSidebar();
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            hideMobileSidebar();
        });
    }

    syncSidebarForViewport();
    window.addEventListener('resize', syncSidebarForViewport);
}

export function renderSidebar(containerId, items, prefKey) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <aside class="adm-sidebar card h-100" id="admSidebar">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3 adm-sidebar-header">
                    <h4 class="h6 text-uppercase text-muted mb-0 adm-sidebar-title">Menú</h4>
                    <button type="button" id="toggleSidebarBtn" class="btn btn-outline-primary btn-sm d-none d-lg-inline-flex">
                        <i class="bi bi-list"></i>
                    </button>
                </div>
                <nav class="d-flex flex-column gap-2">
                    ${items.map(item => `
                        <a class="adm-sidebar-link ${item.active ? 'active' : ''}" href="#" data-section-target="${item.target}">
                            <i class="${item.icon} me-2"></i>
                            <span class="adm-sidebar-label">${item.label}</span>
                        </a>
                    `).join('')}
                </nav>
            </div>
        </aside>
    `;

    // Inicializar lógica después de agregar al DOM
    setTimeout(() => {
    initSidebarLogic(prefKey);
    }, 0);
}

// Muestra mensajes como toasts temporales con iconografia y animacion.
export const setAlert = (element, message, type = "danger", duration = 5000) => {
    if (!element) return
    if (!message) {
        clearAlert(element)
        return
    }

    clearAlertTimer(element)
    element.classList.add('hirata-toast-host')
    element.innerHTML = ''

    const toast = document.createElement('div')
    toast.className = `hirata-toast hirata-toast-${type}`
    toast.setAttribute('role', type === 'danger' ? 'alert' : 'status')
    toast.setAttribute('aria-live', type === 'danger' ? 'assertive' : 'polite')

    const content = document.createElement('div')
    content.className = 'hirata-toast-content'

    const icon = document.createElement('i')
    icon.className = `bi ${ALERT_ICONS[type] || ALERT_ICONS.info} hirata-toast-icon`
    icon.setAttribute('aria-hidden', 'true')

    const text = document.createElement('span')
    text.className = 'hirata-toast-text'
    text.textContent = message

    content.appendChild(icon)
    content.appendChild(text)
    toast.appendChild(content)

    const shouldAutoClose = AUTO_CLOSE_TYPES.has(type) && duration > 0
    const shouldShowClose = PERSISTENT_CLOSE_TYPES.has(type) || !shouldAutoClose

    if (shouldShowClose) {
        const closeBtn = document.createElement('button')
        closeBtn.type = 'button'
        closeBtn.className = 'hirata-toast-close'
        closeBtn.setAttribute('aria-label', 'Cerrar notificacion')
        closeBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>'
        closeBtn.addEventListener('click', () => clearAlert(element))
        toast.appendChild(closeBtn)
    }

    element.appendChild(toast)

    requestAnimationFrame(() => {
        toast.classList.add('is-visible')
    })

    if (shouldAutoClose) {
        const timerId = setTimeout(() => {
            clearAlert(element)
        }, duration)
        alertTimers.set(element, timerId)
    }
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
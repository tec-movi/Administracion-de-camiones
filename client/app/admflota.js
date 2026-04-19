import { requestJson, setAlert } from "./shared.js"

// Endpoints backend usados por el módulo de administración de flota.
const API_TRUCKS_URL = 'http://localhost:8000/api/trucks'
const API_DRIVERS_URL = 'http://localhost:8000/api/users'
const API_REGISTER_URL = 'http://localhost:8000/api/sessions/register'
const API_ASSIGNMENTS_URL = 'http://localhost:8000/api/assignments'

// Cache local de conductores activos para reutilizar en selects.
let activeDrivers = []

const setTruckAlert = (message, type = 'danger') => {
  setAlert(document.getElementById('truckAlert'), message, type)
}

const setDriverAlert = (message, type = 'danger') => {
  setAlert(document.getElementById('driverAlert'), message, type)
}

// Carga conductores activos desde backend para usar en la tabla de asignación.
const loadDrivers = async () => {
  const data = await requestJson(API_DRIVERS_URL, {
    method: "GET",
    credentials: "include",
    headers: { 'Content-type': 'application/json' }
  }, 'No se pudieron cargar los conductores')

  const drivers = Array.isArray(data.payload) ? data.payload : []
  activeDrivers = drivers

  const driverSelect = document.getElementById('truckDriver')
  if (driverSelect) {
    driverSelect.innerHTML = '<option value="">Selecciona conductor</option>'

    for (const driver of drivers) {
      const option = document.createElement('option')
      option.value = driver.id
      option.textContent = `${driver.full_name} (${driver.email})`
      driverSelect.appendChild(option)
    }
  }
}

// Construye el select HTML por fila para reasignar conductor en tabla.
const buildDriverSelect = (truckId, selectedDriverId) => {
  const container = document.createElement('div')
  container.className = 'd-flex gap-2'

  const select = document.createElement('select')
  select.className = 'form-select form-select-sm js-driver-select'
  select.dataset.truckId = truckId

  const defaultOption = document.createElement('option')
  defaultOption.value = ''
  defaultOption.textContent = 'Selecciona conductor'
  select.appendChild(defaultOption)

  for (const driver of activeDrivers) {
    const option = document.createElement('option');
    option.value = driver.id;
    option.textContent = driver.full_name;

    if (Number(selectedDriverId) === Number(driver.id)) {
      option.selected = true;
    }

    select.appendChild(option);
  }

  const button = document.createElement('button')
  button.className = 'btn btn-primary btn-sm js-assign-btn'
  button.dataset.truckId = truckId
  button.textContent = 'Asignar'

  container.appendChild(select);
  container.appendChild(button);

  return container;
};

// Carga listado de camiones y lo renderiza en la tabla principal.
const loadTrucks = async () => {
  const tbody = document.getElementById('trucksTableBody')
  if (!tbody) return

  const [trucksRes, assignmentsRes] = await Promise.all([
    requestJson(API_TRUCKS_URL, { credentials: "include" }, 'No se pudieron cargar los camiones'),
    requestJson(API_ASSIGNMENTS_URL, { credentials: "include" }, 'No se pudieron cargar las asignaciones')
  ])

  const trucks = Array.isArray(trucksRes.payload) ? trucksRes.payload : []
  const assignments = Array.isArray(assignmentsRes.payload) ? assignmentsRes.payload : []

  const assignmentMap = {}
  for (const a of assignments) {
    assignmentMap[a.truck_id] = a.driver_id
  }

  tbody.innerHTML = ''

  if (trucks.length === 0) {
    const row = document.createElement('tr')
    row.innerHTML = '<td colspan="5" class="text-muted">Sin registros</td>'
    tbody.appendChild(row)
    return
  }

  for (const truck of trucks) {
    const assignedDriverId = assignmentMap[truck.id] || null

    const row = document.createElement('tr')

    row.innerHTML = `
      <td>${truck.plate_number || '-'}</td>
      <td>${truck.brand || '-'}</td>
      <td>${truck.model || '-'}</td>
      <td>${truck.year || '-'}</td>
    `;

    const driverCell = document.createElement('td')
    driverCell.appendChild(buildDriverSelect(truck.id, assignedDriverId))

    row.appendChild(driverCell)
    tbody.appendChild(row)
  }
};

// Actualiza conductor asignado de un camión puntual.
const assignTruckToDriver = async (truckId, driverId) => {
  const response = await fetch(`${API_ASSIGNMENTS_URL}/assign`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      driver_id: Number(driverId),
      truck_id: Number(truckId)
    })
  });

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo asignar el vehículo')
  }

  return data
};

const reassignTruck = async (truckId, driverId) => {
  const response = await fetch(`${API_ASSIGNMENTS_URL}/reassign`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      driver_id: Number(driverId),
      truck_id: Number(truckId)
    })
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo reasignar')
  }

  return data
}

// Envía alta de camión nuevo usando datos del formulario.
const registerTruck = async (event) => {
  event.preventDefault()

  const plate_number = document.getElementById('truckPlate')?.value?.trim()?.toUpperCase()
  const brand = document.getElementById('truckBrand')?.value?.trim()
  const model = document.getElementById('truckModel')?.value?.trim()
  const year = document.getElementById('truckYear')?.value

  if (!plate_number || !brand || !model || !year) {
    setTruckAlert('Completa todos los campos para registrar el camión')
    return
  }

  const truckData = {
    plate_number,
    brand,
    model,
    year: Number(year)
  }

  await requestJson(API_TRUCKS_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(truckData)
  }, 'No se pudo registrar el camión')

  setTruckAlert('Camión registrado correctamente', 'success')
  document.getElementById('truckForm')?.reset()
  await loadTrucks()
}

// Envía alta de conductor nuevo desde módulo de flota.
const registerDriver = async (event) => {
  event.preventDefault()

  const fullName = document.getElementById('driverFullName')?.value?.trim()
  const email = document.getElementById('driverEmail')?.value?.trim()?.toLowerCase()
  const password = document.getElementById('driverPassword')?.value

  if (!fullName || !email || !password) {
    setDriverAlert('Completa todos los campos para registrar el conductor')
    return
  }

  const data = await requestJson(API_REGISTER_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: fullName, email, password })
  }, 'No se pudo registrar el conductor')

  if (data.status !== 'success') {
    throw new Error(data.error || data.message || 'No se pudo registrar el conductor')
  }

  setDriverAlert('Conductor registrado correctamente', 'success')
  document.getElementById('newDriverForm')?.reset()
  await loadDrivers()
}

// Inicializa navegación lateral (secciones + colapso desktop + toggle móvil).
const initSidebar = () => {
  const sidebarLinks = document.querySelectorAll('.adm-sidebar-link[data-section-target]')
  const sections = document.querySelectorAll('.adm-section')
  const toggleBtnDesktop = document.getElementById('toggleSidebarBtn')
  const toggleBtnMobile = document.getElementById('toggleSidebarBtnMobile')
  const sidebarCol = document.getElementById('sidebarCol')
  const sidebar = document.getElementById('admSidebar')
  const contentCol = document.getElementById('contentCol')

  const isDesktop = () => window.matchMedia('(min-width: 992px)').matches

  const showSection = (targetId) => {
    sections.forEach((section) => {
      section.classList.toggle('d-none', section.id !== targetId)
    })
  }

  sidebarLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      const targetId = link.dataset.sectionTarget
      if (!targetId) return

      sidebarLinks.forEach((item) => item.classList.remove('active'))
      link.classList.add('active')
      showSection(targetId)

      if (!isDesktop()) {
        sidebarCol?.classList.add('d-none')
      }
    })
  })

  if (toggleBtnDesktop && sidebarCol && sidebar && contentCol) {
    toggleBtnDesktop.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('is-collapsed')
      if (collapsed) {
        sidebarCol.classList.remove('col-lg-3')
        sidebarCol.classList.add('col-lg-1')
        contentCol.classList.remove('col-lg-9')
        contentCol.classList.add('col-lg-11')
      } else {
        sidebarCol.classList.remove('col-lg-1')
        sidebarCol.classList.add('col-lg-3')
        contentCol.classList.remove('col-lg-11')
        contentCol.classList.add('col-lg-9')
      }
    })
  }

  if (toggleBtnMobile && sidebarCol) {
    toggleBtnMobile.addEventListener('click', () => {
      sidebarCol.classList.toggle('d-none')
    })
  }

  const activeLink = document.querySelector('.adm-sidebar-link.active[data-section-target]')
  showSection(activeLink?.dataset.sectionTarget || 'registerTruckSection')
}

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar()

  try {
    await loadDrivers()
    await loadTrucks()
  } catch (error) {
    setTruckAlert(error.message || 'Error al cargar datos iniciales')
  }

  const form = document.getElementById('truckForm')
  if (form) {
    form.addEventListener('submit', async (event) => {
      try {
        await registerTruck(event)
      } catch (error) {
        showAlert(error.message || 'Error al registrar camión')
      }
    })
  }

  const trucksTableBody = document.getElementById('trucksTableBody')

  if (trucksTableBody) {
    trucksTableBody.addEventListener('click', async (event) => {
      const btn = event.target.closest('.js-assign-btn')
      if (!btn) return

      const truckId = btn.dataset.truckId

      const select = trucksTableBody.querySelector(
        `.js-driver-select[data-truck-id="${truckId}"]`
      )

      const driverId = select.value

      if (!driverId) {
        setTruckAlert('Selecciona un conductor válido', 'danger')
        return
      }

      try {
        await assignTruckToDriver(truckId, driverId)
        setTruckAlert('Vehículo asignado correctamente', 'success')
        await loadTrucks()
      } catch (error) {
        if (error.message.includes('ya está en uso')) {
          const confirmReplace = confirm('Este camión ya tiene un conductor asignado. \n¿Deseas reemplazarlo?')
          if (!confirmReplace) return

          await reassignTruck(truckId, driverId)
          setTruckAlert('Vehículo reasignado correctamente', 'success')
          await loadTrucks()
          return
        }

        setTruckAlert(error.message || 'No se pudo asignar el vehículo')
      }
    })
  }

  const newDriverForm = document.getElementById('newDriverForm')
  if (newDriverForm) {
    newDriverForm.addEventListener('submit', async (event) => {
      try {
        await registerDriver(event)
      } catch (error) {
        setDriverAlert(error.message || 'Error al registrar conductor')
      }
    })
  }
})
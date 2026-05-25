import { requestJson, setAlert, renderSidebar } from "./shared.js"

// Endpoints backend usados por el módulo de administración de flota.
const API_TRUCKS_URL = 'http://localhost:8000/api/trucks'
const API_AVAILABLE_DRIVERS_URL = 'http://localhost:8000/api/users/available-drivers'
const API_REGISTER_URL = 'http://localhost:8000/api/sessions/register'
const API_ASSIGNMENTS_URL = 'http://localhost:8000/api/assignments'

const SIDEBAR_PREF_KEY = 'admflota_sidebar_collapsed'

const toPayloadArray = (payload) => (Array.isArray(payload) ? payload : [])
const toAssignmentBody = (truckId, driverId) => ({
  driver_id: Number(driverId),
  truck_id: Number(truckId)
})

const runAsync = (handler, onError) => async (event) => {
  try {
    await handler(event)
  } catch (error) {
    onError(error)
  }
}

const requestAssignment = async (path, method, body, fallbackError) => {
  const response = await fetch(`${API_ASSIGNMENTS_URL}/${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }

  return data
}

const isActiveAssignment = ({ active }) => Boolean(Number(active))

const getAssignmentMapByTruck = (assignments) => {
  return assignments.reduce((acc, assignment) => {
    if (isActiveAssignment(assignment)) {
      acc[assignment.truck_id] = assignment
    }
    return acc
  }, {})
}

const setTruckAlert = (message, type = 'danger') => {
  setAlert(document.getElementById('truckAlert'), message, type)
}

const setDriverAlert = (message, type = 'danger') => {
  setAlert(document.getElementById('driverAlert'), message, type)
}

const getAvailableDrivers = async () => {
  const data = await requestJson(
    API_AVAILABLE_DRIVERS_URL,
    { credentials: 'include' },
    'No se pudieron cargar los conductores disponibles'
  )

  return toPayloadArray(data.payload)
}

const buildActionButtonHtml = (truckId, activeAssignment) => {
  if (!activeAssignment) {
    return `<button type="button" class="btn btn-primary btn-sm js-open-assign-modal" data-truck-id="${truckId}">Asignar conductor</button>`
  }

  return `<button type="button" class="btn btn-danger btn-sm js-unassign-btn" data-assignment-id="${activeAssignment.id}">Desvincular</button>`
}

// Carga listado de camiones y lo renderiza en la tabla principal.
const loadTrucks = async () => {
  const tbody = document.getElementById('trucksTableBody')
  if (!tbody) return

  const [trucksRes, assignmentsRes] = await Promise.all([
    requestJson(API_TRUCKS_URL, { credentials: "include" }, 'No se pudieron cargar los camiones'),
    requestJson(API_ASSIGNMENTS_URL, { credentials: "include" }, 'No se pudieron cargar las asignaciones')
  ])

  const trucks = toPayloadArray(trucksRes.payload)
  const assignments = toPayloadArray(assignmentsRes.payload)
  const assignmentMap = getAssignmentMapByTruck(assignments)

  tbody.innerHTML = ''

  if (trucks.length === 0) {
    const row = document.createElement('tr')
    row.innerHTML = '<td colspan="6" class="text-muted">Sin registros</td>'
    tbody.appendChild(row)
    return
  }

  trucks.forEach((truck) => {
    const activeAssignment = assignmentMap[truck.id] || null
    const driverName = activeAssignment?.driver_name || 'Sin asignar'

    const row = document.createElement('tr')

    row.innerHTML = `
      <td>${truck.plate_number || '-'}</td>
      <td>${truck.brand || '-'}</td>
      <td>${truck.model || '-'}</td>
      <td>${truck.year || '-'}</td>
      <td>${driverName}</td>
      <td>${buildActionButtonHtml(truck.id, activeAssignment)}</td>
    `;

    tbody.appendChild(row)
  })
};

// Actualiza conductor asignado de un camión puntual.
const assignTruckToDriver = async (truckId, driverId) => {
  return requestAssignment('assign', 'POST', toAssignmentBody(truckId, driverId), 'No se pudo asignar el vehículo')
};

const unassignTruckFromDriver = async (assignmentId) => {
  return requestAssignment(
    'unassign',
    'PATCH',
    { assignment_id: Number(assignmentId) },
    'No se pudo desvincular el conductor'
  )
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

// Envía alta de usuario nuevo desde módulo de flota.
const registerDriver = async (event) => {
  event.preventDefault()

  const fullName = document.getElementById('driverFullName')?.value?.trim()
  const roleName = document.getElementById('rol')?.value
  const email = document.getElementById('driverEmail')?.value?.trim()?.toLowerCase()
  const password = document.getElementById('driverPassword')?.value

  if (!fullName || !email || !password || !roleName) {
    setDriverAlert('Completa todos los campos para registrar el usuario')
    return
  }

  const roleMap = {
    superadmin: 2,
    admin: 1,
    maintenance: 4,
    it_tech: 5,
    driver: 3
  }

  const role_id = roleMap[roleName]

  if (!role_id) {
    setDriverAlert('Selecciona un rol válido para registrar el usuario')
    return
  }

  const data = await requestJson(API_REGISTER_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: fullName, email, password, role_id })
  }, 'No se pudo registrar el usuario')

  if (data.status !== 'success') {
    throw new Error(data.error || data.message || 'No se pudo registrar el usuario')
  }

  setDriverAlert('Usuario agregado correctamente', 'success')
  document.getElementById('newDriverForm')?.reset()
}

// Inicializa navegación lateral (secciones + colapso desktop + toggle móvil).
const initSidebar = () => {
  renderSidebar('sidebarCol', [
    { label: 'Registrar camión', icon: 'bi bi-truck', target: 'registerTruckSection', active: true },
    { label: 'Camiones registrados', icon: 'bi bi-list-ul', target: 'trucksTableSection' },
    { label: 'Agregar usuario', icon: 'bi bi-person-plus', target: 'newDriverSection' }
  ], SIDEBAR_PREF_KEY)
}

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar()

  const assignDriverModalEl = document.getElementById('assignDriverModal')
  const assignDriverForm = document.getElementById('assignDriverForm')
  const assignTruckIdInput = document.getElementById('assignTruckId')
  const assignDriverSelect = document.getElementById('assignDriverSelect')
  const assignDriverSubmitBtn = document.getElementById('assignDriverSubmitBtn')
  const assignDriverAlert = document.getElementById('assignDriverAlert')
  const assignDriverModal = window.bootstrap?.Modal.getOrCreateInstance(assignDriverModalEl)

  const setAssignDriverOptions = (drivers) => {
    if (!assignDriverSelect) return

    assignDriverSelect.innerHTML = '<option value="" disabled selected>Selecciona conductor</option>'

    drivers.forEach(({ id, full_name }) => {
      const option = document.createElement('option')
      option.value = id
      option.textContent = full_name
      assignDriverSelect.appendChild(option)
    })
  }

  const openAssignModal = async (truckId) => {
    if (!assignDriverModal || !assignTruckIdInput || !assignDriverSelect || !assignDriverSubmitBtn) {
      return
    }

    assignTruckIdInput.value = String(truckId)
    setAlert(assignDriverAlert, '', 'secondary')
    assignDriverSelect.disabled = true
    assignDriverSubmitBtn.disabled = true
    assignDriverSelect.innerHTML = '<option value="">Cargando...</option>'
    assignDriverModal.show()

    try {
      const drivers = await getAvailableDrivers()
      setAssignDriverOptions(drivers)

      if (drivers.length === 0) {
        setAlert(assignDriverAlert, 'No hay conductores disponibles para asignar.', 'warning', 0)
        return
      }

      assignDriverSelect.disabled = false
      assignDriverSubmitBtn.disabled = false
    } catch (error) {
      setAlert(assignDriverAlert, error.message || 'No se pudieron cargar los conductores disponibles', 'danger', 0)
    }
  }

  try {
    await loadTrucks()
  } catch (error) {
    setTruckAlert(error.message || 'Error al cargar datos iniciales')
  }

  const form = document.getElementById('truckForm')
  if (form) {
    form.addEventListener('submit', runAsync(registerTruck, (error) => {
      setTruckAlert(error.message || 'Error al registrar camión')
    }))
  }

  const trucksTableBody = document.getElementById('trucksTableBody')

  if (trucksTableBody) {
    trucksTableBody.addEventListener('click', async (event) => {
      const assignBtn = event.target.closest('.js-open-assign-modal')
      if (assignBtn?.dataset.truckId) {
        await openAssignModal(assignBtn.dataset.truckId)
        return
      }

      const unassignBtn = event.target.closest('.js-unassign-btn')
      if (unassignBtn?.dataset.assignmentId) {
        try {
          await unassignTruckFromDriver(unassignBtn.dataset.assignmentId)
          setTruckAlert('Conductor desvinculado correctamente', 'success')
          await loadTrucks()
        } catch (error) {
          setTruckAlert(error.message || 'No se pudo desvincular el conductor')
        }
      }
    })
  }

  if (assignDriverForm && assignTruckIdInput && assignDriverSelect) {
    assignDriverForm.addEventListener('submit', async (event) => {
      event.preventDefault()

      const truckId = assignTruckIdInput.value
      const driverId = assignDriverSelect.value

      if (!truckId || !driverId) {
        setAlert(assignDriverAlert, 'Selecciona un conductor válido', 'danger', 0)
        return
      }

      try {
        await assignTruckToDriver(truckId, driverId)
        assignDriverModal?.hide()
        assignDriverForm.reset()
        setTruckAlert('Vehículo asignado correctamente', 'success')
        await loadTrucks()
      } catch (error) {
        setAlert(assignDriverAlert, error.message || 'No se pudo asignar el conductor', 'danger', 0)
      }
    })
  }

  const newDriverForm = document.getElementById('newDriverForm')
  if (newDriverForm) {
    newDriverForm.addEventListener('submit', runAsync(registerDriver, (error) => {
      setDriverAlert(error.message || 'Error al registrar usuario')
    }))
  }
})
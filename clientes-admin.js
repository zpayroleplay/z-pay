import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
if (user.rol !== 'admin' && user.rol !== 'superadmin') window.location.href = 'dashboard.html'

async function cargarClientes() {
  const tbody = document.getElementById('tabla-clientes')

  const { data: usuarios, error } = await supabase.rpc('listar_clientes')

  if (error || !usuarios) {
    tbody.innerHTML = '<tr><td colspan="3">Error al cargar clientes.</td></tr>'
    return
  }

  if (usuarios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">No hay clientes registrados.</td></tr>'
    return
  }

  tbody.innerHTML = ''

  for (const u of usuarios) {
    const esAdmin = u.rol === 'admin' || u.rol === 'superadmin'
    const badge = esAdmin ? '<span class="badge-admin">ADMIN</span>' : ''
    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td>${u.username}</td>
      <td>${u.nombre} ${u.apellido} ${badge}</td>
      <td><button class="btn-retirar" onclick="confirmarEliminar('${u.id}', '${u.username}')">ELIMINAR</button></td>
    `
    tbody.appendChild(fila)
  }
}

window.cerrarModal = function () {
  document.getElementById('modal-overlay').style.display = 'none'
}

window.confirmarEliminar = function (userId, username) {
  document.getElementById('modal-titulo').textContent = 'Eliminar usuario'
  document.getElementById('modal-subtitulo').textContent = `¿Confirmás la eliminación de ${username}? Esta acción no se puede deshacer.`

  document.getElementById('modal-confirmar').onclick = async () => {
    cerrarModal()
    await supabase.rpc('eliminar_usuario', { p_user_id: userId })
    cargarClientes()
  }

  document.getElementById('modal-overlay').style.display = 'flex'
}

cargarClientes()

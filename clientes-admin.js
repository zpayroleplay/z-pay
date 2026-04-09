import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
if (user.rol !== 'admin' && user.rol !== 'superadmin') window.location.href = 'dashboard.html'

async function cargarClientes() {
  const tbody = document.getElementById('tabla-clientes')

  const { data: usuarios, error } = await supabase
    .from('users')
    .select('id, username, nombre, apellido, rol')
    .order('nombre', { ascending: true })

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
    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td>${u.username}</td>
      <td>${u.nombre} ${u.apellido} ${u.rol === 'admin' || u.rol === 'superadmin' ? '<span class="badge-admin">ADMIN</span>' : ''}</td>
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
    await eliminarUsuario(userId)
  }

  document.getElementById('modal-overlay').style.display = 'flex'
}

async function eliminarUsuario(userId) {
  const { data: cuenta } = await supabase
    .from('accounts')
    .select('id, numero_cuenta')
    .eq('user_id', userId)
    .single()

  if (cuenta) {
    await supabase.from('transactions')
      .delete()
      .or(`cuenta_origen.eq.${cuenta.numero_cuenta},cuenta_destino.eq.${cuenta.numero_cuenta}`)

    await supabase.from('loans')
      .delete()
      .eq('numero_cuenta', cuenta.numero_cuenta)

    await supabase.from('debts')
      .delete()
      .eq('numero_cuenta', cuenta.numero_cuenta)

    await supabase.from('accounts')
      .delete()
      .eq('id', cuenta.id)
  }

  await supabase.from('users')
    .delete()
    .eq('id', userId)

  cargarClientes()
}

cargarClientes()

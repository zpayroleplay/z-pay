import { supabase } from './supabase.js'

// Verificamos que el usuario esté logueado
const userData = localStorage.getItem('zpay_user')
if (!userData) {
  window.location.href = 'login.html'
}

const user = JSON.parse(userData)

// Cargamos el nombre y número de cuenta
async function cargarPerfil() {
  document.getElementById('dash-nombre').textContent = `${user.nombre} ${user.apellido}`

  const { data: cuenta, error } = await supabase
    .from('accounts')
    .select('numero_cuenta')
    .eq('user_id', user.id)
    .single()

  console.log('cuenta:', cuenta, 'error:', error)

  if (cuenta) {
    document.getElementById('dash-cuenta').textContent = `Número de cuenta: ${cuenta.numero_cuenta}`
  } else {
    document.getElementById('dash-cuenta').textContent = 'Sin cuenta asignada'
  }
}
// Notificaciones sin leer
  const { data: notifs } = await supabase
    .from('notifications')
    .select('id')
    .eq('numero_cuenta', cuenta.numero_cuenta)
    .eq('leida', false)

  if (notifs && notifs.length > 0) {
    const badge = document.getElementById('notif-badge')
    badge.textContent = notifs.length
    badge.style.display = 'inline'
  }

// Cerrar sesión
window.cerrarSesion = function () {
  localStorage.removeItem('zpay_user')
  window.location.href = 'login.html'
}

cargarPerfil()
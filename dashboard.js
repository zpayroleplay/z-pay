import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) {
  window.location.href = 'login.html'
}

const user = JSON.parse(userData)

async function cargarPerfil() {
  document.getElementById('dash-nombre').textContent = `${user.nombre} ${user.apellido}`

  const { data: cuenta } = await supabase
    .from('accounts')
    .select('numero_cuenta')
    .eq('user_id', user.id)
    .single()

  if (cuenta) {
    document.getElementById('dash-cuenta').textContent = `Número de cuenta: ${cuenta.numero_cuenta}`

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
  } else {
    document.getElementById('dash-cuenta').textContent = 'Sin cuenta asignada'
  }

  // Verificamos si el usuario es gerente de alguna empresa
  const { data: empresa } = await supabase
    .from('companies')
    .select('id, nombre')
    .eq('owner_id', user.id)
    .single()

  if (empresa) {
    const tarjetaEmpresa = document.getElementById('tarjeta-empresa')
    tarjetaEmpresa.style.display = 'flex'
    document.getElementById('empresa-nombre').textContent = empresa.nombre
  }
}

document.getElementById('btn-cerrar-sesion').addEventListener('click', function () {
  localStorage.removeItem('zpay_user')
  window.location.href = 'login.html'
})

cargarPerfil()
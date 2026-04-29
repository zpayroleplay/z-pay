import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)

const iconos = {
  'transferencia_recibida': '💰',
  'transferencia_enviada': '📤',
  'sueldo': '💼',
  'prestamo_aprobado': '✅',
  'cuota': '📋',
  'admin': '🏦'
}

async function cargarNotificaciones() {
  const { data: cuenta } = await supabase
    .from('accounts')
    .select('numero_cuenta')
    .eq('user_id', user.id)
    .single()

  if (!cuenta) return

  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('numero_cuenta', cuenta.numero_cuenta)
    .order('created_at', { ascending: false })

  const lista = document.getElementById('notif-lista')

  if (!notifs || notifs.length === 0) {
    lista.innerHTML = '<p class="notif-vacia">No tenés notificaciones.</p>'
    return
  }

  lista.innerHTML = ''

  for (const n of notifs) {
    // ✅ Después
const fecha = new Date(n.created_at).toLocaleDateString('es-UY', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Montevideo'
})

    const icono = iconos[n.tipo] ?? '🔔'
    const div = document.createElement('div')
    div.className = `notif-item ${n.leida ? '' : 'no-leida'}`
    div.innerHTML = `
      <span class="notif-icono">${icono}</span>
      <div class="notif-texto">
        <p class="notif-mensaje">${n.mensaje}</p>
        <p class="notif-fecha">${fecha}</p>
      </div>
    `
    lista.appendChild(div)
  }

  // Marcar todas como leídas
  await supabase
    .from('notifications')
    .update({ leida: true })
    .eq('numero_cuenta', cuenta.numero_cuenta)
    .eq('leida', false)
}

cargarNotificaciones()
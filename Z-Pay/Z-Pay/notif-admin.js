import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
if (user.rol !== 'admin' && user.rol !== 'superadmin') window.location.href = 'dashboard.html'

async function cargarClientes() {
  const { data: cuentas } = await supabase
    .from('accounts')
    .select('numero_cuenta, alias, users(nombre, apellido)')

  const select = document.getElementById('notif-destinatario')

  for (const c of cuentas ?? []) {
    const option = document.createElement('option')
    option.value = c.numero_cuenta
    option.textContent = `${c.users?.nombre} ${c.users?.apellido} (${c.alias ?? c.numero_cuenta})`
    select.appendChild(option)
  }
}

window.enviarNotificacion = async function () {
  const destinatario = document.getElementById('notif-destinatario').value
  const mensaje = document.getElementById('notif-mensaje').value.trim()
  const msg = document.getElementById('notif-msg')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!mensaje) {
    msg.textContent = 'Escribí un mensaje.'
    return
  }

  if (destinatario === 'todos') {
    const { data: cuentas } = await supabase
      .from('accounts')
      .select('numero_cuenta')

    for (const c of cuentas ?? []) {
      await supabase.from('notifications').insert({
        numero_cuenta: c.numero_cuenta,
        tipo: 'admin',
        mensaje: mensaje
      })
    }
  } else {
    await supabase.from('notifications').insert({
      numero_cuenta: destinatario,
      tipo: 'admin',
      mensaje: mensaje
    })
  }

  msg.style.color = 'green'
  msg.textContent = '✅ Notificación enviada con éxito.'
  document.getElementById('notif-mensaje').value = ''
}

cargarClientes()
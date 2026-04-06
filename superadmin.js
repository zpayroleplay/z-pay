import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
if (user.rol !== 'superadmin') window.location.href = 'dashboard.html'

document.getElementById('super-nombre').textContent = user.nombre

// ===== MODAL =====
window.cerrarModal = function () {
  document.getElementById('modal-overlay').style.display = 'none'
}

const mensajes = {
  'reset-saldos': {
    titulo: 'Resetear saldos',
    subtitulo: '¿Ponés todos los saldos a U$D 0? No se puede deshacer.'
  },
  'limpiar-transacciones': {
    titulo: 'Limpiar movimientos',
    subtitulo: '¿Borrás todas las transacciones del sistema?'
  },
  'limpiar-prestamos': {
    titulo: 'Limpiar préstamos',
    subtitulo: '¿Borrás todos los préstamos y deudas del sistema?'
  },
  'eliminar-usuarios': {
    titulo: 'Eliminar usuarios',
    subtitulo: '¿Eliminás todos los usuarios excepto el tuyo?'
  },
  'reset-total': {
    titulo: '⚠️ Reset total',
    subtitulo: '¿Borrás absolutamente todo? Usuarios, saldos, movimientos y préstamos. Solo quedás vos.'
  }
}

window.confirmarAccion = function (accion) {
  const m = mensajes[accion]
  document.getElementById('modal-titulo').textContent = m.titulo
  document.getElementById('modal-subtitulo').textContent = m.subtitulo
  document.getElementById('modal-confirmar').onclick = async () => {
    cerrarModal()
    await ejecutarAccion(accion)
  }
  document.getElementById('modal-overlay').style.display = 'flex'
}

async function ejecutarAccion(accion) {
  if (accion === 'reset-saldos') {
    await supabase.from('accounts').update({ saldo: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')
    alert('✅ Todos los saldos reseteados a 0.')
  }

  if (accion === 'limpiar-transacciones') {
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    alert('✅ Todas las transacciones eliminadas.')
  }

  if (accion === 'limpiar-prestamos') {
    await supabase.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('debts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    alert('✅ Todos los préstamos y deudas eliminados.')
  }

  if (accion === 'eliminar-usuarios') {
    const { data: usuarios } = await supabase
      .from('users')
      .select('id')
      .neq('username', user.username)

    for (const u of usuarios ?? []) {
      const { data: cuenta } = await supabase
        .from('accounts')
        .select('id, numero_cuenta')
        .eq('user_id', u.id)
        .single()

      if (cuenta) {
        await supabase.from('transactions').delete().or(`cuenta_origen.eq.${cuenta.numero_cuenta},cuenta_destino.eq.${cuenta.numero_cuenta}`)
        await supabase.from('loans').delete().eq('numero_cuenta', cuenta.numero_cuenta)
        await supabase.from('debts').delete().eq('numero_cuenta', cuenta.numero_cuenta)
        await supabase.from('accounts').delete().eq('id', cuenta.id)
      }

      await supabase.from('users').delete().eq('id', u.id)
    }

    alert('✅ Todos los usuarios eliminados excepto el tuyo.')
  }

  if (accion === 'reset-total') {
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('debts').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const { data: usuarios } = await supabase
      .from('users')
      .select('id')
      .neq('username', user.username)

    for (const u of usuarios ?? []) {
      await supabase.from('accounts').delete().eq('user_id', u.id)
      await supabase.from('users').delete().eq('id', u.id)
    }

    alert('✅ Reset total completado. Solo quedás vos.')
  }
}
import { supabase } from './supabase.js'

window.cerrarModal = function () {
  document.getElementById('modal-overlay').style.display = 'none'
}

function abrirModal(titulo, subtitulo, btnClase, btnTexto, onConfirmar) {
  document.getElementById('modal-titulo').textContent = titulo
  document.getElementById('modal-subtitulo').textContent = subtitulo
  const confirmar = document.getElementById('modal-confirmar')
  confirmar.textContent = btnTexto
  confirmar.className = `${btnClase} modal-btn`
  confirmar.onclick = async () => {
    cerrarModal()
    await onConfirmar()
  }
  document.getElementById('modal-overlay').style.display = 'flex'
}

async function calcularCreditScore(numeroCuenta) {
  let score = 100

  const { data: prestamos } = await supabase
    .from('loans')
    .select('estado, cuotas, cuotas_pagadas')
    .eq('numero_cuenta', numeroCuenta)

  for (const p of prestamos ?? []) {
    if (p.estado === 'rechazado') score -= 20
    if (p.estado === 'saldado') score += 10
    if (p.estado === 'aprobado') {
      const pendientes = p.cuotas - (p.cuotas_pagadas ?? 0)
      score -= pendientes * 5
    }
  }

  const { data: deudas } = await supabase
    .from('debts')
    .select('estado')
    .eq('numero_cuenta', numeroCuenta)
    .eq('estado', 'activa')

  score -= (deudas?.length ?? 0) * 15
  return Math.max(0, Math.min(100, score))
}

function colorScore(score) {
  if (score >= 70) return { color: '#22c55e', label: '🟢' }
  if (score >= 40) return { color: '#f59e0b', label: '🟡' }
  return { color: '#ef4444', label: '🔴' }
}

async function cargarSolicitudes() {
  const tbody = document.getElementById('tabla-prestamos')

  const { data: prestamos, error } = await supabase
    .from('loans')
    .select('*')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })

  if (error || !prestamos) {
    tbody.innerHTML = '<tr><td colspan="7">Error al cargar solicitudes.</td></tr>'
    return
  }

  if (prestamos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No hay solicitudes pendientes.</td></tr>'
    return
  }

  tbody.innerHTML = ''

  for (const p of prestamos) {
    const { data: cuenta } = await supabase
      .from('accounts')
      .select('user_id')
      .eq('numero_cuenta', p.numero_cuenta)
      .single()

    let username = p.numero_cuenta
    if (cuenta) {
      const { data: user } = await supabase
        .from('users')
        .select('username')
        .eq('id', cuenta.user_id)
        .single()
      if (user) username = user.username
    }

    const fecha = new Date(p.created_at).toLocaleDateString('es-UY')
    const score = await calcularCreditScore(p.numero_cuenta)
    const { color, label } = colorScore(score)

    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td>${fecha}</td>
      <td>${username}</td>
      <td>U$D ${parseFloat(p.monto).toFixed(2)}</td>
      <td>${p.cuotas}</td>
      <td><span style="color:${color}; font-weight:800">${label} ${score}/100</span></td>
      <td><button class="btn-acreditar" onclick="confirmarAprobar('${p.id}', '${p.numero_cuenta}', ${p.monto}, ${p.cuotas}, '${username}')">APROBAR</button></td>
      <td><button class="btn-retirar" onclick="confirmarRechazar('${p.id}', '${username}')">RECHAZAR</button></td>
    `
    tbody.appendChild(fila)
  }
}

window.confirmarAprobar = function (id, numeroCuenta, monto, cuotas, username) {
  abrirModal(
    'Aprobar préstamo',
    `¿Aprobás el préstamo de U$D ${parseFloat(monto).toFixed(2)} a ${username}?`,
    'btn-acreditar',
    'APROBAR',
    async () => {
      const { data: cuenta } = await supabase
        .from('accounts')
        .select('id, saldo')
        .eq('numero_cuenta', numeroCuenta)
        .single()

      if (!cuenta) return

      const nuevoSaldo = parseFloat(cuenta.saldo) + parseFloat(monto)
      await supabase.from('accounts').update({ saldo: nuevoSaldo }).eq('id', cuenta.id)
      await supabase.from('loans').update({ estado: 'aprobado', deuda_restante: monto }).eq('id', id)
      await supabase.from('transactions').insert({
        cuenta_destino: numeroCuenta,
        monto: monto,
        concepto: `Préstamo aprobado (${cuotas} cuotas)`,
        tipo: 'prestamo',
        estado: 'completada'
      })

      await supabase.from('notifications').insert({
        numero_cuenta: numeroCuenta,
        tipo: 'prestamo_aprobado',
        mensaje: `Tu préstamo de U$D ${parseFloat(monto).toFixed(2)} fue aprobado y acreditado en tu cuenta.`
      })

      cargarSolicitudes()
    }
  )
}

window.confirmarRechazar = function (id, username) {
  abrirModal(
    'Rechazar préstamo',
    `¿Rechazás el préstamo de ${username}?`,
    'btn-retirar',
    'RECHAZAR',
    async () => {
      await supabase.from('loans').update({ estado: 'rechazado' }).eq('id', id)
      cargarSolicitudes()
    }
  )
}

cargarSolicitudes()
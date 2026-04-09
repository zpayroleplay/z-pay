import { supabase } from './supabase.js'

async function cargarSueldos() {
  const tbody = document.getElementById('tabla-sueldos')

  const { data: cuentas, error } = await supabase
    .from('accounts')
    .select('*, users(username, nombre, apellido)')
    .gt('sueldo', 0)

  if (error || !cuentas) {
    tbody.innerHTML = '<tr><td colspan="4">Error al cargar.</td></tr>'
    return
  }

  if (cuentas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No hay jugadores con sueldo asignado.</td></tr>'
    return
  }

  tbody.innerHTML = ''

  for (const c of cuentas) {
    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td>${c.users?.username ?? '—'}</td>
      <td>${c.users?.nombre ?? ''} ${c.users?.apellido ?? ''}</td>
      <td>${c.numero_cuenta}</td>
      <td>U$D ${parseFloat(c.sueldo).toFixed(2)}</td>
    `
    tbody.appendChild(fila)
  }
}

window.pagarSueldos = async function () {
  const msg = document.getElementById('msg-sueldos')
  msg.style.color = '#555'
  msg.textContent = 'Procesando...'

  const { data: cuentas } = await supabase
    .from('accounts')
    .select('*')
    .gt('sueldo', 0)

  if (!cuentas || cuentas.length === 0) {
    msg.style.color = 'red'
    msg.textContent = 'No hay jugadores con sueldo asignado.'
    return
  }

  for (const c of cuentas) {
    const sueldo = parseFloat(c.sueldo)
    let montoAcreditar = sueldo

    const { data: prestamos } = await supabase
      .from('loans')
      .select('*')
      .eq('numero_cuenta', c.numero_cuenta)
      .eq('estado', 'aprobado')
      .gt('deuda_restante', 0)
      .order('created_at', { ascending: true })

    for (const prestamo of prestamos ?? []) {
      const cuotaValor = parseFloat(prestamo.monto) / parseInt(prestamo.cuotas)
      const deudaRestante = parseFloat(prestamo.deuda_restante)
      const maximoDescuentable = sueldo * 0.75
      const descuento = Math.min(cuotaValor, deudaRestante, montoAcreditar, maximoDescuentable)

      if (descuento <= 0) continue

      montoAcreditar -= descuento

      const nuevaDeuda = deudaRestante - descuento
      const nuevasCuotasPagadas = (prestamo.cuotas_pagadas ?? 0) + 1
      const nuevoEstado = nuevaDeuda <= 0 ? 'saldado' : 'aprobado'

      await supabase.from('loans').update({
        deuda_restante: nuevaDeuda,
        cuotas_pagadas: nuevasCuotasPagadas,
        estado: nuevoEstado
      }).eq('id', prestamo.id)

      await supabase.from('transactions').insert({
        cuenta_origen: c.numero_cuenta,
        monto: descuento,
        concepto: `Pago de cuota (préstamo ${nuevasCuotasPagadas}/${prestamo.cuotas})`,
        tipo: 'cuota',
        estado: 'completada'
      })
    }

    const nuevoSaldo = parseFloat(c.saldo) + montoAcreditar

    await supabase.from('accounts').update({ saldo: nuevoSaldo }).eq('id', c.id)

    await supabase.from('transactions').insert({
      cuenta_destino: c.numero_cuenta,
      monto: montoAcreditar,
      concepto: 'Pago de sueldo',
      tipo: 'sueldo',
      estado: 'completada'
    })

    await supabase.from('notifications').insert({
      numero_cuenta: c.numero_cuenta,
      tipo: 'sueldo',
      mensaje: `Se acreditó tu sueldo de U$D ${montoAcreditar.toFixed(2)}.`
    })
  }

  msg.style.color = 'green'
  msg.textContent = `✅ Sueldos pagados y cuotas descontadas correctamente.`
}

cargarSueldos()
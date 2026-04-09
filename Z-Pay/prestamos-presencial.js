import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
if (user.rol !== 'admin' && user.rol !== 'superadmin') window.location.href = 'dashboard.html'

let clienteActual = null
let franjaActual = null

function calcularFranja(sueldo) {
  if (sueldo <= 0) return null
  if (sueldo <= 1000) return { nombre: 'Franja Baja', maximo: sueldo * 2, cuotasMinimas: 3 }
  if (sueldo <= 3000) return { nombre: 'Franja Media', maximo: sueldo * 3, cuotasMinimas: 4 }
  return { nombre: 'Franja Alta', maximo: sueldo * 5, cuotasMinimas: 6 }
}

window.buscarCliente = async function () {
  const busqueda = document.getElementById('buscar-cliente').value.trim()
  const msg = document.getElementById('pp-msg')

  if (!busqueda) return

  let { data: cuenta } = await supabase
    .from('accounts')
    .select('*, users(nombre, apellido)')
    .eq('alias', busqueda)
    .single()

  if (!cuenta) {
    const { data: porCuenta } = await supabase
      .from('accounts')
      .select('*, users(nombre, apellido)')
      .eq('numero_cuenta', busqueda)
      .single()
    cuenta = porCuenta
  }

  if (!cuenta) {
    document.getElementById('cliente-info').style.display = 'none'
    document.getElementById('prestamo-form-presencial').style.display = 'none'
    msg.style.color = 'red'
    msg.textContent = 'No se encontró ningún cliente.'
    return
  }

  const sueldo = parseFloat(cuenta.sueldo ?? 0)
  const franja = calcularFranja(sueldo)

  clienteActual = cuenta
  franjaActual = franja

  document.getElementById('info-nombre').textContent = `${cuenta.users.nombre} ${cuenta.users.apellido}`
  document.getElementById('info-cuenta').textContent = cuenta.numero_cuenta
  document.getElementById('info-sueldo').textContent = `U$D ${sueldo.toFixed(2)}`

  if (!franja) {
    document.getElementById('info-franja').textContent = 'Sin franja (sin sueldo)'
    document.getElementById('info-maximo').textContent = '—'
    document.getElementById('info-cuotas-min').textContent = '—'
    document.getElementById('prestamo-form-presencial').style.display = 'none'
  } else {
    document.getElementById('info-franja').textContent = franja.nombre
    document.getElementById('info-maximo').textContent = `U$D ${franja.maximo.toFixed(2)}`
    document.getElementById('info-cuotas-min').textContent = `${franja.cuotasMinimas} cuotas`
    document.getElementById('prestamo-form-presencial').style.display = 'flex'
    document.getElementById('prestamo-form-presencial').style.flexDirection = 'column'
    document.getElementById('prestamo-form-presencial').style.gap = '20px'
  }

  document.getElementById('cliente-info').style.display = 'flex'
  document.getElementById('pp-msg').textContent = ''
}

window.asignarPrestamo = async function () {
  const monto = parseFloat(document.getElementById('pp-monto').value)
  const cuotas = parseInt(document.getElementById('pp-cuotas').value)
  const msg = document.getElementById('pp-msg')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!franjaActual) {
    msg.textContent = 'El cliente no tiene sueldo asignado.'
    return
  }

  if (isNaN(monto) || monto <= 0) {
    msg.textContent = 'Ingresá un monto válido.'
    return
  }

  if (isNaN(cuotas) || cuotas <= 0) {
    msg.textContent = 'Ingresá una cantidad de cuotas válida.'
    return
  }

  if (monto > franjaActual.maximo) {
    msg.textContent = `⚠️ El monto supera el máximo permitido (U$D ${franjaActual.maximo.toFixed(2)}).`
    return
  }

  if (cuotas < franjaActual.cuotasMinimas) {
    msg.textContent = `⚠️ Se requieren mínimo ${franjaActual.cuotasMinimas} cuotas.`
    return
  }

  const nuevoSaldo = parseFloat(clienteActual.saldo) + monto
  await supabase.from('accounts').update({ saldo: nuevoSaldo }).eq('id', clienteActual.id)

  await supabase.from('loans').insert({
    numero_cuenta: clienteActual.numero_cuenta,
    monto: monto,
    plazo: cuotas,
    cuotas: cuotas,
    estado: 'aprobado',
    deuda_restante: monto,
    cuotas_pagadas: 0,
    motivo: `${clienteActual.users.nombre} ${clienteActual.users.apellido} (presencial)`
  })

  await supabase.from('transactions').insert({
    cuenta_destino: clienteActual.numero_cuenta,
    monto: monto,
    concepto: `Préstamo presencial aprobado (${cuotas} cuotas)`,
    tipo: 'prestamo',
    estado: 'completada'
  })

  await supabase.from('notifications').insert({
    numero_cuenta: clienteActual.numero_cuenta,
    tipo: 'prestamo_aprobado',
    mensaje: `Tu préstamo presencial de U$D ${monto.toFixed(2)} fue aprobado y acreditado.`
  })

  msg.style.color = 'green'
  msg.textContent = `✅ Préstamo de U$D ${monto.toFixed(2)} aprobado y acreditado.`

  document.getElementById('pp-monto').value = ''
  document.getElementById('pp-cuotas').value = ''
}
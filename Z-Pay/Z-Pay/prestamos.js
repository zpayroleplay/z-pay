import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
let numeroCuenta = null
let franjaActual = null

// ===== FRANJAS SALARIALES =====
function calcularFranja(sueldo) {
  if (sueldo <= 0) return null
  if (sueldo <= 1000) return {
    nombre: 'Franja Baja',
    maximo: sueldo * 2,
    cuotasMinimas: 3
  }
  if (sueldo <= 3000) return {
    nombre: 'Franja Media',
    maximo: sueldo * 3,
    cuotasMinimas: 4
  }
  return {
    nombre: 'Franja Alta',
    maximo: sueldo * 5,
    cuotasMinimas: 6
  }
}

async function cargarDatos() {
  const { data: cuenta } = await supabase
    .from('accounts')
    .select('numero_cuenta, sueldo')
    .eq('user_id', user.id)
    .single()

  if (!cuenta) return

  numeroCuenta = cuenta.numero_cuenta
  document.getElementById('prestamo-cuenta').textContent = `Número de cuenta: ${cuenta.numero_cuenta}`
  document.getElementById('prestamo-titular').textContent = `${user.nombre} ${user.apellido}`

  const sueldo = parseFloat(cuenta.sueldo ?? 0)
  const franja = calcularFranja(sueldo)

  if (!franja) {
    document.getElementById('franja-sin-sueldo').style.display = 'flex'
    return
  }

  franjaActual = franja

  document.getElementById('franja-box').style.display = 'flex'
  document.getElementById('franja-nombre').textContent = franja.nombre
  document.getElementById('franja-sueldo').textContent = `U$D ${sueldo.toFixed(2)}`
  document.getElementById('franja-maximo').textContent = `U$D ${franja.maximo.toFixed(2)}`
  document.getElementById('franja-cuotas').textContent = `${franja.cuotasMinimas} cuotas`
}

window.solicitarPrestamo = async function () {
  const monto = parseFloat(document.getElementById('prestamo-monto').value)
  const cuotas = parseInt(document.getElementById('prestamo-cuotas').value)
  const msg = document.getElementById('prestamo-msg')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!franjaActual) {
    msg.textContent = 'No tenés sueldo asignado para solicitar un préstamo.'
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
    msg.textContent = `⚠️ El monto supera el máximo permitido para tu franja (U$D ${franjaActual.maximo.toFixed(2)}).`
    return
  }

  if (cuotas < franjaActual.cuotasMinimas) {
    msg.textContent = `⚠️ Tu franja requiere un mínimo de ${franjaActual.cuotasMinimas} cuotas.`
    return
  }

  const { error } = await supabase.from('loans').insert({
    numero_cuenta: numeroCuenta,
    monto: monto,
    plazo: cuotas,
    cuotas: cuotas,
    estado: 'pendiente',
    motivo: `${user.nombre} ${user.apellido}`
  })

  if (error) {
    msg.textContent = 'Error al enviar la solicitud.'
    return
  }

  msg.style.color = 'green'
  msg.textContent = '✅ Solicitud enviada con éxito.'

  document.getElementById('prestamo-monto').value = ''
  document.getElementById('prestamo-cuotas').value = ''
}

cargarDatos()
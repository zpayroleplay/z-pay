import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
let cuentaActual = null

async function cargarPerfil() {
  document.getElementById('dash-nombre').textContent = `${user.nombre} ${user.apellido}`

  const { data: cuenta } = await supabase
    .from('accounts')
    .select('numero_cuenta, saldo')
    .eq('user_id', user.id)
    .single()

  if (cuenta) {
    cuentaActual = cuenta
    document.getElementById('dash-cuenta').textContent = `Número de cuenta: ${cuenta.numero_cuenta}`

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

    // Verificamos cobros pendientes
    await verificarCobros(cuenta.numero_cuenta)

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

async function verificarCobros(numeroCuenta) {
  const { data: cobros } = await supabase
    .from('cobros')
    .select('*, companies(nombre, numero_cuenta, saldo, id)')
    .eq('numero_cuenta_cliente', numeroCuenta)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })
    .limit(1)

  if (!cobros || cobros.length === 0) return

  const cobro = cobros[0]

  document.getElementById('cobro-popup-empresa').textContent = `${cobro.companies?.nombre} te solicita un pago`
  document.getElementById('cobro-popup-concepto').textContent = cobro.concepto
  document.getElementById('cobro-popup-monto').textContent = `U$D ${parseFloat(cobro.monto).toFixed(2)}`
  document.getElementById('cobro-popup').style.display = 'flex'

  document.getElementById('cobro-popup-aceptar').onclick = async () => {
    const saldo = parseFloat(cuentaActual.saldo)
    const monto = parseFloat(cobro.monto)

    if (monto > saldo) {
      alert('No tenés suficiente saldo.')
      return
    }

    const { data: tesoro } = await supabase
      .from('companies')
      .select('id, saldo')
      .eq('alias', 'Tesoro_ZPay')
      .single()

    const montoEmpresa = monto * 0.5
    const montoTesoro = monto * 0.5

    await supabase.from('accounts').update({ saldo: saldo - monto }).eq('user_id', user.id)

    await supabase.from('companies').update({
      saldo: parseFloat(cobro.companies.saldo) + montoEmpresa
    }).eq('id', cobro.companies.id)

    await supabase.from('companies').update({
      saldo: parseFloat(tesoro.saldo) + montoTesoro
    }).eq('id', tesoro.id)

    await supabase.from('transactions').insert({
      cuenta_origen: numeroCuenta,
      cuenta_destino: cobro.companies.numero_cuenta,
      monto,
      concepto: cobro.concepto,
      tipo: 'cobro',
      estado: 'completada'
    })

    await supabase.from('cobros').update({ estado: 'aceptado' }).eq('id', cobro.id)

    document.getElementById('cobro-popup').style.display = 'none'
    cuentaActual.saldo = saldo - monto

    // Si hay más cobros pendientes los mostramos
    await verificarCobros(numeroCuenta)
  }

  document.getElementById('cobro-popup-rechazar').onclick = async () => {
    await supabase.from('cobros').update({ estado: 'rechazado' }).eq('id', cobro.id)
    document.getElementById('cobro-popup').style.display = 'none'
    await verificarCobros(numeroCuenta)
  }
}

document.getElementById('btn-cerrar-sesion').addEventListener('click', function () {
  localStorage.removeItem('zpay_user')
  window.location.href = 'login.html'
})

cargarPerfil()
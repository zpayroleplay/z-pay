import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
let cuentaOrigen = null

async function cargarSaldo() {
  const { data: cuenta } = await supabase
    .from('accounts')
    .select('id, numero_cuenta, saldo')
    .eq('user_id', user.id)
    .single()

  if (cuenta) {
    cuentaOrigen = cuenta
    document.getElementById('saldo-monto').textContent = `U$D ${parseFloat(cuenta.saldo).toFixed(2)}`
  }
}

window.transferir = async function () {
  const destinatario = document.getElementById('destinatario').value.trim()
  const monto = parseFloat(document.getElementById('monto').value)
  const msg = document.getElementById('transfer-msg')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!destinatario || isNaN(monto) || monto <= 0) {
    msg.textContent = 'Completá todos los campos correctamente.'
    return
  }

  if (monto > parseFloat(cuentaOrigen.saldo)) {
    msg.textContent = 'No tenés suficiente saldo.'
    return
  }

  if (destinatario === cuentaOrigen.numero_cuenta) {
    msg.textContent = 'No podés transferirte a vos mismo.'
    return
  }

  let { data: cuentaDestino } = await supabase
    .from('accounts')
    .select('id, saldo, numero_cuenta')
    .eq('numero_cuenta', destinatario)
    .single()

  if (!cuentaDestino) {
    const { data: porAlias } = await supabase
      .from('accounts')
      .select('id, saldo, numero_cuenta')
      .eq('alias', destinatario)
      .single()
    cuentaDestino = porAlias
  }

  if (!cuentaDestino) {
    msg.textContent = 'El destinatario no existe.'
    return
  }

  const nuevoSaldoOrigen = parseFloat(cuentaOrigen.saldo) - monto
  const nuevoSaldoDestino = parseFloat(cuentaDestino.saldo) + monto

  await supabase.from('accounts').update({ saldo: nuevoSaldoOrigen }).eq('id', cuentaOrigen.id)
  await supabase.from('accounts').update({ saldo: nuevoSaldoDestino }).eq('id', cuentaDestino.id)

  await supabase.from('transactions').insert({
    cuenta_origen: cuentaOrigen.numero_cuenta,
    cuenta_destino: cuentaDestino.numero_cuenta,
    monto: monto,
    concepto: 'Transferencia',
    tipo: 'transferencia',
    estado: 'completada'
  })

  await supabase.from('notifications').insert({
    numero_cuenta: cuentaDestino.numero_cuenta,
    tipo: 'transferencia_recibida',
    mensaje: `Recibiste U$D ${monto.toFixed(2)} de la cuenta ${cuentaOrigen.numero_cuenta}.`
  })

  await supabase.from('notifications').insert({
    numero_cuenta: cuentaOrigen.numero_cuenta,
    tipo: 'transferencia_enviada',
    mensaje: `Enviaste U$D ${monto.toFixed(2)} a la cuenta ${cuentaDestino.numero_cuenta}.`
  })

  msg.style.color = 'green'
  msg.textContent = `Transferencia de U$D ${monto.toFixed(2)} realizada con éxito.`

  document.getElementById('destinatario').value = ''
  document.getElementById('monto').value = ''

  cargarSaldo()
}

cargarSaldo()
import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)

async function cargarMovimientos() {
  const { data: cuenta } = await supabase
    .from('accounts')
    .select('id, numero_cuenta, saldo')
    .eq('user_id', user.id)
    .single()

  if (!cuenta) return

  document.getElementById('mov-cuenta').textContent = `Número de cuenta: ${cuenta.numero_cuenta}`
  document.getElementById('mov-saldo').textContent = `U$D ${parseFloat(cuenta.saldo).toFixed(2)}`

  // Traemos todas las transacciones donde el usuario es origen o destino
  const { data: transacciones } = await supabase
    .from('transactions')
    .select('*')
    .or(`cuenta_origen.eq.${cuenta.numero_cuenta},cuenta_destino.eq.${cuenta.numero_cuenta}`)
    .order('created_at', { ascending: false })

  const tbody = document.getElementById('mov-tabla')

  if (!transacciones || transacciones.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2">No hay movimientos aún.</td></tr>'
    return
  }

  tbody.innerHTML = ''

  for (const t of transacciones) {
    const esEntrada = t.cuenta_destino === cuenta.numero_cuenta
    const signo = esEntrada ? '+' : '-'
    const clase = esEntrada ? 'mov-positivo' : 'mov-negativo'
    let concepto = t.concepto ?? t.tipo ?? '—'

if (t.tipo === 'transferencia') {
  if (esEntrada) {
    concepto = `Transferencia recibida de cuenta ${t.cuenta_origen}`
  } else {
    concepto = `Transferencia enviada a cuenta ${t.cuenta_destino}`
  }
}
    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td>${concepto}</td>
      <td class="${clase}">${signo} U$D ${parseFloat(t.monto).toFixed(2)}</td>
    `
    tbody.appendChild(fila)
  }
}

cargarMovimientos()

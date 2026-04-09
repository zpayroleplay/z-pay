import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)

async function cargarDeudas() {
  const { data: cuenta } = await supabase
    .from('accounts')
    .select('numero_cuenta')
    .eq('user_id', user.id)
    .single()

  if (!cuenta) return

  document.getElementById('deudas-cuenta').textContent = `Número de cuenta: ${cuenta.numero_cuenta}`

  // Traemos préstamos aprobados con deuda restante
  const { data: prestamos } = await supabase
    .from('loans')
    .select('*')
    .eq('numero_cuenta', cuenta.numero_cuenta)
    .eq('estado', 'aprobado')

  // Traemos deudas directas
  const { data: deudas } = await supabase
    .from('debts')
    .select('*')
    .eq('numero_cuenta', cuenta.numero_cuenta)
    .eq('estado', 'activa')

  const tbody = document.getElementById('deudas-tabla')
  tbody.innerHTML = ''

  const totalItems = [...(prestamos ?? []), ...(deudas ?? [])]

  if (totalItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2">No tenés deudas activas.</td></tr>'
    return
  }

  for (const p of prestamos ?? []) {
    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td>Préstamo (${p.cuotas} cuotas)</td>
      <td class="mov-negativo">U$D ${parseFloat(p.deuda_restante ?? p.monto).toFixed(2)}</td>
    `
    tbody.appendChild(fila)
  }

  for (const d of deudas ?? []) {
    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td>${d.concepto}</td>
      <td class="mov-negativo">U$D ${parseFloat(d.monto).toFixed(2)}</td>
    `
    tbody.appendChild(fila)
  }
}

cargarDeudas()

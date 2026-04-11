import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
let empresaData = null

async function init() {
  const { data: empresa } = await supabase
    .from('companies')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!empresa) {
    window.location.href = 'dashboard.html'
    return
  }

  empresaData = empresa
  document.getElementById('empresa-titulo').textContent = empresa.nombre
  document.getElementById('empresa-rubro').textContent = empresa.rubro ?? ''
}

window.verificarPassword = async function () {
  const password = document.getElementById('empresa-password').value.trim()
  const msg = document.getElementById('empresa-login-msg')

  if (!password) {
    msg.style.color = 'red'
    msg.textContent = 'Ingresá la contraseña.'
    return
  }

  if (password !== empresaData.password_hash) {
    msg.style.color = 'red'
    msg.textContent = 'Contraseña incorrecta.'
    return
  }

  document.getElementById('empresa-login').style.display = 'none'
  document.getElementById('empresa-panel').style.display = 'block'

  cargarPanel()
}

async function cargarPanel() {
  document.getElementById('empresa-saldo').textContent = `U$D ${parseFloat(empresaData.saldo).toFixed(2)}`
  document.getElementById('empresa-cuenta').textContent = empresaData.numero_cuenta

  await cargarEmpleados()
  await cargarMovimientos()
}

async function cargarEmpleados() {
  const { data: empleados } = await supabase
    .from('company_employees')
    .select('*, users(nombre, apellido, id)')
    .eq('company_id', empresaData.id)

  const select = document.getElementById('pago-empleado')
  select.innerHTML = '<option value="">Seleccioná el empleado</option>'

  for (const e of empleados ?? []) {
    const option = document.createElement('option')
    option.value = e.user_id
    option.textContent = `${e.users.nombre} ${e.users.apellido}`
    select.appendChild(option)
  }
}

async function cargarMovimientos() {
  const tbody = document.getElementById('empresa-movimientos')

  const { data: movs } = await supabase
    .from('transactions')
    .select('*')
    .or(`cuenta_origen.eq.${empresaData.numero_cuenta},cuenta_destino.eq.${empresaData.numero_cuenta}`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!movs || movs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">No hay movimientos aún.</td></tr>'
    return
  }

  tbody.innerHTML = ''

  for (const m of movs) {
    const esEntrada = m.cuenta_destino === empresaData.numero_cuenta
    const signo = esEntrada ? '+' : '-'
    const clase = esEntrada ? 'mov-positivo' : 'mov-negativo'
    const fecha = new Date(m.created_at).toLocaleDateString('es-UY')

    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td>${m.concepto ?? m.tipo ?? '—'}</td>
      <td class="${clase}">${signo} U$D ${parseFloat(m.monto).toFixed(2)}</td>
      <td>${fecha}</td>
    `
    tbody.appendChild(fila)
  }
}

window.solicitarPago = async function () {
  const userId = document.getElementById('pago-empleado').value
  const monto = parseFloat(document.getElementById('pago-monto').value)
  const concepto = document.getElementById('pago-concepto').value.trim()
  const msg = document.getElementById('pago-msg')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!userId) {
    msg.textContent = 'Seleccioná un empleado.'
    return
  }

  if (isNaN(monto) || monto <= 0) {
    msg.textContent = 'Ingresá un monto válido.'
    return
  }

  if (!concepto) {
    msg.textContent = 'Ingresá un concepto.'
    return
  }

  if (monto > parseFloat(empresaData.saldo)) {
    msg.textContent = 'La empresa no tiene suficiente saldo.'
    return
  }

  const { error } = await supabase.from('company_payments').insert({
    company_id: empresaData.id,
    user_id: userId,
    monto,
    concepto,
    estado: 'pendiente'
  })

  if (error) {
    msg.textContent = 'Error al enviar la solicitud.'
    return
  }

  msg.style.color = 'green'
  msg.textContent = '✅ Solicitud enviada al banco para aprobación.'

  document.getElementById('pago-empleado').value = ''
  document.getElementById('pago-monto').value = ''
  document.getElementById('pago-concepto').value = ''
}

init()
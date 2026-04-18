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
  const { data: empresa } = await supabase
    .from('companies')
    .select('*')
    .eq('id', empresaData.id)
    .single()

  empresaData = empresa
  document.getElementById('empresa-saldo').textContent = `U$D ${parseFloat(empresaData.saldo).toFixed(2)}`
  document.getElementById('empresa-cuenta').textContent = empresaData.numero_cuenta

  await cargarEmpleados()
  await cargarMovimientos()
}

async function cargarEmpleados() {
  const tbody = document.getElementById('lista-empleados')
  const select = document.getElementById('pago-empleado')

  const { data: empleados } = await supabase
    .from('company_employees')
    .select('*, users(id, nombre, apellido), accounts(numero_cuenta)')
    .eq('company_id', empresaData.id)

  if (!empleados || empleados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No hay empleados registrados.</td></tr>'
  } else {
    tbody.innerHTML = ''
    for (const e of empleados) {
      const fila = document.createElement('tr')
      fila.innerHTML = `
        <td>${e.users?.nombre ?? '—'} ${e.users?.apellido ?? ''}</td>
        <td>${e.cargo ?? 'Empleado'}</td>
        <td>${e.accounts?.numero_cuenta ?? '—'}</td>
        <td><button class="btn-retirar" onclick="quitarEmpleado('${e.id}')">QUITAR</button></td>
      `
      tbody.appendChild(fila)
    }
  }

  select.innerHTML = '<option value="">Seleccioná el empleado</option>'
  for (const e of empleados ?? []) {
    const option = document.createElement('option')
    option.value = e.user_id
    option.textContent = `${e.users?.nombre} ${e.users?.apellido} (${e.cargo ?? 'Empleado'})`
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

window.agregarEmpleado = async function () {
  const busqueda = document.getElementById('nuevo-empleado').value.trim()
  const cargo = document.getElementById('nuevo-cargo').value.trim() || 'Empleado'
  const msg = document.getElementById('empleado-msg')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!busqueda) {
    msg.textContent = 'Ingresá un alias o número de cuenta.'
    return
  }

  let { data: cuenta } = await supabase
    .from('accounts')
    .select('id, user_id, numero_cuenta, users(nombre, apellido)')
    .eq('alias', busqueda)
    .single()

  if (!cuenta) {
    const { data: porCuenta } = await supabase
      .from('accounts')
      .select('id, user_id, numero_cuenta, users(nombre, apellido)')
      .eq('numero_cuenta', busqueda)
      .single()
    cuenta = porCuenta
  }

  if (!cuenta) {
    msg.textContent = 'No se encontró ningún usuario con ese alias o número de cuenta.'
    return
  }

  const { data: yaExiste } = await supabase
    .from('company_employees')
    .select('id')
    .eq('company_id', empresaData.id)
    .eq('user_id', cuenta.user_id)
    .single()

  if (yaExiste) {
    msg.textContent = 'Ese usuario ya es empleado de la empresa.'
    return
  }

  const { error } = await supabase.from('company_employees').insert({
    company_id: empresaData.id,
    user_id: cuenta.user_id,
    cargo: cargo
  })

  if (error) {
    msg.textContent = 'Error al agregar empleado.'
    return
  }

  msg.style.color = 'green'
  msg.textContent = `✅ ${cuenta.users?.nombre} ${cuenta.users?.apellido} agregado como ${cargo}.`
  document.getElementById('nuevo-empleado').value = ''
  document.getElementById('nuevo-cargo').value = ''

  cargarEmpleados()
}

window.quitarEmpleado = async function (empleadoId) {
  await supabase.from('company_employees').delete().eq('id', empleadoId)
  cargarEmpleados()
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

window.generarCobro = async function () {
  const busqueda = document.getElementById('cobro-cliente').value.trim()
  const monto = parseFloat(document.getElementById('cobro-monto').value)
  const concepto = document.getElementById('cobro-concepto').value.trim()
  const msg = document.getElementById('cobro-msg')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!busqueda || isNaN(monto) || monto <= 0 || !concepto) {
    msg.textContent = 'Completá todos los campos correctamente.'
    return
  }

  let { data: cuenta } = await supabase
    .from('accounts')
    .select('numero_cuenta, users(nombre, apellido)')
    .eq('alias', busqueda)
    .single()

  if (!cuenta) {
    const { data: porCuenta } = await supabase
      .from('accounts')
      .select('numero_cuenta, users(nombre, apellido)')
      .eq('numero_cuenta', busqueda)
      .single()
    cuenta = porCuenta
  }

  if (!cuenta) {
    msg.textContent = 'No se encontró ningún cliente con ese alias o número de cuenta.'
    return
  }

  const { error } = await supabase.from('cobros').insert({
    company_id: empresaData.id,
    numero_cuenta_cliente: cuenta.numero_cuenta,
    monto,
    concepto,
    estado: 'pendiente'
  })

  if (error) {
    msg.textContent = 'Error al generar el cobro.'
    return
  }

  msg.style.color = 'green'
  msg.textContent = `✅ Cobro enviado a ${cuenta.users?.nombre} ${cuenta.users?.apellido}.`

  document.getElementById('cobro-cliente').value = ''
  document.getElementById('cobro-monto').value = ''
  document.getElementById('cobro-concepto').value = ''
}

init()
import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'
const user = JSON.parse(userData)
if (user.rol !== 'admin' && user.rol !== 'superadmin') window.location.href = 'dashboard.html'

let accionActual = null
let empresaIdActual = null

async function cargarGerentes() {
  const { data: usuarios } = await supabase
    .from('users')
    .select('id, nombre, apellido, username')
    .order('nombre')

  const select = document.getElementById('emp-owner')
  for (const u of usuarios ?? []) {
    const option = document.createElement('option')
    option.value = u.id
    option.textContent = `${u.nombre} ${u.apellido} (${u.username})`
    select.appendChild(option)
  }
}

async function cargarEmpresas() {
  const tbody = document.getElementById('tabla-empresas')

  const { data: empresas, error } = await supabase
    .from('companies')
    .select('*, users(nombre, apellido)')
    .order('nombre')

  if (error || !empresas) {
    tbody.innerHTML = '<tr><td colspan="9">Error al cargar empresas.</td></tr>'
    return
  }

  const lista = empresas.filter(e => e.alias !== 'Tesoro_ZPay')

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">No hay empresas registradas.</td></tr>'
    return
  }

  tbody.innerHTML = ''

  for (const e of lista) {
    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td><strong>${e.nombre}</strong></td>
      <td>${e.rubro ?? '—'}</td>
      <td>${e.numero_cuenta}</td>
      <td>${e.alias ?? '—'}</td>
      <td>${e.users ? `${e.users.nombre} ${e.users.apellido}` : '—'}</td>
      <td>U$D ${parseFloat(e.saldo).toFixed(2)}</td>
      <td><button class="btn-acreditar" onclick="abrirModal('acreditar', '${e.id}', '${e.nombre}')">ACREDITAR</button></td>
      <td><button class="btn-retirar" onclick="abrirModal('retirar', '${e.id}', '${e.nombre}')">RETIRAR</button></td>
      <td><button class="btn-eliminar" onclick="abrirModal('eliminar', '${e.id}', '${e.nombre}')">ELIMINAR</button></td>
    `
    tbody.appendChild(fila)
  }
}

window.cerrarModal = function () {
  document.getElementById('modal-overlay').style.display = 'none'
  document.getElementById('modal-monto').style.display = 'none'
  accionActual = null
  empresaIdActual = null
}

window.abrirModal = function (accion, empresaId, nombre) {
  accionActual = accion
  empresaIdActual = empresaId

  const titulo = document.getElementById('modal-titulo')
  const subtitulo = document.getElementById('modal-subtitulo')
  const confirmar = document.getElementById('modal-confirmar')
  const montoInput = document.getElementById('modal-monto')

  if (accion === 'acreditar') {
    titulo.textContent = 'Acreditar fondos'
    subtitulo.textContent = `Empresa: ${nombre}`
    confirmar.textContent = 'ACREDITAR'
    confirmar.className = 'btn-acreditar modal-btn'
    montoInput.style.display = 'block'
    montoInput.value = ''
  } else if (accion === 'retirar') {
    titulo.textContent = 'Retirar fondos'
    subtitulo.textContent = `Empresa: ${nombre}`
    confirmar.textContent = 'RETIRAR'
    confirmar.className = 'btn-retirar modal-btn'
    montoInput.style.display = 'block'
    montoInput.value = ''
  } else if (accion === 'eliminar') {
    titulo.textContent = 'Eliminar empresa'
    subtitulo.textContent = `¿Confirmás la eliminación de ${nombre}?`
    confirmar.textContent = 'ELIMINAR'
    confirmar.className = 'btn-retirar modal-btn'
    montoInput.style.display = 'none'
  }

  confirmar.onclick = confirmarModal
  document.getElementById('modal-overlay').style.display = 'flex'
}

async function confirmarModal() {
  const monto = parseFloat(document.getElementById('modal-monto').value)

  if (accionActual === 'eliminar') {
    await supabase.from('company_employees').delete().eq('company_id', empresaIdActual)
    await supabase.from('company_payments').delete().eq('company_id', empresaIdActual)
    await supabase.from('companies').delete().eq('id', empresaIdActual)
    cerrarModal()
    cargarEmpresas()
    return
  }

  if (isNaN(monto) || monto <= 0) {
    alert('Ingresá un monto válido.')
    return
  }

  const { data: empresa } = await supabase
    .from('companies')
    .select('saldo, numero_cuenta')
    .eq('id', empresaIdActual)
    .single()

  let nuevoSaldo

  if (accionActual === 'acreditar') {
    nuevoSaldo = parseFloat(empresa.saldo) + monto
    await supabase.from('transactions').insert({
      cuenta_destino: empresa.numero_cuenta,
      monto,
      concepto: 'Acreditación por staff',
      tipo: 'acreditacion',
      estado: 'completada'
    })
  } else {
    if (monto > parseFloat(empresa.saldo)) {
      alert('La empresa no tiene suficiente saldo.')
      return
    }
    nuevoSaldo = parseFloat(empresa.saldo) - monto
    await supabase.from('transactions').insert({
      cuenta_origen: empresa.numero_cuenta,
      monto,
      concepto: 'Retiro por staff',
      tipo: 'retiro',
      estado: 'completada'
    })
  }

  await supabase.from('companies').update({ saldo: nuevoSaldo }).eq('id', empresaIdActual)
  cerrarModal()
  cargarEmpresas()
}

window.crearEmpresa = async function () {
  const nombre = document.getElementById('emp-nombre').value.trim()
  const rubro = document.getElementById('emp-rubro').value.trim()
  const alias = document.getElementById('emp-alias').value.trim()
  const password = document.getElementById('emp-password').value.trim()
  const ownerId = document.getElementById('emp-owner').value
  const msg = document.getElementById('msg-empresa')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!nombre || !alias || !password || !ownerId) {
    msg.textContent = 'Completá todos los campos obligatorios.'
    return
  }

  const numeroCuenta = Math.floor(3000000000 + Math.random() * 6999999999).toString()

  const { error } = await supabase.from('companies').insert({
    nombre,
    rubro,
    alias,
    password_hash: password,
    numero_cuenta: numeroCuenta,
    owner_id: ownerId,
    saldo: 0
  })

  if (error) {
    msg.style.color = 'red'
    msg.textContent = 'Error al registrar. ¿El alias ya existe?'
    return
  }

  msg.style.color = 'green'
  msg.textContent = `✅ Empresa ${nombre} registrada con cuenta ${numeroCuenta}`

  document.getElementById('emp-nombre').value = ''
  document.getElementById('emp-rubro').value = ''
  document.getElementById('emp-alias').value = ''
  document.getElementById('emp-password').value = ''
  document.getElementById('emp-owner').value = ''

  cargarEmpresas()
}

cargarGerentes()
cargarEmpresas()
import { supabase } from './supabase.js'

let accionActual = null
let accountIdActual = null

// ===== CARGAR USUARIOS EN LA TABLA =====
async function cargarUsuarios() {
  const tbody = document.getElementById('tabla-usuarios')

  const { data: usuarios, error } = await supabase
    .from('users')
    .select('*, accounts(numero_cuenta, saldo, sueldo, id)')

  if (error || !usuarios) {
    tbody.innerHTML = '<tr><td colspan="8">Error al cargar usuarios.</td></tr>'
    return
  }

  tbody.innerHTML = ''

  for (const u of usuarios) {
    const cuenta = u.accounts?.[0]
    const numeroCuenta = cuenta?.numero_cuenta ?? '—'
    const saldo = cuenta?.saldo ?? 0
    const sueldo = cuenta?.sueldo ?? 0
    const accountId = cuenta?.id ?? null

    const fila = document.createElement('tr')
    fila.innerHTML = `
      <td>${u.username}</td>
      <td>${u.nombre} ${u.apellido}</td>
      <td>${numeroCuenta}</td>
      <td>U$D ${parseFloat(saldo).toFixed(2)}</td>
      <td>U$D ${parseFloat(sueldo).toFixed(2)}</td>
      <td><button class="btn-acreditar" onclick="abrirModal('acreditar', '${accountId}', '${u.username}')">ACREDITAR</button></td>
      <td><button class="btn-acreditar" onclick="abrirModal('sueldo', '${accountId}', '${u.username}')">EDITAR</button></td>
      <td><button class="btn-retirar" onclick="abrirModal('retirar', '${accountId}', '${u.username}')">RETIRAR</button></td>
    `
    tbody.appendChild(fila)
  }
}

// ===== MODAL =====
window.abrirModal = function (accion, accountId, username) {
  accionActual = accion
  accountIdActual = accountId

  const titulo = document.getElementById('modal-titulo')
  const subtitulo = document.getElementById('modal-subtitulo')
  const confirmar = document.getElementById('modal-confirmar')
  const monto = document.getElementById('modal-monto')

  if (accion === 'acreditar') {
    titulo.textContent = 'Acreditar fondos'
    confirmar.textContent = 'ACREDITAR'
    confirmar.className = 'btn-acreditar modal-btn'
  } else if (accion === 'retirar') {
    titulo.textContent = 'Retirar fondos'
    confirmar.textContent = 'RETIRAR'
    confirmar.className = 'btn-retirar modal-btn'
  } else if (accion === 'sueldo') {
    titulo.textContent = 'Editar sueldo'
    confirmar.textContent = 'GUARDAR'
    confirmar.className = 'btn-acreditar modal-btn'
  }

  subtitulo.textContent = `Usuario: ${username}`
  confirmar.onclick = confirmarModal
  monto.value = ''

  document.getElementById('modal-overlay').style.display = 'flex'
  monto.focus()
}

window.cerrarModal = function () {
  document.getElementById('modal-overlay').style.display = 'none'
  accionActual = null
  accountIdActual = null
}

async function confirmarModal() {
  const monto = parseFloat(document.getElementById('modal-monto').value)
  if (isNaN(monto) || monto <= 0) {
    alert('Ingresá un monto válido.')
    return
  }

  if (accionActual === 'sueldo') {
    await supabase
      .from('accounts')
      .update({ sueldo: monto })
      .eq('id', accountIdActual)
    cerrarModal()
    cargarUsuarios()
    return
  }

  const { data: cuenta } = await supabase
    .from('accounts')
    .select('saldo')
    .eq('id', accountIdActual)
    .single()

  let nuevoSaldo

  if (accionActual === 'acreditar') {
    nuevoSaldo = parseFloat(cuenta.saldo) + monto
    await supabase.from('transactions').insert({
      cuenta_destino: accountIdActual,
      monto,
      concepto: 'Acreditación por staff',
      tipo: 'acreditacion'
    })
  } else {
    if (monto > parseFloat(cuenta.saldo)) {
      alert('El usuario no tiene suficiente saldo.')
      return
    }
    nuevoSaldo = parseFloat(cuenta.saldo) - monto
    await supabase.from('transactions').insert({
      cuenta_origen: accountIdActual,
      monto,
      concepto: 'Retiro por staff',
      tipo: 'retiro'
    })
  }

  await supabase.from('accounts').update({ saldo: nuevoSaldo }).eq('id', accountIdActual)

  cerrarModal()
  cargarUsuarios()
}

// ===== CREAR USUARIO =====
window.crearUsuario = async function () {
  const nombre = document.getElementById('nuevo-nombre').value.trim()
  const apellido = document.getElementById('nuevo-apellido').value.trim()
  const username = document.getElementById('nuevo-username').value.trim()
  const password = document.getElementById('nuevo-password').value.trim()
  const rol = document.getElementById('nuevo-rol').value
  const msg = document.getElementById('msg-crear')

  if (!nombre || !apellido || !username || !password) {
    msg.style.color = 'red'
    msg.textContent = 'Completá todos los campos.'
    return
  }

  const { data: nuevoUser, error } = await supabase
    .from('users')
    .insert({ nombre, apellido, username, password_hash: password, rol })
    .select()
    .single()

  if (error) {
    msg.style.color = 'red'
    msg.textContent = 'Error al crear usuario. ¿El ID ya existe?'
    return
  }

  const numeroCuenta = Math.floor(1000000000 + Math.random() * 9000000000).toString()

  await supabase.from('accounts').insert({
    user_id: nuevoUser.id,
    numero_cuenta: numeroCuenta,
    saldo: 0
  })

  msg.style.color = 'green'
  msg.textContent = `Usuario ${username} creado con cuenta ${numeroCuenta}`

  document.getElementById('nuevo-nombre').value = ''
  document.getElementById('nuevo-apellido').value = ''
  document.getElementById('nuevo-username').value = ''
  document.getElementById('nuevo-password').value = ''

  cargarUsuarios()
}

cargarUsuarios()
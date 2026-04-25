import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)
let cuentaActual = null

async function cargarPerfil() {
  document.getElementById('dash-nombre').textContent = `${user.nombre} ${user.apellido}`

  // Lanzamos todas las consultas independientes en paralelo
  const [cuentaRes, empresaRes, empleoRes] = await Promise.all([
    supabase.from('accounts').select('numero_cuenta, saldo').eq('user_id', user.id).single(),
    supabase.from('companies').select('id, nombre').eq('owner_id', user.id).single(),
    supabase.from('company_employees').select('cargo, company_id, companies(nombre)').eq('user_id', user.id).single()
  ])

  const cuenta = cuentaRes.data
  const empresa = empresaRes.data
  const empleo = empleoRes.data

  // Cuenta
  if (cuenta) {
    cuentaActual = cuenta
    document.getElementById('dash-cuenta').textContent = `Número de cuenta: ${cuenta.numero_cuenta}`

    // Notificaciones y cobros en paralelo (dependen de numero_cuenta)
    const [notifsRes] = await Promise.all([
      supabase.from('notifications').select('id').eq('numero_cuenta', cuenta.numero_cuenta).eq('leida', false),
      verificarCobros(cuenta.numero_cuenta)
    ])

    if (notifsRes.data && notifsRes.data.length > 0) {
      const badge = document.getElementById('notif-badge')
      badge.textContent = notifsRes.data.length
      badge.style.display = 'inline'
    }

  } else {
    document.getElementById('dash-cuenta').textContent = 'Sin cuenta asignada'
  }

  // Gerente
  if (empresa) {
    document.getElementById('tarjeta-empresa').style.display = 'flex'
    document.getElementById('empresa-nombre').textContent = empresa.nombre

    localStorage.setItem('zpay_empleo', JSON.stringify({
      company_id: empresa.id,
      empresa_nombre: empresa.nombre,
      cargo: 'Gerente'
    }))

    document.getElementById('seccion-trabajo').style.display = 'block'
    document.getElementById('trabajo-empresa-nombre').textContent = empresa.nombre
    return
  }

  // Empleado (solo si no es gerente)
  if (empleo) {
    localStorage.setItem('zpay_empleo', JSON.stringify({
      company_id: empleo.company_id,
      empresa_nombre: empleo.companies.nombre,
      cargo: empleo.cargo
    }))

    document.getElementById('seccion-trabajo').style.display = 'block'
    document.getElementById('trabajo-empresa-nombre').textContent = empleo.companies.nombre
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

    await Promise.all([
      supabase.from('accounts').update({ saldo: saldo - monto }).eq('user_id', user.id),
      supabase.from('companies').update({ saldo: parseFloat(cobro.companies.saldo) + montoEmpresa }).eq('id', cobro.companies.id),
      supabase.from('companies').update({ saldo: parseFloat(tesoro.saldo) + montoTesoro }).eq('id', tesoro.id),
      supabase.from('transactions').insert({
        cuenta_origen: numeroCuenta,
        cuenta_destino: cobro.companies.numero_cuenta,
        monto,
        concepto: cobro.concepto,
        tipo: 'cobro',
        estado: 'completada'
      }),
      supabase.from('cobros').update({ estado: 'aceptado' }).eq('id', cobro.id)
    ])

    document.getElementById('cobro-popup').style.display = 'none'
    cuentaActual.saldo = saldo - monto

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
  localStorage.removeItem('zpay_empleo')
  window.location.href = 'login.html'
})

cargarPerfil()
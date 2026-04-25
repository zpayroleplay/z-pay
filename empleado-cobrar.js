import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
const empleoData = localStorage.getItem('zpay_empleo')
if (!userData || !empleoData) window.location.href = 'dashboard.html'

const user = JSON.parse(userData)
const empleo = JSON.parse(empleoData)

document.getElementById('cobrar-empresa').textContent = empleo.empresa_nombre
document.getElementById('cobrar-cargo').textContent = empleo.cargo

document.getElementById('btn-cobrar').addEventListener('click', async () => {
  const destino = document.getElementById('cobrar-destino').value.trim()
  const monto = parseFloat(document.getElementById('cobrar-monto').value)
  const concepto = document.getElementById('cobrar-concepto').value.trim()
  const msg = document.getElementById('cobrar-msg')

  if (!destino || !monto || !concepto) {
    msg.style.color = 'red'
    msg.textContent = 'Completá todos los campos.'
    return
  }

  if (monto <= 0) {
    msg.style.color = 'red'
    msg.textContent = 'El monto debe ser mayor a 0.'
    return
  }

  // Buscar cliente por alias o número de cuenta
  const { data: cuenta } = await supabase
    .from('accounts')
    .select('numero_cuenta')
    .or(`numero_cuenta.eq.${destino},alias.eq.${destino}`)
    .single()

  if (!cuenta) {
    msg.style.color = 'red'
    msg.textContent = 'No se encontró ningún cliente con ese alias o número de cuenta.'
    return
  }

  // Insertar cobro en nombre de la empresa
  const { error } = await supabase.from('cobros').insert({
    company_id: empleo.company_id,
    numero_cuenta_cliente: cuenta.numero_cuenta,
    monto,
    concepto,
    estado: 'pendiente'
  })

  if (error) {
    msg.style.color = 'red'
    msg.textContent = 'Error al generar el cobro.'
    return
  }

  msg.style.color = 'green'
  msg.textContent = '✅ Cobro generado correctamente.'
  document.getElementById('cobrar-destino').value = ''
  document.getElementById('cobrar-monto').value = ''
  document.getElementById('cobrar-concepto').value = ''
})
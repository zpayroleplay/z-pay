import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
const empleoData = localStorage.getItem('zpay_empleo')
if (!userData || !empleoData) window.location.href = 'dashboard.html'

const empleo = JSON.parse(empleoData)
const tbody = document.getElementById('cobros-tbody')

const estadoColor = {
  pendiente: '#f59e0b',
  aceptado:  '#22c55e',
  rechazado: '#ef4444'
}

async function cargarCobros() {
  const { data: cobros } = await supabase
    .from('cobros')
    .select('*')
    .eq('company_id', empleo.company_id)
    .order('created_at', { ascending: false })

  if (!cobros || cobros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#888; text-align:center">No hay cobros registrados.</td></tr>'
    return
  }

  tbody.innerHTML = cobros.map(c => {
    const fecha = new Date(c.created_at).toLocaleDateString('es-UY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Montevideo'
    })
    const color = estadoColor[c.estado] || '#888'
    return `
      <tr>
        <td>${c.numero_cuenta_cliente}</td>
        <td>U$D ${parseFloat(c.monto).toFixed(2)}</td>
        <td>${c.concepto}</td>
        <td><span style="color:${color}; font-weight:700; text-transform:uppercase">${c.estado}</span></td>
        <td>${fecha}</td>
      </tr>
    `
  }).join('')
}

cargarCobros()
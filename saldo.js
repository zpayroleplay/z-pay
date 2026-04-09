import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)

async function cargarSaldo() {
  const { data: cuenta } = await supabase
    .from('accounts')
    .select('id, numero_cuenta, saldo, alias')
    .eq('user_id', user.id)
    .single()

  if (cuenta) {
    document.getElementById('saldo-monto').textContent = `U$D ${parseFloat(cuenta.saldo).toFixed(2)}`
  } else {
    document.getElementById('saldo-monto').textContent = 'Sin cuenta'
  }
}

cargarSaldo()

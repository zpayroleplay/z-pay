import { supabase } from './supabase.js'

const userData = localStorage.getItem('zpay_user')
if (!userData) window.location.href = 'login.html'

const user = JSON.parse(userData)

async function cargarAlias() {
  const { data: cuenta } = await supabase
    .from('accounts')
    .select('alias')
    .eq('user_id', user.id)
    .single()

  document.getElementById('alias-actual').textContent = cuenta?.alias ?? 'Sin alias asignado'
}

window.cambiarPassword = async function () {
  const nueva = document.getElementById('nueva-password').value.trim()
  const repetir = document.getElementById('repetir-password').value.trim()
  const msg = document.getElementById('gestionar-msg')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!nueva || !repetir) {
    msg.textContent = 'Completá todos los campos.'
    return
  }

  if (nueva !== repetir) {
    msg.textContent = 'Las contraseñas no coinciden.'
    return
  }

  if (nueva.length < 4) {
    msg.textContent = 'La contraseña debe tener al menos 4 caracteres.'
    return
  }

  // Usa RPC que hashea con bcrypt antes de guardar
  const { error } = await supabase
    .rpc('cambiar_password', { p_user_id: user.id, p_nueva: nueva })

  if (error) {
    msg.textContent = 'Error al cambiar la contraseña.'
    return
  }

  msg.style.color = 'green'
  msg.textContent = '✅ Contraseña actualizada con éxito.'

  document.getElementById('nueva-password').value = ''
  document.getElementById('repetir-password').value = ''
}

window.cambiarAlias = async function () {
  const nuevoAlias = document.getElementById('nuevo-alias').value.trim()
  const msg = document.getElementById('alias-msg')

  msg.style.color = 'red'
  msg.textContent = ''

  if (!nuevoAlias) {
    msg.textContent = 'Escribí un alias.'
    return
  }

  if (nuevoAlias.length < 3) {
    msg.textContent = 'El alias debe tener al menos 3 caracteres.'
    return
  }

  const { data: existente } = await supabase
    .from('accounts')
    .select('id')
    .eq('alias', nuevoAlias)
    .single()

  if (existente) {
    msg.textContent = '❌ Ese alias ya está ocupado, elegí otro.'
    return
  }

  const { error } = await supabase
    .from('accounts')
    .update({ alias: nuevoAlias })
    .eq('user_id', user.id)

  if (error) {
    msg.textContent = 'Error al guardar el alias.'
    return
  }

  msg.style.color = 'green'
  msg.textContent = '✅ Alias guardado con éxito.'
  document.getElementById('alias-actual').textContent = nuevoAlias
  document.getElementById('nuevo-alias').value = ''
}

cargarAlias()

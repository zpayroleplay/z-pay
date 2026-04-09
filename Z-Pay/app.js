// Importamos la conexión a Supabase
import { supabase } from './supabase.js'

// ===== FUNCIÓN PARA MOSTRAR/OCULTAR CONTRASEÑA =====
window.togglePassword = function () {
  const input = document.getElementById('password')
  input.type = input.type === 'password' ? 'text' : 'password'
}

// ===== FUNCIÓN DE LOGIN =====
window.login = async function () {
  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value.trim()
  const errorMsg = document.getElementById('error-msg')

  // Limpiamos el mensaje de error anterior
  errorMsg.textContent = ''

  // Verificamos que no estén vacíos
  if (!username || !password) {
    errorMsg.textContent = 'Completá todos los campos.'
    return
  }

  // Le preguntamos a Supabase si existe ese usuario
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password_hash', password)
    .single()

  // Si hubo un error o no encontró al usuario
  if (error || !data) {
    errorMsg.textContent = 'Usuario o contraseña incorrectos.'
    return
  }

  // Si llegamos acá, el usuario existe
  // Guardamos sus datos para usarlos en las otras páginas
  localStorage.setItem('zpay_user', JSON.stringify(data))

  // Redirigimos según su rol
  if (data.rol === 'superadmin') {
  window.location.href = 'superadmin.html'
} else if (data.rol === 'admin') {
  window.location.href = 'admin-dashboard.html'
} else {
  window.location.href = 'dashboard.html'
}
}
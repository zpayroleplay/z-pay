import { supabase } from './supabase.js'

window.togglePassword = function () {
  const input = document.getElementById('password')
  input.type = input.type === 'password' ? 'text' : 'password'
}

window.login = async function () {
  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value.trim()
  const errorMsg = document.getElementById('error-msg')

  errorMsg.textContent = ''

  if (!username || !password) {
    errorMsg.textContent = 'Completá todos los campos.'
    return
  }

  const { data, error } = await supabase
    .rpc('verificar_login', { p_username: username, p_password: password })

  if (error || !data || data.length === 0) {
    errorMsg.textContent = 'Usuario o contraseña incorrectos.'
    return
  }

  const user = data[0]
  localStorage.setItem('zpay_user', JSON.stringify(user))

  if (user.rol === 'superadmin') {
    window.location.href = 'superadmin.html'
  } else if (user.rol === 'admin') {
    window.location.href = 'admin-dashboard.html'
  } else {
    window.location.href = 'dashboard.html'
  }
}

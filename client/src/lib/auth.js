export const getToken = () => localStorage.getItem('token')

export const getUser = () => {
  try {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

export const setAuth = (token, user) => {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const isAuthenticated = () => !!getToken()

export const isAdmin = () => {
  const user = getUser()
  return user?.role === 'admin'
}

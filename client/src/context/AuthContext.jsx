import React, { createContext, useContext, useState, useCallback } from 'react'
import { setAuth, clearAuth, getUser, getToken } from '../lib/auth'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser())
  const [token, setToken] = useState(() => getToken())

  const login = useCallback(async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    const { token, user } = response.data
    setAuth(token, user)
    setToken(token)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

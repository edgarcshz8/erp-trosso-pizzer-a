import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../lib/api'
import { useAuth } from './AuthContext'

const ShiftContext = createContext(null)

export function ShiftProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [currentShift, setCurrentShift] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      setLoading(true)
      const response = await api.get('/shifts/current')
      setCurrentShift(response.data)
    } catch (err) {
      setCurrentShift(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      refresh()
    }
  }, [isAuthenticated, refresh])

  return (
    <ShiftContext.Provider value={{ currentShift, loading, refresh, setCurrentShift }}>
      {children}
    </ShiftContext.Provider>
  )
}

export function useShift() {
  const ctx = useContext(ShiftContext)
  if (!ctx) throw new Error('useShift must be used within ShiftProvider')
  return ctx
}

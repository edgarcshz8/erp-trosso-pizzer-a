import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PinPad from '../components/PinPad'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [pin, setPin] = useState('')
  const [showPasswordMode, setShowPasswordMode] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'admin' ? '/dashboard' : '/pos')
    }
  }, [isAuthenticated])

  useEffect(() => {
    api.get('/auth/users').then(r => {
      setUsers(r.data)
      const cashiers = r.data.filter(u => u.role === 'cashier')
      if (cashiers.length > 0) setSelectedUser(cashiers[0])
    }).catch(() => {
      // Server might not be running yet
    })
  }, [])

  const handlePinConfirm = async (enteredPin) => {
    if (!selectedUser) return
    setLoading(true)
    try {
      const loggedUser = await login({ userId: selectedUser.id, pin: enteredPin })
      toast.success(`Bienvenido, ${loggedUser.name}`)
      navigate(loggedUser.role === 'admin' ? '/dashboard' : '/pos')
    } catch (err) {
      toast.error(err.response?.data?.error || 'PIN incorrecto')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    if (!selectedUser || !password) return
    setLoading(true)
    try {
      const loggedUser = await login({ userId: selectedUser.id, password })
      toast.success(`Bienvenido, ${loggedUser.name}`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Contraseña incorrecta')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  const cashiers = users.filter(u => u.role === 'cashier')
  const admins = users.filter(u => u.role === 'admin')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.jpg"
            alt="Trosso Colosso"
            className="w-32 h-32 object-contain mx-auto mb-4 rounded-2xl shadow-sm"
          />
          <h1 className="text-2xl font-bold text-gray-900">Trosso Colosso</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema Punto de Venta</p>
        </div>

        {!showPasswordMode ? (
          <>
            {/* Cashier user list */}
            {cashiers.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Selecciona tu usuario</p>
                <div className="space-y-2">
                  {cashiers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setPin('') }}
                      className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all text-left
                        ${selectedUser?.id === u.id
                          ? 'border-brand-red bg-red-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0
                        ${selectedUser?.id === u.id ? 'bg-brand-red text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {u.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{u.name}</div>
                        <div className="text-xs text-gray-400">Cajero</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PIN pad */}
            {selectedUser && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                  Ingresa tu PIN
                </p>
                <PinPad
                  value={pin}
                  onChange={setPin}
                  onConfirm={handlePinConfirm}
                  maxLength={6}
                />
              </div>
            )}

            {/* Admin login */}
            {admins.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <button
                  onClick={() => {
                    setSelectedUser(admins[0])
                    setShowPasswordMode(true)
                    setPin('')
                  }}
                  className="w-full text-sm text-gray-500 hover:text-brand-red py-2 transition-colors"
                >
                  Ingresar como Administrador
                </button>
              </div>
            )}

            {users.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">Conectando con el servidor...</p>
                <p className="text-xs text-gray-300 mt-1">Asegúrate de que el servidor esté corriendo</p>
              </div>
            )}
          </>
        ) : (
          /* Admin password form */
          <form onSubmit={handlePasswordLogin}>
            <div className="mb-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-red text-white flex items-center justify-center font-bold">
                  {selectedUser?.name?.[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm">{selectedUser?.name}</div>
                  <div className="text-xs text-gray-400">Administrador</div>
                </div>
              </div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Ingresa tu contraseña"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
            <button
              type="button"
              onClick={() => { setShowPasswordMode(false); setSelectedUser(cashiers[0] || null) }}
              className="w-full text-sm text-gray-400 hover:text-gray-600 mt-3 py-1 transition-colors"
            >
              Volver
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import { useShift } from '../../context/ShiftContext'
import CloseShiftModal from '../../components/CloseShiftModal'
import { formatCLP, formatDateTime } from '../../lib/format'
import { ClockIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function ProfilePage() {
  const { user } = useAuth()
  const { currentShift, refresh } = useShift()
  const [closingShift, setClosingShift] = useState(null)

  return (
    <Layout title="Mi perfil">
      <div className="max-w-lg space-y-5">

        {/* User info */}
        <div className="card flex items-center gap-4 p-5">
          <div className="w-16 h-16 rounded-full bg-brand-red text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">
            {user?.name?.[0] || '?'}
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{user?.name}</div>
            <div className="text-sm text-gray-400 mt-0.5">
              {user?.role === 'admin' ? 'Administrador' : 'Cajero'}
            </div>
          </div>
        </div>

        {/* Shift status */}
        <div className="card p-5 space-y-4">
          <div className="font-semibold text-gray-800">Turno actual</div>

          {currentShift ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <ClockIcon className="w-4 h-4" />
                  Turno abierto
                </div>
                <div className="text-sm text-emerald-600">
                  Apertura: {formatDateTime(currentShift.opened_at)}
                </div>
                <div className="text-sm text-emerald-600">
                  Caja inicial: {formatCLP(currentShift.opening_amount)}
                </div>
              </div>
              <button
                onClick={() => setClosingShift(currentShift)}
                className="btn-danger w-full"
              >
                Cerrar turno
              </button>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
              <XCircleIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <div className="text-sm text-gray-500">No hay turno activo</div>
            </div>
          )}
        </div>

      </div>

      {closingShift && (
        <CloseShiftModal
          shift={closingShift}
          open={true}
          onClose={() => setClosingShift(null)}
          onSave={() => { setClosingShift(null); refresh() }}
        />
      )}
    </Layout>
  )
}

import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import { useShift } from '../../context/ShiftContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { formatCLP, formatDateTime } from '../../lib/format'
import {
  ExclamationTriangleIcon, CheckCircleIcon,
  ClockIcon, XCircleIcon
} from '@heroicons/react/24/outline'

function CloseShiftModal({ shift, open, onClose, onSave }) {
  const [form, setForm] = useState({ counted_cash: '', counted_transfer: '', counted_card: '', counted_junaeb: '', notes: '' })
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && shift) {
      api.get(`/shifts/${shift.id}`).then(r => setDetail(r.data)).catch(() => {})
    }
  }, [open, shift?.id])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post(`/shifts/${shift.id}/close`, form)
      toast.success('Turno cerrado')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cerrar turno')
    } finally {
      setLoading(false)
    }
  }

  const totals = detail?.totals || {}
  const methods = [
    { key: 'counted_cash',     label: 'Efectivo',      expected: totals.expected_cash || 0 },
    { key: 'counted_transfer', label: 'Transferencia', expected: totals.by_method?.transferencia || 0 },
    { key: 'counted_card',     label: 'Tarjeta',       expected: totals.by_method?.tarjeta || 0 },
    { key: 'counted_junaeb',   label: 'Junaeb',        expected: totals.by_method?.junaeb || 0 },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Cerrar turno — Arqueo de caja" size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-danger">
            {loading ? 'Cerrando...' : 'Cerrar turno'}
          </button>
        </>
      }>
      <div className="space-y-3">
        <div className="font-semibold text-sm text-gray-700">Conteo físico</div>
        {methods.map(m => {
          const counted = parseFloat(form[m.key] || 0)
          const diff = form[m.key] !== '' ? counted - parseFloat(m.expected) : null
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">{m.label}</label>
                {detail && (
                  <span className="text-xs text-gray-400">
                    Esperado: <span className="font-medium text-gray-600">{formatCLP(m.expected)}</span>
                  </span>
                )}
              </div>
              <input
                type="number"
                className="input"
                value={form[m.key]}
                onChange={e => setForm(f => ({ ...f, [m.key]: e.target.value }))}
                min="0"
                placeholder="0"
              />
              {diff !== null && (
                <div className={`text-xs mt-1 font-medium flex items-center gap-1 ${diff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {diff === 0
                    ? <><CheckCircleIcon className="w-3.5 h-3.5" /> Cuadra</>
                    : <><ExclamationTriangleIcon className="w-3.5 h-3.5" /> Diferencia: {diff > 0 ? '+' : ''}{formatCLP(diff)}</>
                  }
                </div>
              )}
            </div>
          )
        })}
        <div>
          <label className="label">Notas</label>
          <textarea
            className="input min-h-[80px]"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Observaciones del turno..."
          />
        </div>
      </div>
    </Modal>
  )
}

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

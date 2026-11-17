import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { formatCLP } from '../lib/format'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function CloseShiftModal({ shift, open, onClose, onSave }) {
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

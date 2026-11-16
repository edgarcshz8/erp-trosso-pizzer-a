import React, { useState } from 'react'
import Modal from '../../components/Modal'
import { formatCLP } from '../../lib/format'

const METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'transferencia', label: 'Transferencia', icon: '📲' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'junaeb', label: 'Junaeb', icon: '🎓' },
]

export default function PaymentModal({ open, onClose, total, onConfirm, loading }) {
  const [method, setMethod] = useState('efectivo')
  const [cashInput, setCashInput] = useState('')

  const cash = parseInt(cashInput) || 0
  const change = method === 'efectivo' ? Math.max(0, cash - total) : 0
  const canPay = method !== 'efectivo' || cash >= total

  const appendDigit = (d) => {
    if (d === 'C') { setCashInput(''); return }
    if (d === '00') { setCashInput(prev => prev + '00'); return }
    setCashInput(prev => (prev + d).slice(0, 8))
  }

  const handleConfirm = () => {
    onConfirm({ method, cashReceived: method === 'efectivo' ? cash : total, change })
  }

  const quickAmounts = [
    Math.ceil(total / 1000) * 1000,
    Math.ceil(total / 2000) * 2000,
    Math.ceil(total / 5000) * 5000,
    Math.ceil(total / 10000) * 10000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= total).slice(0, 4)

  return (
    <Modal open={open} onClose={onClose} title="Cobrar venta" size="sm">
      <div className="space-y-4">
        {/* Total */}
        <div className="bg-gray-50 rounded-2xl p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">Total a cobrar</div>
          <div className="text-4xl font-bold text-gray-900">{formatCLP(total)}</div>
        </div>

        {/* Payment method */}
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Método de pago</div>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`p-3 rounded-xl border-2 font-semibold text-sm transition-all
                  ${method === m.id
                    ? 'border-brand-red bg-red-50 text-brand-red'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                <div className="text-xl mb-1">{m.icon}</div>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cash numpad */}
        {method === 'efectivo' && (
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Efectivo recibido</div>

            {/* Quick amounts */}
            {quickAmounts.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {quickAmounts.map(a => (
                  <button
                    key={a}
                    onClick={() => setCashInput(String(a))}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg border transition-all
                      ${cash === a ? 'bg-brand-red text-white border-brand-red' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {formatCLP(a)}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-gray-50 rounded-xl px-4 py-3 text-right text-2xl font-bold text-gray-900 mb-3 min-h-[52px]">
              {cashInput ? formatCLP(parseInt(cashInput)) : <span className="text-gray-300">0</span>}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9','C','0','00'].map(k => (
                <button
                  key={k}
                  onClick={() => appendDigit(k)}
                  className={`h-11 rounded-xl text-lg font-bold transition-all active:scale-95
                    ${k === 'C'
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-white border border-gray-200 text-gray-800 hover:border-brand-red hover:text-brand-red'}`}
                >
                  {k}
                </button>
              ))}
            </div>

            {cashInput && (
              <div className={`mt-3 p-3 rounded-xl text-center font-bold text-sm ${canPay ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {canPay ? `Vuelto: ${formatCLP(change)}` : `Faltan: ${formatCLP(total - cash)}`}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={loading || !canPay}
          className="w-full py-4 bg-brand-red hover:bg-brand-red-dark disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold text-lg rounded-2xl transition-all active:scale-98"
        >
          {loading ? 'Procesando...' : `Cobrar ${formatCLP(total)}`}
        </button>
      </div>
    </Modal>
  )
}

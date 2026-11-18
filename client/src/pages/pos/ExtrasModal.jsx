import React, { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import api from '../../lib/api'
import { formatCLP } from '../../lib/format'
import { XMarkIcon } from '@heroicons/react/24/outline'

export default function ExtrasModal({ open, onClose, onConfirm, productName }) {
  const [extras, setExtras] = useState([])
  const [selected, setSelected] = useState({})

  useEffect(() => {
    if (open) {
      api.get('/extras?active=true').then(r => setExtras(r.data)).catch(() => {})
      setSelected({})
    }
  }, [open])

  const toggle = (extra) => {
    setSelected(prev => {
      const qty = (prev[extra.id]?.quantity || 0)
      if (qty === 0) {
        return { ...prev, [extra.id]: { ...extra, quantity: 1 } }
      }
      const next = { ...prev }
      delete next[extra.id]
      return next
    })
  }

  const changeQty = (extraId, delta) => {
    setSelected(prev => {
      const current = prev[extraId]
      if (!current) return prev
      const newQty = current.quantity + delta
      if (newQty <= 0) {
        const next = { ...prev }
        delete next[extraId]
        return next
      }
      return { ...prev, [extraId]: { ...current, quantity: newQty } }
    })
  }

  const totalExtras = Object.values(selected).reduce((s, e) => s + e.price * e.quantity, 0)
  const selectedList = Object.values(selected)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Extras para ${productName}`}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button
            onClick={() => onConfirm(selectedList)}
            className="btn-primary"
          >
            {selectedList.length > 0 ? `Agregar extras (${formatCLP(totalExtras)})` : 'Sin extras'}
          </button>
        </>
      }
    >
      {extras.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No hay extras disponibles</p>
      ) : (
        <div className="space-y-2">
          {extras.map(extra => {
            const sel = selected[extra.id]
            return (
              <div
                key={extra.id}
                onClick={() => toggle(extra)}
                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${sel ? 'border-brand-red bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div>
                  <div className="font-medium text-sm text-gray-800">{extra.name}</div>
                  <div className="text-xs text-brand-red font-semibold">{formatCLP(extra.price)}</div>
                </div>
                {sel ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => changeQty(extra.id, -1)}
                      className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-lg font-bold hover:bg-red-50 active:scale-95"
                    >−</button>
                    <span className="font-bold text-sm w-5 text-center">{sel.quantity}</span>
                    <button
                      onClick={() => changeQty(extra.id, 1)}
                      className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-lg font-bold hover:bg-green-50 active:scale-95"
                    >+</button>
                    <button
                      onClick={() => toggle(extra)}
                      className="w-8 h-8 rounded-full bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center active:scale-95 transition-colors"
                      title="Quitar"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

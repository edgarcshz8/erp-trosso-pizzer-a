import React, { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import api from '../../lib/api'
import { formatCLP } from '../../lib/format'

export default function HalfHalfModal({ open, onClose, onConfirm, currentProduct }) {
  const [pizzas, setPizzas] = useState([])
  const [half1, setHalf1] = useState(null)
  const [half2, setHalf2] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      api.get('/products?is_pizza=true&active=true').then(r => {
        setPizzas(r.data)
        setHalf1(currentProduct || null)
        setHalf2(null)
      }).catch(() => {})
    }
  }, [open, currentProduct])

  const filtered = pizzas.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  // Price rule: use the more expensive half
  const price = half1 && half2
    ? Math.max(parseFloat(half1.price), parseFloat(half2.price))
    : (half1?.price || 0)

  const handleConfirm = () => {
    if (!half1 || !half2) return
    onConfirm({
      product: { ...currentProduct, is_half_half: true, half1, half2, price },
      half1,
      half2,
      price
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pizza mitad y mitad"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!half1 || !half2}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Agregar mitad y mitad
          </button>
        </>
      }
    >
      {/* Selected halves preview */}
      <div className="flex gap-3 mb-4">
        <div className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${half1 ? 'border-brand-red bg-red-50' : 'border-dashed border-gray-300'}`}>
          <div className="text-xs text-gray-400 mb-1">Primera mitad</div>
          {half1 ? (
            <>
              <div className="font-semibold text-sm">{half1.name}</div>
              <div className="text-xs text-brand-red">{formatCLP(half1.price)}</div>
            </>
          ) : (
            <div className="text-gray-300 text-sm">Sin seleccionar</div>
          )}
        </div>
        <div className="flex items-center text-gray-400 font-bold">+</div>
        <div className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${half2 ? 'border-brand-red bg-red-50' : 'border-dashed border-gray-300'}`}>
          <div className="text-xs text-gray-400 mb-1">Segunda mitad</div>
          {half2 ? (
            <>
              <div className="font-semibold text-sm">{half2.name}</div>
              <div className="text-xs text-brand-red">{formatCLP(half2.price)}</div>
            </>
          ) : (
            <div className="text-gray-300 text-sm">Sin seleccionar</div>
          )}
        </div>
      </div>

      {half1 && half2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center mb-4">
          <span className="text-sm font-semibold text-amber-700">
            Precio final: {formatCLP(price)} (precio más alto)
          </span>
        </div>
      )}

      <input
        type="text"
        placeholder="Buscar pizza..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input mb-3"
      />

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {filtered.map(pizza => {
          const isH1 = half1?.id === pizza.id
          const isH2 = half2?.id === pizza.id
          return (
            <button
              key={pizza.id}
              onClick={() => {
                if (!half1 || isH1) {
                  setHalf1(isH1 ? null : pizza)
                } else if (!half2 || isH2) {
                  setHalf2(isH2 ? null : pizza)
                } else {
                  setHalf2(pizza)
                }
              }}
              className={`p-3 rounded-xl border-2 text-left transition-all
                ${isH1 ? 'border-brand-red bg-red-50' : isH2 ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="font-medium text-sm">{pizza.name}</div>
              <div className="text-xs text-gray-400 mt-1">{formatCLP(pizza.price)}</div>
              {(isH1 || isH2) && (
                <div className={`text-xs font-bold mt-1 ${isH1 ? 'text-brand-red' : 'text-blue-600'}`}>
                  {isH1 ? '1ra mitad' : '2da mitad'}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

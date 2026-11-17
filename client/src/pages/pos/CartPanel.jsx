import React from 'react'
import { TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { formatCLP } from '../../lib/format'

export default function CartPanel({
  items, channel, onChannelChange, wholesale, onWholesaleToggle,
  onQtyChange, onRemove, onPay, onClearCart,
  customerName, onCustomerNameChange, customerAddress, onCustomerAddressChange,
  promotions = [], appliedPromo, onApplyPromo,
}) {
  const subtotal = items.reduce((s, item) => s + item.unit_price * item.quantity, 0)
  const discount = items.reduce((s, item) => s + (item.discount || 0), 0)
  const total = subtotal - discount

  return (
    <div className="bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Channel toggle */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
          {['paso', 'delivery'].map(ch => (
            <button
              key={ch}
              onClick={() => onChannelChange(ch)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all
                ${channel === ch ? 'bg-white text-brand-red shadow-sm' : 'text-gray-500'}`}
            >
              {ch === 'paso' ? 'Al paso' : 'Delivery'}
            </button>
          ))}
        </div>

        {/* Wholesale toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={onWholesaleToggle}
            className={`w-10 h-5 rounded-full transition-all relative ${wholesale ? 'bg-brand-red' : 'bg-gray-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow ${wholesale ? 'right-0.5' : 'left-0.5'}`} />
          </div>
          <span className="text-sm text-gray-600">Precio mayorista</span>
        </label>

        {/* Delivery fields */}
        {channel === 'delivery' && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={customerName}
              onChange={e => onCustomerNameChange(e.target.value)}
              className="input text-sm py-2"
            />
            <input
              type="text"
              placeholder="Dirección de entrega"
              value={customerAddress}
              onChange={e => onCustomerAddressChange(e.target.value)}
              className="input text-sm py-2"
            />
          </div>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
            <div className="text-5xl mb-3">🛒</div>
            <div className="text-base font-semibold text-gray-700 mb-1">Carrito vacío</div>
            <div className="text-sm text-gray-400">Toca un producto para agregar</div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 group">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800 leading-tight">
                    {item.is_half_half ? `½ ${item.half1_name} + ½ ${item.half2_name}` : item.name}
                    {item.size_name && <span className="text-xs text-gray-400 ml-1">({item.size_name})</span>}
                  </div>
                  {item.extras?.length > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      + {item.extras.map(e => e.name).join(', ')}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-xs text-gray-400 italic mt-0.5">{item.notes}</div>
                  )}
                  {item.promo_name && (
                    <div className="text-xs text-emerald-600 font-medium">
                      🏷 {item.promo_name}{item.discount > 0 ? ` · -${formatCLP(item.discount)}` : ''}
                    </div>
                  )}
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onQtyChange(idx, -1)}
                    className="w-10 h-10 rounded-xl border border-gray-200 hover:border-brand-red hover:text-brand-red flex items-center justify-center text-lg font-bold bg-white transition-colors active:scale-95"
                  >−</button>
                  <span className="w-7 text-center font-bold text-sm">{item.quantity}</span>
                  <button
                    onClick={() => onQtyChange(idx, 1)}
                    className="w-10 h-10 rounded-xl border border-gray-200 hover:border-brand-red hover:text-brand-red flex items-center justify-center text-lg font-bold bg-white transition-colors active:scale-95"
                  >+</button>
                </div>

                <div className="text-right flex-shrink-0 min-w-[64px]">
                  <div className="font-bold text-sm text-gray-800">{formatCLP(item.unit_price * item.quantity)}</div>
                  <button
                    onClick={() => onRemove(idx)}
                    className="text-gray-300 hover:text-red-500 transition-colors mt-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promo selector */}
      {promotions.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
          <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Promoción</p>
          <div className="flex items-center gap-2">
            <select
              value={appliedPromo?.id || ''}
              onChange={e => {
                const promo = promotions.find(p => p.id === parseInt(e.target.value))
                onApplyPromo(promo || null)
              }}
              className="flex-1 input text-sm py-1.5"
            >
              <option value="">Sin promoción</option>
              {promotions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {appliedPromo && (
              <button
                onClick={() => onApplyPromo(null)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                title="Quitar promoción"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Totals and pay button */}
      <div className="border-t-2 border-gray-100 p-4 bg-gray-50">
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>{formatCLP(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 font-medium">
              <span>Descuento</span>
              <span>-{formatCLP(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span className="text-brand-red">{formatCLP(total)}</span>
          </div>
        </div>

        <button
          onClick={onPay}
          disabled={items.length === 0}
          className="w-full py-4 text-white font-bold text-lg rounded-2xl transition-all active:scale-98
            bg-brand-red hover:bg-brand-red-dark disabled:bg-gray-200 disabled:cursor-not-allowed"
        >
          {channel === 'delivery' ? 'Registrar pedido' : `Cobrar ${formatCLP(total)}`}
        </button>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Limpiar carrito
          </button>
        )}
      </div>
    </div>
  )
}

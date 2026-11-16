import React, { useState, useEffect } from 'react'
import Modal from '../../components/Modal'
import api from '../../lib/api'
import { formatCLP, formatDateTime } from '../../lib/format'
import toast from 'react-hot-toast'
import Badge from '../../components/Badge'

const METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'junaeb', label: 'Junaeb' },
]

export default function DeliveryModal({ open, onClose }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [payingOrder, setPayingOrder] = useState(null)
  const [payMethod, setPayMethod] = useState('efectivo')

  const fetchOrders = async () => {
    try {
      const r = await api.get('/sales?channel=delivery&status=pending&limit=50')
      setOrders(r.data)
    } catch {}
  }

  useEffect(() => {
    if (open) fetchOrders()
  }, [open])

  const handlePay = async (order) => {
    setLoading(true)
    try {
      await api.patch(`/sales/${order.id}/pay`, { payment_method: payMethod })
      toast.success('Pedido marcado como pagado')
      setPayingOrder(null)
      fetchOrders()
    } catch (err) {
      toast.error('Error al actualizar pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Pedidos Delivery Pendientes" size="lg">
      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🛵</div>
          <div>No hay pedidos de delivery pendientes</div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-gray-800">{order.customer_name || 'Sin nombre'}</div>
                  <div className="text-sm text-gray-400">{order.customer_address || 'Sin dirección'}</div>
                  <div className="text-xs text-gray-300 mt-1">{formatDateTime(order.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-brand-red text-lg">{formatCLP(order.total)}</div>
                  <Badge variant="warning">Pendiente</Badge>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="text-sm text-gray-500 mb-3 border-t border-gray-100 pt-2">
                  {order.items.map((item, i) => (
                    <div key={i}>{item.quantity}x {item.product_name}</div>
                  ))}
                </div>
              )}

              {payingOrder?.id === order.id ? (
                <div>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {METHODS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setPayMethod(m.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                          ${payMethod === m.id ? 'bg-brand-red text-white border-brand-red' : 'border-gray-200 text-gray-600'}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPayingOrder(null)} className="btn-ghost text-sm flex-1">Cancelar</button>
                    <button
                      onClick={() => handlePay(order)}
                      disabled={loading}
                      className="btn-primary text-sm flex-1"
                    >
                      Confirmar pago
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setPayingOrder(order); setPayMethod('efectivo') }}
                  className="w-full py-2 bg-brand-red text-white rounded-xl text-sm font-semibold hover:bg-brand-red-dark transition-colors"
                >
                  Marcar como pagado
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

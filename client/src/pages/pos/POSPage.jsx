import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useShift } from '../../context/ShiftContext'
import { useAuth } from '../../context/AuthContext'
import ProductGrid from './ProductGrid'
import CartPanel from './CartPanel'
import PaymentModal from './PaymentModal'
import HalfHalfModal from './HalfHalfModal'
import ExtrasModal from './ExtrasModal'
import DeliveryModal from './DeliveryModal'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { formatCLP } from '../../lib/format'
import { TruckIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export default function POSPage() {
  const navigate = useNavigate()
  const { currentShift, refresh: refreshShift } = useShift()
  const { user } = useAuth()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [channel, setChannel] = useState('paso')
  const [wholesale, setWholesale] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  const [showPayment, setShowPayment] = useState(false)
  const [showHalfHalf, setShowHalfHalf] = useState(false)
  const [showExtras, setShowExtras] = useState(false)
  const [showDelivery, setShowDelivery] = useState(false)
  const [showOpenShift, setShowOpenShift] = useState(false)
  const [showCartMobile, setShowCartMobile] = useState(false)

  const [pendingProduct, setPendingProduct] = useState(null)
  const [openingAmount, setOpeningAmount] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [openShiftLoading, setOpenShiftLoading] = useState(false)

  useEffect(() => {
    api.get('/products?active=true').then(r => setProducts(r.data)).catch(() => {})
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {})
  }, [])

  const addToCart = useCallback((product) => {
    if (product.is_pizza) {
      setPendingProduct(product)
      setShowHalfHalf(true)
      return
    }

    if (product.is_pizza || product.category_name === 'Pizzas') {
      // Show extras option for pizzas
    }

    const price = wholesale && product.wholesale_price
      ? parseFloat(product.wholesale_price)
      : parseFloat(product.price)

    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === product.id && !i.is_half_half)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
        return updated
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        unit_price: price,
        quantity: 1,
        discount: 0,
        is_half_half: false,
        category_name: product.category_name,
      }]
    })
  }, [wholesale])

  const handleHalfHalfConfirm = ({ half1, half2, price }) => {
    setCart(prev => [...prev, {
      product_id: pendingProduct.id,
      name: pendingProduct.name,
      unit_price: price,
      quantity: 1,
      discount: 0,
      is_half_half: true,
      half1_product_id: half1.id,
      half1_name: half1.name,
      half2_product_id: half2.id,
      half2_name: half2.name,
    }])
    setShowHalfHalf(false)
    setPendingProduct(null)
  }

  const handleQtyChange = (idx, delta) => {
    setCart(prev => {
      const updated = [...prev]
      const newQty = updated[idx].quantity + delta
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== idx)
      }
      updated[idx] = { ...updated[idx], quantity: newQty }
      return updated
    })
  }

  const handleRemove = (idx) => {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  const handlePay = () => {
    if (!currentShift && channel !== 'delivery') {
      setShowOpenShift(true)
      return
    }
    setShowPayment(true)
  }

  const handlePaymentConfirm = async ({ method, cashReceived, change }) => {
    if (cart.length === 0) return
    setPayLoading(true)

    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        size_id: item.size_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        is_half_half: item.is_half_half || false,
        half1_product_id: item.half1_product_id || null,
        half2_product_id: item.half2_product_id || null,
        notes: item.notes || null,
        extras: item.extras || [],
      }))

      await api.post('/sales', {
        items,
        channel,
        payment_method: channel === 'delivery' ? null : method,
        cash_received: cashReceived,
        wholesale,
        customer_name: customerName || null,
        customer_address: customerAddress || null,
      })

      toast.success('Venta registrada exitosamente')
      setCart([])
      setCustomerName('')
      setCustomerAddress('')
      setShowPayment(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar venta')
    } finally {
      setPayLoading(false)
    }
  }

  const handleOpenShift = async () => {
    setOpenShiftLoading(true)
    try {
      await api.post('/shifts/open', { opening_amount: parseFloat(openingAmount) || 0 })
      await refreshShift()
      toast.success('Turno abierto correctamente')
      setShowOpenShift(false)
      setOpeningAmount('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al abrir turno')
    } finally {
      setOpenShiftLoading(false)
    }
  }

  const total = cart.reduce((s, i) => s + i.unit_price * i.quantity - (i.discount || 0), 0)

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* POS Topbar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bars3Icon className="w-5 h-5 text-gray-500" />
        </button>
        <img src="/logo.jpg" alt="Trosso Colosso" className="w-8 h-8 rounded-lg object-cover" />
        <span className="font-bold text-gray-900 flex-1">Punto de Venta</span>

        {currentShift ? (
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-medium">
            Turno abierto
          </span>
        ) : (
          <button
            onClick={() => setShowOpenShift(true)}
            className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-medium hover:bg-amber-200"
          >
            Abrir turno
          </button>
        )}

        <button
          onClick={() => setShowDelivery(true)}
          className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <TruckIcon className="w-5 h-5 text-gray-500" />
        </button>

        {/* Mobile cart toggle */}
        <button
          className="md:hidden relative p-2 hover:bg-gray-100 rounded-lg"
          onClick={() => setShowCartMobile(true)}
        >
          <span className="text-sm font-bold text-brand-red">{formatCLP(total)}</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-red text-white rounded-full text-xs flex items-center justify-center">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      </header>

      {/* Main POS layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Product grid */}
        <div className="flex-1 overflow-hidden p-4">
          <ProductGrid
            products={products}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQ={searchQ}
            onSearch={setSearchQ}
            onAdd={addToCart}
            wholesale={wholesale}
          />
        </div>

        {/* Cart panel - desktop */}
        <div className="hidden md:flex w-96 flex-shrink-0">
          <CartPanel
            items={cart}
            channel={channel}
            onChannelChange={setChannel}
            wholesale={wholesale}
            onWholesaleToggle={() => setWholesale(w => !w)}
            onQtyChange={handleQtyChange}
            onRemove={handleRemove}
            onPay={handlePay}
            onClearCart={() => setCart([])}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerAddress={customerAddress}
            onCustomerAddressChange={setCustomerAddress}
          />
        </div>
      </div>

      {/* Mobile cart bottom sheet */}
      {showCartMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCartMobile(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-bold">Carrito</span>
              <button onClick={() => setShowCartMobile(false)}>
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartPanel
                items={cart}
                channel={channel}
                onChannelChange={setChannel}
                wholesale={wholesale}
                onWholesaleToggle={() => setWholesale(w => !w)}
                onQtyChange={handleQtyChange}
                onRemove={handleRemove}
                onPay={() => { setShowCartMobile(false); handlePay() }}
                onClearCart={() => setCart([])}
                customerName={customerName}
                onCustomerNameChange={setCustomerName}
                customerAddress={customerAddress}
                onCustomerAddressChange={setCustomerAddress}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        total={total}
        onConfirm={handlePaymentConfirm}
        loading={payLoading}
      />

      <HalfHalfModal
        open={showHalfHalf}
        onClose={() => { setShowHalfHalf(false); setPendingProduct(null) }}
        onConfirm={handleHalfHalfConfirm}
        currentProduct={pendingProduct}
      />

      <DeliveryModal
        open={showDelivery}
        onClose={() => setShowDelivery(false)}
      />

      {/* Open shift modal */}
      <Modal
        open={showOpenShift}
        onClose={() => setShowOpenShift(false)}
        title="Abrir turno de caja"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowOpenShift(false)} className="btn-ghost">Cancelar</button>
            <button
              onClick={handleOpenShift}
              disabled={openShiftLoading}
              className="btn-primary"
            >
              {openShiftLoading ? 'Abriendo...' : 'Abrir turno'}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="label">Fondo inicial de caja</label>
          <input
            type="number"
            value={openingAmount}
            onChange={e => setOpeningAmount(e.target.value)}
            className="input"
            placeholder="0"
            min="0"
          />
        </div>
        <p className="text-sm text-gray-400">El turno se abrirá con el monto indicado como fondo inicial.</p>
      </Modal>
    </div>
  )
}

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { TruckIcon, Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import CloseShiftModal from '../../components/CloseShiftModal'

export default function POSPage() {
  const navigate = useNavigate()
  const { currentShift, refresh: refreshShift } = useShift()
  const { user, logout } = useAuth()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [promotions, setPromotions] = useState([])
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
  const [closingShift, setClosingShift] = useState(null)

  const [appliedPromo, setAppliedPromo] = useState(null)

  const [pendingProduct, setPendingProduct] = useState(null)
  const [showPizzaOption, setShowPizzaOption] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [openShiftLoading, setOpenShiftLoading] = useState(false)

  useEffect(() => {
    api.get('/products?active=true').then(r => setProducts(r.data)).catch(() => {})
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {})
    api.get('/promotions?active_only=true').then(r => setPromotions(r.data)).catch(() => {})
  }, [])

  // Recalculate all cart prices when wholesale toggle changes
  useEffect(() => {
    setCart(prev => prev.map(item => {
      if (item.is_half_half) {
        if (item.half1_base_price == null || item.half2_base_price == null) return item
        const p1 = wholesale && item.half1_wholesale_price ? item.half1_wholesale_price : item.half1_base_price
        const p2 = wholesale && item.half2_wholesale_price ? item.half2_wholesale_price : item.half2_base_price
        return { ...item, unit_price: Math.max(p1, p2) }
      }
      if (item.base_price == null) return item
      const newPrice = wholesale && item.wholesale_price ? item.wholesale_price : item.base_price
      return { ...item, unit_price: newPrice }
    }))
  }, [wholesale])

  const addWholeToCart = useCallback((product) => {
    const basePrice = parseFloat(product.price)
    const wholesalePrice = product.wholesale_price ? parseFloat(product.wholesale_price) : null
    const price = wholesale && wholesalePrice ? wholesalePrice : basePrice

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
        base_price: basePrice,
        wholesale_price: wholesalePrice,
        quantity: 1,
        discount: 0,
        is_half_half: false,
        category_name: product.category_name,
      }]
    })
  }, [wholesale])

  const addToCart = useCallback((product) => {
    if (product.is_pizza) {
      setPendingProduct(product)
      setShowPizzaOption(true)
      return
    }
    addWholeToCart(product)
  }, [addWholeToCart])

  const handleHalfHalfConfirm = ({ half1, half2 }) => {
    const h1Base = parseFloat(half1.price)
    const h1Wholesale = half1.wholesale_price ? parseFloat(half1.wholesale_price) : null
    const h2Base = parseFloat(half2.price)
    const h2Wholesale = half2.wholesale_price ? parseFloat(half2.wholesale_price) : null

    const p1 = wholesale && h1Wholesale ? h1Wholesale : h1Base
    const p2 = wholesale && h2Wholesale ? h2Wholesale : h2Base
    const computedPrice = Math.max(p1, p2)

    setCart(prev => [...prev, {
      product_id: pendingProduct.id,
      name: pendingProduct.name,
      unit_price: computedPrice,
      quantity: 1,
      discount: 0,
      is_half_half: true,
      half1_product_id: half1.id,
      half1_name: half1.name,
      half1_base_price: h1Base,
      half1_wholesale_price: h1Wholesale,
      half2_product_id: half2.id,
      half2_name: half2.name,
      half2_base_price: h2Base,
      half2_wholesale_price: h2Wholesale,
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
      const items = cartWithPromos.map(item => ({
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
      setAppliedPromo(null)
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

  const cartWithPromos = useMemo(() => {
    return cart.map(item => {
      if (!appliedPromo) return { ...item, discount: 0, promo_name: null }

      const matches =
        appliedPromo.applies_to === 'all' ||
        (appliedPromo.applies_to === 'product' && parseInt(appliedPromo.product_id) === parseInt(item.product_id))

      if (!matches) return { ...item, discount: 0, promo_name: null }

      const unitPrice = item.unit_price
      const qty = item.quantity
      let discount = 0

      if (appliedPromo.type === 'percentage') {
        discount = Math.round(unitPrice * qty * parseFloat(appliedPromo.value) / 100)
      } else if (appliedPromo.type === 'discount') {
        discount = parseFloat(appliedPromo.value) * qty
      } else if (appliedPromo.type === '2x1') {
        discount = Math.floor(qty / 2) * unitPrice
      }

      return { ...item, discount, promo_name: appliedPromo.name }
    })
  }, [cart, appliedPromo])

  const total = cartWithPromos.reduce((s, i) => s + i.unit_price * i.quantity - (i.discount || 0), 0)

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
          <button
            onClick={() => setClosingShift(currentShift)}
            className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-medium hover:bg-red-100 hover:text-red-700 transition-colors"
            title="Cerrar turno"
          >
            Turno abierto
          </button>
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
          title="Delivery"
        >
          <TruckIcon className="w-5 h-5 text-gray-500" />
        </button>

        <button
          onClick={() => { logout(); navigate('/login') }}
          className="p-2 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
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
            items={cartWithPromos}
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
            promotions={promotions}
            appliedPromo={appliedPromo}
            onApplyPromo={setAppliedPromo}
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
                items={cartWithPromos}
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
                promotions={promotions}
                appliedPromo={appliedPromo}
                onApplyPromo={setAppliedPromo}
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

      {/* Pizza option: entera o mitad y mitad */}
      <Modal
        open={showPizzaOption}
        onClose={() => { setShowPizzaOption(false); setPendingProduct(null) }}
        title={pendingProduct?.name || 'Pizza'}
        size="sm"
        footer={null}
      >
        <p className="text-sm text-gray-500 mb-4">¿Cómo la agregas?</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setShowPizzaOption(false)
              addWholeToCart(pendingProduct)
              setPendingProduct(null)
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-red hover:bg-red-50 transition-all"
          >
            <span className="text-3xl">🍕</span>
            <span className="font-semibold text-sm text-gray-700">Pizza entera</span>
            <span className="text-xs text-gray-400">Un solo sabor</span>
          </button>
          <button
            onClick={() => {
              setShowPizzaOption(false)
              setShowHalfHalf(true)
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-red hover:bg-red-50 transition-all"
          >
            <span className="text-3xl">🍕½</span>
            <span className="font-semibold text-sm text-gray-700">Mitad y mitad</span>
            <span className="text-xs text-gray-400">Dos sabores</span>
          </button>
        </div>
      </Modal>

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

      {closingShift && (
        <CloseShiftModal
          shift={closingShift}
          open={true}
          onClose={() => setClosingShift(null)}
          onSave={() => { setClosingShift(null); refreshShift() }}
        />
      )}
    </div>
  )
}

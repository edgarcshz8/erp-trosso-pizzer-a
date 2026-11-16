import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import Modal from '../../../components/Modal'
import Badge from '../../../components/Badge'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { formatCLP, formatDate } from '../../../lib/format'
import LoadingSpinner from '../../../components/LoadingSpinner'

function PromoForm({ promo, products, onSave, onClose }) {
  const [form, setForm] = useState({
    name: promo?.name || '',
    type: promo?.type || 'percentage',
    value: promo?.value || '',
    applies_to: promo?.applies_to || 'all',
    product_id: promo?.product_id || '',
    start_date: promo?.start_date || '',
    end_date: promo?.end_date || '',
    active: promo?.active !== false,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.type) return toast.error('Nombre y tipo requeridos')
    setLoading(true)
    try {
      if (promo) {
        await api.put(`/promotions/${promo.id}`, form)
        toast.success('Promoción actualizada')
      } else {
        await api.post('/promotions', form)
        toast.success('Promoción creada')
      }
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={promo ? 'Editar promoción' : 'Nueva promoción'} size="sm"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Guardar'}</button></>}>
      <div className="space-y-3">
        <div><label className="label">Nombre *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: 20% descuento pizzas" /></div>
        <div><label className="label">Tipo</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="percentage">Porcentaje de descuento</option>
            <option value="discount">Descuento fijo</option>
            <option value="2x1">2x1</option>
          </select>
        </div>
        {form.type !== '2x1' && (
          <div><label className="label">{form.type === 'percentage' ? 'Porcentaje (%)' : 'Monto descuento'}</label>
            <input type="number" className="input" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} min="0" />
          </div>
        )}
        <div><label className="label">Aplica a</label>
          <select className="input" value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))}>
            <option value="all">Todos los productos</option>
            <option value="product">Producto específico</option>
          </select>
        </div>
        {form.applies_to === 'product' && (
          <div><label className="label">Producto</label>
            <select className="input" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Inicio</label><input type="date" className="input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
          <div><label className="label">Fin</label><input type="date" className="input" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-brand-red" />
          <span className="text-sm text-gray-700">Activa</span>
        </label>
      </div>
    </Modal>
  )
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, prodRes] = await Promise.all([api.get('/promotions'), api.get('/products?active=true')])
      setPromos(pRes.data)
      setProducts(prodRes.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar esta promoción?')) return
    await api.delete(`/promotions/${id}`).then(() => { toast.success('Promoción desactivada'); load() }).catch(() => toast.error('Error'))
  }

  const typeLabel = { percentage: 'Porcentaje', discount: 'Descuento fijo', '2x1': '2x1' }

  return (
    <Layout title="Promociones">
      <div className="flex justify-end mb-5">
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Nueva promoción
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vigencia</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-gray-800">{p.name}</div>
                    {p.product_name && <div className="text-xs text-gray-400">{p.product_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{typeLabel[p.type] || p.type}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-brand-red">
                    {p.type === 'percentage' ? `${p.value}%` : p.type === 'discount' ? formatCLP(p.value) : '2x1'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.start_date && p.end_date ? `${formatDate(p.start_date)} - ${formatDate(p.end_date)}` : 'Sin límite'}
                  </td>
                  <td className="px-4 py-3"><Badge variant={p.active ? 'success' : 'gray'}>{p.active ? 'Activa' : 'Inactiva'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditing(p); setShowForm(true) }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {promos.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No hay promociones</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <PromoForm promo={editing} products={products} onSave={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
    </Layout>
  )
}

import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import { formatCLP } from '../../../lib/format'
import toast from 'react-hot-toast'
import Modal from '../../../components/Modal'
import Badge from '../../../components/Badge'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../../../components/LoadingSpinner'
import EmptyState from '../../../components/EmptyState'

function ProductForm({ product, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    price: product?.price || '',
    type: product?.type || 'elaborado',
    indirect_cost: product?.indirect_cost || '0',
    stock: product?.stock ?? '',
    is_pizza: product?.is_pizza || false,
    active: product?.active !== false,
  })
  const [imageFile, setImageFile] = useState(null)
  const [sizes, setSizes] = useState(product?.sizes || [])
  const [loading, setLoading] = useState(false)

  const addSize = () => setSizes(prev => [...prev, { name: '', price: '' }])
  const removeSize = (i) => setSizes(prev => prev.filter((_, idx) => idx !== i))
  const updateSize = (i, field, val) => setSizes(prev => {
    const next = [...prev]
    next[i] = { ...next[i], [field]: val }
    return next
  })

  const handleSubmit = async () => {
    if (!form.name || !form.type) return toast.error('Nombre y tipo requeridos')
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      fd.append('sizes', JSON.stringify(sizes.filter(s => s.name && s.price)))
      if (imageFile) fd.append('image', imageFile)

      if (product) {
        await api.put(`/products/${product.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Producto actualizado')
      } else {
        await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('Producto creado')
      }
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nombre del producto *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Pizza Margarita" />
        </div>
        <div className="col-span-2">
          <label className="label">Descripción</label>
          <textarea
            className="input resize-none"
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ej: Salsa de tomate, mozzarella, albahaca fresca"
          />
        </div>
        <div>
          <label className="label">Categoría</label>
          <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
            <option value="">Sin categoría</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tipo *</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="elaborado">Elaborado</option>
            <option value="reventa">Reventa</option>
          </select>
        </div>
        <div>
          <label className="label">Precio</label>
          <input type="number" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min="0" />
        </div>
        <div>
          <label className="label">Costo indirecto</label>
          <input type="number" className="input" value={form.indirect_cost} onChange={e => setForm(f => ({ ...f, indirect_cost: e.target.value }))} min="0" />
        </div>
        {form.type === 'reventa' && (
          <div>
            <label className="label">Stock actual</label>
            <input type="number" className="input" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} min="0" step="1" />
          </div>
        )}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_pizza} onChange={e => setForm(f => ({ ...f, is_pizza: e.target.checked }))} className="w-4 h-4 accent-brand-red" />
            <div>
              <span className="text-sm text-gray-700">Es pizza</span>
              <p className="text-xs text-gray-400">Habilita venta entera o mitad y mitad en el POS</p>
            </div>
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-brand-red" />
            <span className="text-sm text-gray-700">Activo</span>
          </label>
        </div>
        <div className="col-span-2">
          <label className="label">Imagen del producto</label>
          {product?.image_url && !imageFile && (
            <img src={product.image_url} alt="" className="w-20 h-20 object-cover rounded-xl mb-2" />
          )}
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-200 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50" />
        </div>
      </div>

      {/* Sizes */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-700">Tamaños (opcional)</div>
          <button onClick={addSize} className="text-xs text-brand-red hover:underline">+ Agregar tamaño</button>
        </div>
        {sizes.map((size, i) => (
          <div key={i} className="flex gap-2 mb-2 items-center">
            <input placeholder="Ej: Mediana" className="input flex-1" value={size.name} onChange={e => updateSize(i, 'name', e.target.value)} />
            <input placeholder="Precio" type="number" className="input w-28" value={size.price} onChange={e => updateSize(i, 'price', e.target.value)} />
            <button onClick={() => removeSize(i)} className="text-red-400 hover:text-red-600 p-1">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([api.get('/products'), api.get('/categories')])
      setProducts(pRes.data)
      setCategories(cRes.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este producto?')) return
    try {
      await api.delete(`/products/${id}`)
      toast.success('Producto desactivado')
      load()
    } catch {
      toast.error('Error al desactivar')
    }
  }

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || p.category_id === parseInt(catFilter)
    return matchSearch && matchCat
  })

  return (
    <Layout title="Productos">
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="input w-56" />
        <select className="input w-40" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="ml-auto">
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Nuevo producto
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner text="Cargando productos..." /> : filtered.length === 0 ? (
        <EmptyState icon="📦" title="No hay productos" description="Crea tu primer producto" />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">🍕</div>
                        )}
                        <div>
                          <div className="font-medium text-sm text-gray-800">{p.name}</div>
                          {p.is_pizza && <div className="text-xs text-gray-400">Pizza · entera o mitad/mitad</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.category_name || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.type === 'elaborado' ? 'info' : 'gray'}>{p.type}</Badge>
                      {p.type === 'reventa' && (
                        <span className={`ml-2 text-xs font-medium ${parseFloat(p.stock) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          Stock: {parseFloat(p.stock ?? 0)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-sm">{formatCLP(p.price)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.active ? 'success' : 'gray'}>{p.active ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditing(p); setShowForm(true) }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-500">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          categories={categories}
          onSave={() => { setShowForm(false); load() }}
          onClose={() => setShowForm(false)}
        />
      )}
    </Layout>
  )
}

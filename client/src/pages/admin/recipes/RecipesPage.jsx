import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import Modal from '../../../components/Modal'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../../../components/LoadingSpinner'

function RecipeEditor({ product, onSave, onClose }) {
  const [recipes, setRecipes] = useState([])
  const [supplies, setSupplies] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/recipes/${product.id}`),
      api.get('/supplies?active=true')
    ]).then(([rRes, sRes]) => {
      setRecipes(rRes.data.map(r => ({ ...r, _id: r.id })))
      setSupplies(sRes.data)
    }).catch(() => {})
  }, [product.id])

  const addLine = () => setRecipes(prev => [...prev, { _id: Date.now(), supply_id: '', quantity: '', size_id: null }])
  const removeLine = (idx) => setRecipes(prev => prev.filter((_, i) => i !== idx))
  const updateLine = (idx, field, val) => setRecipes(prev => {
    const next = [...prev]
    next[idx] = { ...next[idx], [field]: val }
    return next
  })

  const handleSave = async () => {
    const valid = recipes.filter(r => r.supply_id && r.quantity)
    setLoading(true)
    try {
      await api.post(`/recipes/bulk/${product.id}`, {
        recipes: valid.map(r => ({
          supply_id: parseInt(r.supply_id),
          quantity: parseFloat(r.quantity),
          size_id: r.size_id ? parseInt(r.size_id) : null
        }))
      })
      toast.success('Receta guardada')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar receta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Receta: ${product.name}`} size="lg"
      footer={<><button onClick={onClose} className="btn-ghost">Cerrar</button><button onClick={handleSave} disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Guardar receta'}</button></>}>
      <div className="mb-4 flex justify-end">
        <button onClick={addLine} className="btn-secondary text-sm">
          <PlusIcon className="w-4 h-4" /> Agregar ingrediente
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No hay ingredientes. Haz clic en "Agregar ingrediente".
        </div>
      ) : (
        <div className="space-y-2">
          {recipes.map((r, idx) => {
            const supply = supplies.find(s => s.id === parseInt(r.supply_id))
            return (
              <div key={r._id} className="flex gap-3 items-center bg-gray-50 rounded-xl p-3">
                <div className="flex-1">
                  <label className="label">Insumo</label>
                  <select className="input" value={r.supply_id} onChange={e => updateLine(idx, 'supply_id', e.target.value)}>
                    <option value="">Seleccionar insumo...</option>
                    {supplies.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                  </select>
                </div>
                <div className="w-36">
                  <label className="label">Cantidad {supply ? `(${supply.unit})` : ''}</label>
                  <input type="number" className="input" value={r.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} min="0.0001" step="0.0001" placeholder="0" />
                </div>
                <button onClick={() => removeLine(idx)} className="mt-5 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

export default function RecipesPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/products?active=true')
      setProducts(r.data.filter(p => p.type === 'elaborado'))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout title="Recetas">
      <div className="mb-5">
        <input type="text" placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} className="input w-56" />
      </div>
      {loading ? <LoadingSpinner text="Cargando recetas..." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="card hover:border-brand-red/30 transition-colors cursor-pointer" onClick={() => setEditing(p)}>
              <div className="flex items-center gap-3 mb-3">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🍕</div>
                )}
                <div>
                  <div className="font-semibold text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.category_name || 'Sin categoría'}</div>
                </div>
              </div>
              <button className="text-sm text-brand-red hover:underline font-medium">Editar receta →</button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-400">No hay productos elaborados</div>
          )}
        </div>
      )}

      {editing && <RecipeEditor product={editing} onSave={() => { setEditing(null); load() }} onClose={() => setEditing(null)} />}
    </Layout>
  )
}

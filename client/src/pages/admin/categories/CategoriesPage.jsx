import React, { useState, useEffect, useRef } from 'react'
import Layout from '../../../components/Layout'
import Modal from '../../../components/Modal'
import LoadingSpinner from '../../../components/LoadingSpinner'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import { PlusIcon, PencilIcon, TrashIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline'

const EMOJI_OPTIONS = [
  '🍕','🍔','🌭','🌮','🌯','🥗','🍱','🥟','🍜','🍝',
  '🥘','🍲','🍛','🍣','🍤','🥐','🥖','🧁','🍰','🎂',
  '🍩','🍪','🍫','🍬','🧇','🥞','🍳','🥚','🥓','🥩',
  '🧆','🫔','🍿','🧀','🥜','🍡','🍧','🍨','🍦','🧃',
  '🥤','🧋','☕','🍵','🍺','🍷','🥛','💧','🧉','🍹',
  '🛒','📦','🎁','⭐','🔥','✨','🏆','💎','🎯','🍽️',
]

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-10 rounded-xl border-2 border-gray-200 hover:border-brand-red flex items-center justify-center text-2xl transition-colors"
      >
        {value || <span className="text-gray-300 text-base">+</span>}
      </button>
      {open && (
        <div className="absolute top-12 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 w-64">
          <div className="grid grid-cols-10 gap-0.5">
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => { onChange(e); setOpen(false) }}
                className={`text-xl p-1 rounded-lg hover:bg-gray-100 transition-colors leading-none
                  ${value === e ? 'bg-red-50 ring-2 ring-brand-red' : ''}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryForm({ category, onSave, onClose }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    emoji: category?.emoji || '',
    sort_order: category?.sort_order ?? '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        emoji: form.emoji.trim(),
        sort_order: form.sort_order === '' ? 0 : parseInt(form.sort_order),
      }
      if (category) {
        await api.put(`/categories/${category.id}`, payload)
        toast.success('Categoría actualizada')
      } else {
        await api.post('/categories', payload)
        toast.success('Categoría creada')
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
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="w-16 flex-shrink-0">
            <label className="label">Emoji</label>
            <EmojiPicker
              value={form.emoji}
              onChange={v => setForm(f => ({ ...f, emoji: v }))}
            />
          </div>
          <div className="flex-1">
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Pizzas, Bebestibles, Postres"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>
        <div>
          <label className="label">Orden de aparición</label>
          <input
            type="number"
            className="input"
            value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
            placeholder="0"
            min="0"
          />
          <p className="text-xs text-gray-400 mt-1">
            Número menor aparece primero en el POS. Deja en 0 si no importa el orden.
          </p>
        </div>
      </div>
    </Modal>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/categories')
      setCategories(r.data)
    } catch {
      toast.error('Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (cat) => {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?\nLos productos asignados quedarán sin categoría.`)) return
    try {
      await api.delete(`/categories/${cat.id}`)
      toast.success('Categoría eliminada')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (cat) => { setEditing(cat); setShowForm(true) }
  const handleSaved = () => { setShowForm(false); load() }

  return (
    <Layout title="Categorías">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-gray-500">
          Organiza los productos del POS por categorías. El orden controla cómo aparecen en la pantalla de venta.
        </p>
        <button onClick={openNew} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Nueva categoría
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                  Orden
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat, idx) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center flex-shrink-0 text-lg">
                        {cat.emoji || <Bars3BottomLeftIcon className="w-4 h-4 text-brand-red" />}
                      </div>
                      <span className="font-medium text-sm text-gray-800">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {cat.sort_order}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400 text-sm">
                    No hay categorías. Crea una para organizar los productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CategoryForm
          category={editing}
          onSave={handleSaved}
          onClose={() => setShowForm(false)}
        />
      )}
    </Layout>
  )
}

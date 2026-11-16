import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import Modal from '../../../components/Modal'
import Badge from '../../../components/Badge'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { formatCLP } from '../../../lib/format'
import LoadingSpinner from '../../../components/LoadingSpinner'

function ExtraForm({ extra, onSave, onClose }) {
  const [form, setForm] = useState({
    name: extra?.name || '',
    price: extra?.price || '',
    price_type: extra?.price_type || 'fixed',
    active: extra?.active !== false,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name) return toast.error('Nombre requerido')
    setLoading(true)
    try {
      if (extra) {
        await api.put(`/extras/${extra.id}`, form)
        toast.success('Extra actualizado')
      } else {
        await api.post('/extras', form)
        toast.success('Extra creado')
      }
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={extra ? 'Editar extra' : 'Nuevo extra'} size="sm"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Guardar'}</button></>}>
      <div className="space-y-3">
        <div><label className="label">Nombre del ingrediente *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Mozzarella extra" /></div>
        <div><label className="label">Precio</label><input type="number" className="input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min="0" /></div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-brand-red" />
          <span className="text-sm text-gray-700">Activo</span>
        </label>
      </div>
    </Modal>
  )
}

export default function ExtrasPage() {
  const [extras, setExtras] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/extras')
      setExtras(r.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este extra?')) return
    await api.delete(`/extras/${id}`).then(() => { toast.success('Extra desactivado'); load() }).catch(() => toast.error('Error'))
  }

  return (
    <Layout title="Extras Pizza">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-gray-500">Ingredientes adicionales disponibles en el POS para pizzas</p>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Nuevo extra
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ingrediente</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Precio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {extras.map(e => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-sm text-gray-800">{e.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-sm text-brand-red">{formatCLP(e.price)}</td>
                  <td className="px-4 py-3"><Badge variant={e.active ? 'success' : 'gray'}>{e.active ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditing(e); setShowForm(true) }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(e.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {extras.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-400">No hay extras registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <ExtraForm extra={editing} onSave={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
    </Layout>
  )
}

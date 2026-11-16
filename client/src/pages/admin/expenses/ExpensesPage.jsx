import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import Modal from '../../../components/Modal'
import { formatCLP, formatDate } from '../../../lib/format'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../../../components/LoadingSpinner'

const CATEGORIES = ['Arriendo', 'Servicios', 'Insumos', 'Personal', 'Marketing', 'Transporte', 'Mantenimiento', 'Otros']

function ExpenseForm({ expense, onSave, onClose }) {
  const [form, setForm] = useState({
    category: expense?.category || 'Otros',
    description: expense?.description || '',
    amount: expense?.amount || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.category || !form.amount || !form.date) return toast.error('Todos los campos requeridos')
    setLoading(true)
    try {
      if (expense) {
        await api.put(`/expenses/${expense.id}`, form)
        toast.success('Gasto actualizado')
      } else {
        await api.post('/expenses', form)
        toast.success('Gasto registrado')
      }
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={expense ? 'Editar gasto' : 'Nuevo gasto'} size="sm"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Guardar'}</button></>}>
      <div className="space-y-3">
        <div><label className="label">Categoría</label>
          <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="label">Descripción</label><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalle del gasto..." /></div>
        <div><label className="label">Monto *</label><input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="0" /></div>
        <div><label className="label">Fecha *</label><input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
      </div>
    </Modal>
  )
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/expenses?month=${month}&year=${year}`)
      setExpenses(r.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [month, year])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await api.delete(`/expenses/${id}`).then(() => { toast.success('Eliminado'); load() }).catch(() => toast.error('Error'))
  }

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <Layout title="Gastos">
      <div className="flex flex-wrap gap-3 items-center mb-5">
        <select className="input w-36" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
          {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className="input w-24" value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="ml-auto">
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Nuevo gasto
          </button>
        </div>
      </div>

      <div className="card mb-5 py-3">
        <div className="text-sm text-gray-500">Total {months[month-1]} {year}</div>
        <div className="text-2xl font-bold text-brand-red">{formatCLP(total)}</div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Descripción</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Monto</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(e.date)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{e.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.description || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-sm">{formatCLP(e.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditing(e); setShowForm(true) }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(e.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No hay gastos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <ExpenseForm expense={editing} onSave={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
    </Layout>
  )
}

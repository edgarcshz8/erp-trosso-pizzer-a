import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import { formatCLP } from '../../../lib/format'
import toast from 'react-hot-toast'
import Modal from '../../../components/Modal'
import Badge from '../../../components/Badge'
import { PlusIcon, PencilIcon, ArrowUpIcon, AdjustmentsHorizontalIcon, ClockIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../../../components/LoadingSpinner'

function SupplyForm({ supply, onSave, onClose }) {
  const [form, setForm] = useState({
    name: supply?.name || '',
    unit: supply?.unit || 'g',
    stock: supply?.stock || '0',
    min_stock: supply?.min_stock || '0',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name) return toast.error('Nombre requerido')
    setLoading(true)
    try {
      if (supply) {
        await api.put(`/supplies/${supply.id}`, form)
        toast.success('Insumo actualizado')
      } else {
        await api.post('/supplies', form)
        toast.success('Insumo creado')
      }
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={supply ? 'Editar insumo' : 'Nuevo insumo'} size="sm"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Guardar'}</button></>}>
      <div className="space-y-3">
        <div><label className="label">Nombre *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Harina 000" /></div>
        <div><label className="label">Unidad</label>
          <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
            <option value="g">Gramos (g)</option>
            <option value="ml">Mililitros (ml)</option>
            <option value="unidad">Unidad</option>
          </select>
        </div>
        <div><label className="label">Stock inicial</label><input type="number" className="input" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} min="0" /></div>
        <div><label className="label">Stock mínimo (alerta)</label><input type="number" className="input" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} min="0" /></div>
      </div>
    </Modal>
  )
}

function PurchaseModal({ supply, onSave, onClose }) {
  const [form, setForm] = useState({ quantity: '', unit_cost: '', reason: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.quantity) return toast.error('Cantidad requerida')
    setLoading(true)
    try {
      await api.post(`/supplies/${supply.id}/purchase`, form)
      toast.success('Compra registrada')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Registrar compra: ${supply.name}`} size="sm"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Registrar'}</button></>}>
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-xl p-3 text-sm">
          <div className="text-gray-500">Stock actual: <span className="font-bold text-gray-800">{parseFloat(supply.stock).toFixed(2)} {supply.unit}</span></div>
          <div className="text-gray-500">Costo promedio: <span className="font-bold text-gray-800">{formatCLP(supply.avg_cost)}/{supply.unit}</span></div>
        </div>
        <div><label className="label">Cantidad a ingresar ({supply.unit}) *</label><input type="number" className="input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min="0.001" step="0.001" /></div>
        <div><label className="label">Costo unitario ({formatCLP(0)})</label><input type="number" className="input" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} min="0" /></div>
        <div><label className="label">Notas (opcional)</label><input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Proveedor, factura..." /></div>
      </div>
    </Modal>
  )
}

function AdjustModal({ supply, onSave, onClose }) {
  const [form, setForm] = useState({ quantity: '', type: 'merma', reason: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.quantity) return toast.error('Cantidad requerida')
    setLoading(true)
    try {
      const qty = form.type === 'merma' ? -Math.abs(parseFloat(form.quantity)) : parseFloat(form.quantity)
      await api.post(`/supplies/${supply.id}/adjust`, { ...form, quantity: qty })
      toast.success('Ajuste registrado')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Ajustar stock: ${supply.name}`} size="sm"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Registrar'}</button></>}>
      <div className="space-y-3">
        <div><label className="label">Tipo de ajuste</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="merma">Merma (reduce stock)</option>
            <option value="ajuste">Ajuste manual</option>
          </select>
        </div>
        <div><label className="label">Cantidad ({supply.unit})</label><input type="number" className="input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min="0.001" step="0.001" /></div>
        <div><label className="label">Motivo</label><input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Descripción..." /></div>
      </div>
    </Modal>
  )
}

function MovementsDrawer({ supply, onClose }) {
  const [movements, setMovements] = useState([])

  useEffect(() => {
    api.get(`/supplies/${supply.id}/movements?limit=50`).then(r => setMovements(r.data)).catch(() => {})
  }, [supply.id])

  return (
    <Modal open={true} onClose={onClose} title={`Movimientos: ${supply.name}`} size="lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200"><th className="text-left pb-2 text-xs text-gray-400">Fecha</th><th className="text-left pb-2 text-xs text-gray-400">Tipo</th><th className="text-right pb-2 text-xs text-gray-400">Cantidad</th><th className="text-left pb-2 text-xs text-gray-400">Notas</th></tr></thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-500">{new Date(m.created_at).toLocaleString('es-CL')}</td>
                <td className="py-2"><Badge variant={m.type === 'compra' ? 'success' : m.type === 'venta' ? 'info' : 'warning'}>{m.type}</Badge></td>
                <td className={`py-2 text-right font-mono font-semibold ${parseFloat(m.quantity) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {parseFloat(m.quantity) >= 0 ? '+' : ''}{parseFloat(m.quantity).toFixed(3)} {supply.unit}
                </td>
                <td className="py-2 text-gray-400 text-xs">{m.reason || '-'}</td>
              </tr>
            ))}
            {movements.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-400">Sin movimientos</td></tr>}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

export default function InventoryPage() {
  const [supplies, setSupplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [purchasing, setPurchasing] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [viewingMovements, setViewingMovements] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filterLow, setFilterLow] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/supplies?active=true')
      setSupplies(r.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = supplies.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
    const matchLow = !filterLow || s.low_stock
    return matchSearch && matchLow
  })

  const lowStockCount = supplies.filter(s => s.low_stock).length

  return (
    <Layout title="Inventario">
      {lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-amber-700">{lowStockCount} insumo(s) con stock bajo</span>
          <button onClick={() => setFilterLow(f => !f)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filterLow ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
            {filterLow ? 'Ver todos' : 'Ver solo bajos'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center mb-5">
        <input type="text" placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} className="input w-56" />
        <div className="ml-auto">
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Nuevo insumo
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner text="Cargando inventario..." /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Insumo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Unidad</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Mínimo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Costo Prom</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 ${s.low_stock ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.low_stock && <span className="text-amber-500">⚠</span>}
                      <span className="font-medium text-sm text-gray-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.unit}</td>
                  <td className={`px-4 py-3 text-right font-semibold text-sm ${s.low_stock ? 'text-amber-600' : 'text-gray-800'}`}>
                    {parseFloat(s.stock).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400">{parseFloat(s.min_stock).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCLP(s.avg_cost)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">{formatCLP(parseFloat(s.stock) * parseFloat(s.avg_cost))}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setPurchasing(s)} title="Registrar compra" className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors">
                        <ArrowUpIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setAdjusting(s)} title="Ajustar/merma" className="p-1.5 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded-lg transition-colors">
                        <AdjustmentsHorizontalIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setViewingMovements(s)} title="Ver movimientos" className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                        <ClockIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setEditing(s); setShowForm(true) }} title="Editar" className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No hay insumos</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <SupplyForm supply={editing} onSave={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
      {purchasing && <PurchaseModal supply={purchasing} onSave={() => { setPurchasing(null); load() }} onClose={() => setPurchasing(null)} />}
      {adjusting && <AdjustModal supply={adjusting} onSave={() => { setAdjusting(null); load() }} onClose={() => setAdjusting(null)} />}
      {viewingMovements && <MovementsDrawer supply={viewingMovements} onClose={() => setViewingMovements(null)} />}
    </Layout>
  )
}

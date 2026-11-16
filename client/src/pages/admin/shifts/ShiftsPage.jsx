import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import { useShift } from '../../../context/ShiftContext'
import toast from 'react-hot-toast'
import Modal from '../../../components/Modal'
import Badge from '../../../components/Badge'
import { formatCLP, formatDateTime } from '../../../lib/format'
import LoadingSpinner from '../../../components/LoadingSpinner'

function OpenShiftModal({ open, onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post('/shifts/open', { opening_amount: parseFloat(amount) || 0 })
      toast.success('Turno abierto')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al abrir turno')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Abrir turno de caja" size="sm"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Abriendo...' : 'Abrir turno'}</button></>}>
      <div>
        <label className="label">Fondo inicial de caja</label>
        <input type="number" className="input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" />
        <p className="text-xs text-gray-400 mt-2">Ingresa el monto con el que abres la caja.</p>
      </div>
    </Modal>
  )
}

function CloseShiftModal({ shift, open, onClose, onSave }) {
  const [form, setForm] = useState({ counted_cash: '', counted_transfer: '', counted_card: '', counted_junaeb: '', notes: '' })
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && shift) {
      api.get(`/shifts/${shift.id}`).then(r => setDetail(r.data)).catch(() => {})
    }
  }, [open, shift?.id])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post(`/shifts/${shift.id}/close`, form)
      toast.success('Turno cerrado')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cerrar turno')
    } finally {
      setLoading(false)
    }
  }

  const totals = detail?.totals || {}

  return (
    <Modal open={open} onClose={onClose} title="Cerrar turno - Arqueo de caja" size="md"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-danger">{loading ? 'Cerrando...' : 'Cerrar turno'}</button></>}>
      {detail && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1 text-sm">
          <div className="font-semibold text-gray-700 mb-2">Totales del sistema</div>
          <div className="flex justify-between"><span className="text-gray-500">Total ventas:</span><span className="font-semibold">{formatCLP(totals.total_sales || 0)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Efectivo esperado:</span><span className="font-semibold">{formatCLP(totals.expected_cash || 0)}</span></div>
          {Object.entries(totals.by_method || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between text-gray-400">
              <span className="capitalize">{k}:</span>
              <span>{formatCLP(v)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3">
        <div className="font-semibold text-sm text-gray-700 mb-1">Conteo físico</div>
        <div><label className="label">Efectivo contado</label><input type="number" className="input" value={form.counted_cash} onChange={e => setForm(f => ({ ...f, counted_cash: e.target.value }))} min="0" /></div>
        <div><label className="label">Transferencias</label><input type="number" className="input" value={form.counted_transfer} onChange={e => setForm(f => ({ ...f, counted_transfer: e.target.value }))} min="0" /></div>
        <div><label className="label">Tarjeta</label><input type="number" className="input" value={form.counted_card} onChange={e => setForm(f => ({ ...f, counted_card: e.target.value }))} min="0" /></div>
        <div><label className="label">Junaeb</label><input type="number" className="input" value={form.counted_junaeb} onChange={e => setForm(f => ({ ...f, counted_junaeb: e.target.value }))} min="0" /></div>
        <div><label className="label">Notas</label><textarea className="input min-h-[80px]" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones del turno..." /></div>
      </div>
    </Modal>
  )
}

function MovementModal({ shift, open, onClose, onSave }) {
  const [form, setForm] = useState({ type: 'ingreso', amount: '', reason: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.amount) return toast.error('Monto requerido')
    setLoading(true)
    try {
      await api.post(`/shifts/${shift.id}/movements`, form)
      toast.success(form.type === 'ingreso' ? 'Ingreso registrado' : 'Retiro registrado')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Movimiento de caja" size="sm"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Registrar'}</button></>}>
      <div className="space-y-3">
        <div><label className="label">Tipo</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="ingreso">Ingreso</option>
            <option value="retiro">Retiro</option>
          </select>
        </div>
        <div><label className="label">Monto</label><input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="0" /></div>
        <div><label className="label">Motivo</label><input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Descripción..." /></div>
      </div>
    </Modal>
  )
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const { currentShift, refresh } = useShift()
  const [showOpen, setShowOpen] = useState(false)
  const [closingShift, setClosingShift] = useState(null)
  const [movementShift, setMovementShift] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/shifts')
      setShifts(r.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <Layout title="Turnos de caja">
      <div className="flex flex-wrap gap-3 items-center mb-6">
        {!currentShift ? (
          <button onClick={() => setShowOpen(true)} className="btn-primary">Abrir turno</button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => setMovementShift(currentShift)} className="btn-secondary">Ingreso / Retiro</button>
            <button onClick={() => setClosingShift(currentShift)} className="btn-danger">Cerrar turno</button>
          </div>
        )}
      </div>

      {currentShift && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
          <div className="font-semibold text-emerald-800">Turno activo</div>
          <div className="text-sm text-emerald-600 mt-1">
            Abierto: {formatDateTime(currentShift.opened_at)} | Fondo: {formatCLP(currentShift.opening_amount)}
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Apertura</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cajero</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Fondo</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Ventas</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(s.opened_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.user_name}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">{formatCLP(s.opening_amount)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-brand-red">{formatCLP(s.total_sales)}</td>
                  <td className="px-4 py-3"><Badge variant={s.status === 'open' ? 'success' : 'gray'}>{s.status === 'open' ? 'Abierto' : 'Cerrado'}</Badge></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedShift(s)} className="text-xs text-brand-red hover:underline">Ver detalle</button>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">No hay turnos</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <OpenShiftModal open={showOpen} onClose={() => setShowOpen(false)} onSave={() => { setShowOpen(false); load(); refresh() }} />
      {closingShift && <CloseShiftModal shift={closingShift} open={true} onClose={() => setClosingShift(null)} onSave={() => { setClosingShift(null); load(); refresh() }} />}
      {movementShift && <MovementModal shift={movementShift} open={true} onClose={() => setMovementShift(null)} onSave={() => { setMovementShift(null); load() }} />}

      {selectedShift && (
        <ShiftDetailModal shift={selectedShift} onClose={() => setSelectedShift(null)} />
      )}
    </Layout>
  )
}

function ShiftDetailModal({ shift, onClose }) {
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    api.get(`/shifts/${shift.id}`).then(r => setDetail(r.data)).catch(() => {})
  }, [shift.id])

  return (
    <Modal open={true} onClose={onClose} title={`Turno #${shift.id} - Detalle`} size="xl">
      {!detail ? <LoadingSpinner /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">Total ventas</div>
              <div className="font-bold text-lg text-brand-red">{formatCLP(detail.totals.total_sales)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">Efectivo esperado</div>
              <div className="font-bold text-lg">{formatCLP(detail.totals.expected_cash)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">Ingresos</div>
              <div className="font-bold text-lg text-emerald-600">{formatCLP(detail.totals.ingresos)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400">Retiros</div>
              <div className="font-bold text-lg text-red-500">{formatCLP(detail.totals.retiros)}</div>
            </div>
          </div>

          {detail.movements.length > 0 && (
            <div>
              <div className="font-semibold text-sm text-gray-700 mb-2">Movimientos de caja</div>
              <div className="space-y-1">
                {detail.movements.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                    <div>
                      <Badge variant={m.type === 'ingreso' ? 'success' : 'error'}>{m.type}</Badge>
                      <span className="ml-2 text-gray-500">{m.reason || '-'}</span>
                    </div>
                    <span className={`font-semibold ${m.type === 'ingreso' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {m.type === 'ingreso' ? '+' : '-'}{formatCLP(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="font-semibold text-sm text-gray-700 mb-2">Ventas del turno ({detail.sales.length})</div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200"><th className="text-left pb-2 text-xs text-gray-400">Hora</th><th className="text-left pb-2 text-xs text-gray-400">Método</th><th className="text-right pb-2 text-xs text-gray-400">Total</th></tr></thead>
                <tbody>
                  {detail.sales.map(s => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">{new Date(s.created_at).toLocaleTimeString('es-CL')}</td>
                      <td className="py-1.5 text-gray-500 capitalize">{s.payment_method || '-'}</td>
                      <td className="py-1.5 text-right font-medium">{formatCLP(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

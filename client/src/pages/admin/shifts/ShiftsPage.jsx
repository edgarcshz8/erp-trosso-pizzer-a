import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import { useShift } from '../../../context/ShiftContext'
import toast from 'react-hot-toast'
import Modal from '../../../components/Modal'
import Badge from '../../../components/Badge'
import CloseShiftModal from '../../../components/CloseShiftModal'
import { formatCLP, formatDateTime } from '../../../lib/format'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { ExclamationTriangleIcon, CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline'

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
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Caja inicial</th>
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

  const load = () => api.get(`/shifts/${shift.id}`).then(r => setDetail(r.data)).catch(() => {})

  useEffect(() => { load() }, [shift.id])

  const handleDeleteSale = async (saleId) => {
    if (!confirm('¿Eliminar esta venta? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/sales/${saleId}`)
      toast.success('Venta eliminada')
      load()
    } catch {
      toast.error('Error al eliminar venta')
    }
  }

  const reconciliation = detail ? [
    { label: 'Efectivo',      expected: detail.totals.expected_cash || 0,                        counted: detail.shift.counted_cash },
    { label: 'Transferencia', expected: detail.totals.by_method?.transferencia || 0,             counted: detail.shift.counted_transfer },
    { label: 'Tarjeta',       expected: detail.totals.by_method?.tarjeta || 0,                   counted: detail.shift.counted_card },
    { label: 'Junaeb',        expected: detail.totals.by_method?.junaeb || 0,                    counted: detail.shift.counted_junaeb },
  ] : []

  const isClosed = detail?.shift?.status === 'closed'
  const hasDiscrepancy = isClosed && reconciliation.some(r =>
    Math.round(Math.abs(parseFloat(r.counted ?? 0) - parseFloat(r.expected))) > 0
  )

  return (
    <Modal open={true} onClose={onClose} title={`Turno #${shift.id} - Detalle`} size="xl">
      {!detail ? <LoadingSpinner /> : (
        <div className="space-y-5">

          {/* Discrepancy alert */}
          {isClosed && hasDiscrepancy && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Discrepancia en el arqueo de caja</div>
                <div className="text-xs mt-0.5 text-red-500">Los montos contados no coinciden con los montos esperados del sistema.</div>
              </div>
            </div>
          )}
          {isClosed && !hasDiscrepancy && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-700">
              <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
              <div className="font-semibold text-sm">Arqueo de caja sin discrepancias</div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-0.5">Apertura</div>
              <div className="font-semibold text-sm text-gray-700">{formatDateTime(detail.shift.opened_at)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-0.5">Cierre</div>
              <div className="font-semibold text-sm text-gray-700">
                {detail.shift.closed_at ? formatDateTime(detail.shift.closed_at) : <span className="text-emerald-600">Turno abierto</span>}
              </div>
            </div>
          </div>

          {/* Summary stats */}
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

          {/* Reconciliation table (closed shifts only) */}
          {isClosed && (
            <div>
              <div className="font-semibold text-sm text-gray-700 mb-2">Arqueo de caja</div>
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Método</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Esperado</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Contado</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliation.map(r => {
                      const diff = parseFloat(r.counted ?? 0) - parseFloat(r.expected)
                      return (
                        <tr key={r.label} className="border-t border-gray-100">
                          <td className="px-4 py-2.5 font-medium text-gray-700">{r.label}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{formatCLP(r.expected)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">{formatCLP(r.counted ?? 0)}</td>
                          <td className={`px-4 py-2.5 text-right font-semibold
                            ${Math.round(Math.abs(diff)) === 0 ? 'text-gray-400' : diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {Math.round(Math.abs(diff)) === 0 ? '—' : `${diff > 0 ? '+' : ''}${formatCLP(diff)}`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {detail.shift.notes && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3">
                  <div className="text-xs font-semibold text-gray-500 mb-1">Notas del cierre</div>
                  <div className="text-sm text-gray-700">{detail.shift.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Cash movements */}
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

          {/* Items summary */}
          {detail.items_summary?.length > 0 && (
            <div>
              <div className="font-semibold text-sm text-gray-700 mb-2">Venta por producto</div>
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Cant.</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  </tr></thead>
                  <tbody>
                    {detail.items_summary.map((item, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{parseInt(item.qty_sold)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-brand-red">{formatCLP(item.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales list */}
          <div>
            <div className="font-semibold text-sm text-gray-700 mb-2">Ventas del turno ({detail.sales.length})</div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200">
                  <th className="text-left pb-2 text-xs text-gray-400">Hora</th>
                  <th className="text-left pb-2 text-xs text-gray-400">Método</th>
                  <th className="text-right pb-2 text-xs text-gray-400">Total</th>
                  <th className="pb-2"></th>
                </tr></thead>
                <tbody>
                  {detail.sales.map(s => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500">{new Date(s.created_at).toLocaleTimeString('es-CL')}</td>
                      <td className="py-1.5 text-gray-500 capitalize">{s.payment_method || '-'}</td>
                      <td className="py-1.5 text-right font-medium">{formatCLP(s.total)}</td>
                      <td className="py-1.5 text-right">
                        <button onClick={() => handleDeleteSale(s.id)} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500 transition-colors">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </td>
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

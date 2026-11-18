import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import { formatCLP } from '../../../lib/format'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import LoadingSpinner from '../../../components/LoadingSpinner'

const TABS = ['Ventas', 'Costos', 'Pérdidas y Ganancias']
const COLORS = ['#E30613', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

function SalesReport({ dateFrom, dateTo }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)
    api.get(`/reports/sales?${params}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [dateFrom, dateTo])

  if (loading) return <LoadingSpinner />
  if (!data) return <div className="text-gray-400 text-center py-8">Error al cargar datos</div>

  const { summary, top_products, daily } = data
  const dailyData = daily?.map(d => ({
    date: new Date(d.date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
    total: parseFloat(d.total),
    count: parseInt(d.count)
  })) || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total ventas', value: formatCLP(summary.total_revenue), color: 'text-brand-red' },
          { label: 'Transacciones', value: summary.sale_count, color: 'text-gray-800' },
          { label: 'Descuentos', value: formatCLP(summary.total_discount), color: 'text-amber-600' },
          { label: 'Ticket promedio', value: summary.sale_count > 0 ? formatCLP(summary.total_revenue / summary.sale_count) : '$0', color: 'text-blue-600' },
        ].map(k => (
          <div key={k.label} className="card">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Venta al paso', value: summary.paso || 0, count: summary.paso_count || 0, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Venta delivery', value: summary.delivery || 0, count: summary.delivery_count || 0, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map(ch => {
          const pct = summary.total_revenue > 0 ? (ch.value / summary.total_revenue * 100).toFixed(0) : 0
          return (
            <div key={ch.label} className={`card border-2 ${ch.border} ${ch.bg}`}>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{ch.label}</div>
              <div className={`text-2xl font-bold ${ch.color}`}>{formatCLP(ch.value)}</div>
              <div className="text-xs text-gray-400 mt-1">{ch.count} transacciones · {pct}% del total</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="font-semibold text-sm text-gray-700 mb-4">Por método de pago</div>
          <div className="space-y-3">
            {[['Efectivo', summary.cash], ['Transferencia', summary.transfer], ['Tarjeta', summary.card], ['Junaeb', summary.junaeb]].map(([label, val]) => {
              const pct = summary.total_revenue > 0 ? (val / summary.total_revenue * 100).toFixed(0) : 0
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-semibold">{formatCLP(val || 0)} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-red rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="font-semibold text-sm text-gray-700 mb-4">Top 8 productos</div>
          {top_products?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top_products.slice(0, 8)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={v => formatCLP(v)} />
                <Bar dataKey="revenue" fill="#E30613" radius={[0, 4, 4, 0]}>
                  {top_products.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-gray-300 text-sm text-center py-8">Sin datos</div>}
        </div>
      </div>

      {dailyData.length > 0 && (
        <div className="card">
          <div className="font-semibold text-sm text-gray-700 mb-4">Evolución diaria</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => formatCLP(v)} />
              <Line type="monotone" dataKey="total" stroke="#E30613" strokeWidth={2} dot={false} name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function CostsReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reports/costs').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="font-semibold text-sm text-gray-700 mb-1">Valor total inventario</div>
        <div className="text-3xl font-bold text-brand-red">{formatCLP(data.total_inventory_value)}</div>
      </div>
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Margen por producto</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400">Producto</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Precio</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Costo</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">Margen</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400">%</th>
          </tr></thead>
          <tbody>
            {data.products?.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{p.name}</td>
                <td className="px-4 py-2 text-right">{formatCLP(p.price)}</td>
                <td className="px-4 py-2 text-right text-gray-500">{formatCLP(p.total_cost)}</td>
                <td className={`px-4 py-2 text-right font-semibold ${parseFloat(p.margin) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCLP(p.margin)}</td>
                <td className={`px-4 py-2 text-right font-bold ${parseFloat(p.margin_pct) >= 50 ? 'text-emerald-600' : parseFloat(p.margin_pct) >= 30 ? 'text-amber-600' : 'text-red-500'}`}>{p.margin_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PLReport() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  useEffect(() => {
    setLoading(true)
    api.get(`/reports/income-statement?month=${month}&year=${year}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [month, year])

  return (
    <div>
      <div className="flex gap-3 mb-5">
        <select className="input w-36" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
          {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className="input w-24" value={year} onChange={e => setYear(parseInt(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner /> : data && (
        <div className="card max-w-md">
          <h3 className="font-bold text-gray-800 mb-4">Estado de Resultados — {months[data.period.month-1]} {data.period.year}</h3>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Ingresos brutos', value: data.revenue, bold: false },
              { label: 'Descuentos', value: -data.discounts, bold: false, color: 'text-amber-600' },
              { label: 'Ingresos netos', value: data.net_revenue, bold: true, border: true },
              { label: 'Costo de ventas (COGS)', value: -data.cogs, bold: false, color: 'text-red-500' },
              { label: 'Utilidad bruta', value: data.gross_profit, bold: true, border: true, pct: data.gross_margin_pct },
              { label: 'Gastos operacionales', value: -data.expenses, bold: false, color: 'text-red-500' },
              { label: 'Utilidad neta', value: data.net_profit, bold: true, border: true, big: true, pct: data.net_margin_pct },
            ].map((row, i) => (
              <div key={i} className={`flex justify-between items-center py-1.5 ${row.border ? 'border-t border-gray-200 mt-1' : ''}`}>
                <span className={`${row.bold ? 'font-bold text-gray-800' : 'text-gray-500'}`}>{row.label}</span>
                <div className="text-right">
                  <span className={`font-${row.bold ? 'bold' : 'medium'} ${row.big ? 'text-xl' : ''} ${row.color || (row.value >= 0 ? 'text-gray-800' : 'text-red-500')}`}>
                    {formatCLP(Math.abs(row.value))} {row.value < 0 ? '(pérdida)' : ''}
                  </span>
                  {row.pct !== undefined && <div className="text-xs text-gray-400">{row.pct}% margen</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Ventas')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const handleExport = async () => {
    try {
      const r = await api.get(`/reports/export?date_from=${dateFrom}&date_to=${dateTo}`, { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `ventas_${dateFrom}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al exportar')
    }
  }

  return (
    <Layout title="Reportes">
      {/* Date range filter */}
      {activeTab === 'Ventas' && (
        <div className="flex flex-wrap gap-3 items-center mb-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Desde</span>
            <input type="date" className="input w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">hasta</span>
            <input type="date" className="input w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button onClick={handleExport} className="btn-secondary text-sm ml-auto">
            📥 Exportar Excel
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px
              ${activeTab === tab ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Ventas' && <SalesReport dateFrom={dateFrom} dateTo={dateTo} />}
      {activeTab === 'Costos' && <CostsReport />}
      {activeTab === 'Pérdidas y Ganancias' && <PLReport />}
    </Layout>
  )
}

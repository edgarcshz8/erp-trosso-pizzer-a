import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import api from '../../lib/api'
import { formatCLP } from '../../lib/format'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useShift } from '../../context/ShiftContext'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

function KPICard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="card">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { currentShift } = useShift()
  const [salesData, setSalesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stockAlerts, setStockAlerts] = useState([])

  useEffect(() => {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    Promise.all([
      api.get(`/reports/sales?date_from=${sevenDaysAgo.toISOString().split('T')[0]}&date_to=${today.toISOString().split('T')[0]}`),
      api.get('/supplies?active=true'),
    ]).then(([salesRes, suppliesRes]) => {
      setSalesData(salesRes.data)
      setStockAlerts(suppliesRes.data.filter(s => s.low_stock))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const dailyChartData = salesData?.daily?.map(d => ({
    date: new Date(d.date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
    total: parseFloat(d.total),
    ventas: parseInt(d.count)
  })) || []

  const topProducts = salesData?.top_products?.slice(0, 8).map(p => ({
    name: p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name,
    revenue: parseFloat(p.revenue),
    qty: parseInt(p.qty_sold)
  })) || []

  const summary = salesData?.summary || {}

  return (
    <Layout title="Dashboard">
      {/* Stock alerts */}
      {stockAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-800 text-sm">Stock bajo en {stockAlerts.length} insumo(s)</div>
            <div className="text-xs text-amber-600 mt-1">
              {stockAlerts.slice(0, 3).map(s => s.name).join(', ')}
              {stockAlerts.length > 3 && ` y ${stockAlerts.length - 3} más`}
            </div>
          </div>
        </div>
      )}

      {/* Shift status */}
      <div className={`rounded-xl p-4 mb-6 flex items-center justify-between ${currentShift ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div>
          <div className={`font-semibold text-sm ${currentShift ? 'text-emerald-800' : 'text-amber-800'}`}>
            {currentShift ? 'Turno de caja activo' : 'No hay turno activo'}
          </div>
          {currentShift && (
            <div className="text-xs text-emerald-600 mt-0.5">
              Abierto: {new Date(currentShift.opened_at).toLocaleString('es-CL')}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Ventas (7 días)"
          value={formatCLP(summary.total_revenue || 0)}
          sub={`${summary.sale_count || 0} transacciones`}
          color="text-brand-red"
        />
        <KPICard
          label="Efectivo"
          value={formatCLP(summary.cash || 0)}
          sub="Últimos 7 días"
        />
        <KPICard
          label="Transferencias"
          value={formatCLP(summary.transfer || 0)}
          sub="Últimos 7 días"
        />
        <KPICard
          label="Descuentos"
          value={formatCLP(summary.total_discount || 0)}
          sub="Total aplicado"
          color="text-amber-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Ventas últimos 7 días</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-300">Cargando...</div>
          ) : dailyChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCLP(v)} />
                <Line type="monotone" dataKey="total" stroke="#E30613" strokeWidth={2.5} dot={{ fill: '#E30613', r: 4 }} name="Total" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Top productos</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-300">Cargando...</div>
          ) : topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Sin datos</div>
          ) : (
            <div className="space-y-2">
              {topProducts.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-brand-red text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.qty} uds</div>
                  </div>
                  <div className="text-xs font-bold text-gray-700">{formatCLP(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment method breakdown */}
      {summary.total_revenue > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Distribución por método de pago</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Efectivo', value: summary.cash, color: 'bg-emerald-500' },
              { label: 'Transferencia', value: summary.transfer, color: 'bg-blue-500' },
              { label: 'Tarjeta', value: summary.card, color: 'bg-purple-500' },
              { label: 'Junaeb', value: summary.junaeb, color: 'bg-amber-500' },
            ].map(({ label, value, color }) => {
              const pct = summary.total_revenue > 0 ? Math.round((value / summary.total_revenue) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                  <div className="font-bold text-sm text-gray-800">{formatCLP(value || 0)}</div>
                  <div className="text-xs text-gray-400">{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Layout>
  )
}

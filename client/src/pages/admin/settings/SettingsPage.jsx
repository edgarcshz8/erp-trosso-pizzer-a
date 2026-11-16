import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../../components/LoadingSpinner'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    business_name: '',
    voucher_text: '',
    half_half_rule: 'expensive',
    business_day_end: '04:00',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/settings').then(r => {
      setSettings(prev => ({ ...prev, ...r.data }))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/settings', settings)
      toast.success('Configuración guardada')
    } catch (err) {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Layout title="Configuración"><LoadingSpinner /></Layout>

  return (
    <Layout title="Configuración">
      <div className="max-w-xl">
        <div className="card space-y-5">
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Datos del negocio</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Nombre del negocio</label>
                <input className="input" value={settings.business_name || ''} onChange={e => setSettings(s => ({ ...s, business_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Texto del voucher</label>
                <textarea className="input min-h-[80px]" value={settings.voucher_text || ''} onChange={e => setSettings(s => ({ ...s, voucher_text: e.target.value }))} placeholder="Mensaje en el comprobante..." />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-semibold text-gray-800 mb-4">Opciones de pizza</h3>
            <div>
              <label className="label">Regla precio mitad/mitad</label>
              <select className="input" value={settings.half_half_rule || 'expensive'} onChange={e => setSettings(s => ({ ...s, half_half_rule: e.target.value }))}>
                <option value="expensive">Precio más caro</option>
                <option value="average">Promedio de ambas</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Define cómo se calcula el precio de la pizza mitad y mitad.</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="font-semibold text-gray-800 mb-4">Horario</h3>
            <div>
              <label className="label">Fin del día laboral</label>
              <input type="time" className="input" value={settings.business_day_end || '04:00'} onChange={e => setSettings(s => ({ ...s, business_day_end: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Hora a partir de la cual se considera un nuevo día (ej: 04:00 para ventas nocturnas).</p>
            </div>
          </div>

          <div className="pt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

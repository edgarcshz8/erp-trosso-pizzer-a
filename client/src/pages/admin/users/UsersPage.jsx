import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import Modal from '../../../components/Modal'
import Badge from '../../../components/Badge'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../../../components/LoadingSpinner'

function UserForm({ user, onSave, onClose }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    role: user?.role || 'cashier',
    pin: user?.pin || '',
    password: '',
    active: user?.active !== false,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name) return toast.error('Nombre requerido')
    if (form.role === 'cashier' && !form.pin && !user) return toast.error('PIN requerido para cajero')
    if (form.role === 'admin' && !form.password && !user) return toast.error('Contraseña requerida para admin')
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        role: form.role,
        active: form.active,
        pin: form.role === 'cashier' ? form.pin : null,
      }
      if (form.password) payload.password = form.password
      if (user) {
        await api.put(`/users/${user.id}`, payload)
        toast.success('Usuario actualizado')
      } else {
        await api.post('/users', payload)
        toast.success('Usuario creado')
      }
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={user ? 'Editar usuario' : 'Nuevo usuario'} size="sm"
      footer={<><button onClick={onClose} className="btn-ghost">Cancelar</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Guardando...' : 'Guardar'}</button></>}>
      <div className="space-y-3">
        <div><label className="label">Nombre *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre completo" /></div>
        <div><label className="label">Rol</label>
          <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="cashier">Cajero</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {form.role === 'cashier' && (
          <div><label className="label">PIN (4-6 dígitos)</label><input type="password" inputMode="numeric" maxLength="6" className="input" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="1234" /></div>
        )}
        {form.role === 'admin' && (
          <div><label className="label">{user ? 'Nueva contraseña (dejar vacío = sin cambios)' : 'Contraseña *'}</label><input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" /></div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-brand-red" />
          <span className="text-sm text-gray-700">Usuario activo</span>
        </label>
      </div>
    </Modal>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/users')
      setUsers(r.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este usuario?')) return
    await api.delete(`/users/${id}`).then(() => { toast.success('Usuario desactivado'); load() }).catch(() => toast.error('Error'))
  }

  return (
    <Layout title="Usuarios">
      <div className="flex justify-end mb-5">
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-red text-white flex items-center justify-center font-bold text-sm">{u.name[0]}</div>
                      <span className="font-medium text-sm text-gray-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'admin' ? 'red' : 'info'}>
                      {u.role === 'admin' ? 'Administrador' : 'Cajero'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3"><Badge variant={u.active ? 'success' : 'gray'}>{u.active ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditing(u); setShowForm(true) }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(u.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-400">No hay usuarios</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <UserForm user={editing} onSave={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}
    </Layout>
  )
}

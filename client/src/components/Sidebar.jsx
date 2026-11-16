import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  HomeIcon, ShoppingCartIcon, ClipboardDocumentListIcon, CubeIcon,
  BeakerIcon, TagIcon, CurrencyDollarIcon, ChartBarIcon, UsersIcon,
  Cog6ToothIcon, ArrowRightOnRectangleIcon, TruckIcon, SparklesIcon
} from '@heroicons/react/24/outline'

const NAV_ADMIN = [
  { to: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
  { to: '/pos', icon: ShoppingCartIcon, label: 'Punto de Venta' },
  { to: '/admin/products', icon: CubeIcon, label: 'Productos' },
  { to: '/admin/inventory', icon: BeakerIcon, label: 'Inventario' },
  { to: '/admin/recipes', icon: SparklesIcon, label: 'Recetas' },
  { to: '/admin/promotions', icon: TagIcon, label: 'Promociones' },
  { to: '/admin/shifts', icon: CurrencyDollarIcon, label: 'Turnos' },
  { to: '/admin/expenses', icon: ClipboardDocumentListIcon, label: 'Gastos' },
  { to: '/admin/reports', icon: ChartBarIcon, label: 'Reportes' },
  { to: '/admin/extras', icon: TruckIcon, label: 'Extras Pizza' },
  { to: '/admin/users', icon: UsersIcon, label: 'Usuarios' },
  { to: '/admin/settings', icon: Cog6ToothIcon, label: 'Configuración' },
]

const NAV_CASHIER = [
  { to: '/pos', icon: ShoppingCartIcon, label: 'Punto de Venta' },
  { to: '/admin/shifts', icon: CurrencyDollarIcon, label: 'Turnos' },
]

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const navItems = isAdmin ? NAV_ADMIN : NAV_CASHIER

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Trosso Colosso" className="w-10 h-10 rounded-lg object-cover" />
          <div>
            <div className="font-bold text-gray-900 text-sm">Trosso Colosso</div>
            <div className="text-xs text-gray-400">Sistema POS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''} mb-0.5`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            {user?.name?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">{user?.name}</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Cajero'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

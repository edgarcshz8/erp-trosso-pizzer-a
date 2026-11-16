import React, { useState } from 'react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - desktop */}
      <div className="hidden md:flex md:w-60 md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 flex-shrink-0 bg-white shadow-xl">
            <button
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 gap-4 flex-shrink-0">
          <button
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900 text-base flex-1">{title}</h1>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-red text-white flex items-center justify-center font-bold text-xs">
              {user?.name?.[0] || '?'}
            </div>
            <span className="text-sm text-gray-500 hidden sm:inline">{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

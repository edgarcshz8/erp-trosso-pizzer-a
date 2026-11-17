import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ShiftProvider } from './context/ShiftContext'

// Pages
import Login from './pages/Login'
import POSPage from './pages/pos/POSPage'
import DashboardPage from './pages/admin/DashboardPage'
import ProductsPage from './pages/admin/products/ProductsPage'
import InventoryPage from './pages/admin/inventory/InventoryPage'
import RecipesPage from './pages/admin/recipes/RecipesPage'
import PromotionsPage from './pages/admin/promotions/PromotionsPage'
import ShiftsPage from './pages/admin/shifts/ShiftsPage'
import ExpensesPage from './pages/admin/expenses/ExpensesPage'
import UsersPage from './pages/admin/users/UsersPage'
import SettingsPage from './pages/admin/settings/SettingsPage'
import ReportsPage from './pages/admin/reports/ReportsPage'
import ExtrasPage from './pages/admin/extras/ExtrasPage'
import CategoriesPage from './pages/admin/categories/CategoriesPage'
import ProfilePage from './pages/profile/ProfilePage'

function RequireAuth({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/pos" replace />
  return children
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated
          ? <Navigate to={user?.role === 'admin' ? '/dashboard' : '/pos'} replace />
          : <Login />
      } />

      <Route path="/pos" element={
        <RequireAuth>
          <ShiftProvider>
            <POSPage />
          </ShiftProvider>
        </RequireAuth>
      } />

      <Route path="/dashboard" element={
        <RequireAuth adminOnly>
          <ShiftProvider>
            <DashboardPage />
          </ShiftProvider>
        </RequireAuth>
      } />

      <Route path="/admin/products" element={
        <RequireAuth adminOnly><ProductsPage /></RequireAuth>
      } />
      <Route path="/admin/inventory" element={
        <RequireAuth adminOnly><InventoryPage /></RequireAuth>
      } />
      <Route path="/admin/recipes" element={
        <RequireAuth adminOnly><RecipesPage /></RequireAuth>
      } />
      <Route path="/admin/promotions" element={
        <RequireAuth adminOnly><PromotionsPage /></RequireAuth>
      } />
      <Route path="/admin/shifts" element={
        <RequireAuth>
          <ShiftProvider>
            <ShiftsPage />
          </ShiftProvider>
        </RequireAuth>
      } />
      <Route path="/admin/expenses" element={
        <RequireAuth><ExpensesPage /></RequireAuth>
      } />
      <Route path="/admin/users" element={
        <RequireAuth adminOnly><UsersPage /></RequireAuth>
      } />
      <Route path="/admin/settings" element={
        <RequireAuth adminOnly><SettingsPage /></RequireAuth>
      } />
      <Route path="/admin/reports" element={
        <RequireAuth adminOnly><ReportsPage /></RequireAuth>
      } />
      <Route path="/admin/extras" element={
        <RequireAuth adminOnly><ExtrasPage /></RequireAuth>
      } />
      <Route path="/admin/categories" element={
        <RequireAuth adminOnly><CategoriesPage /></RequireAuth>
      } />
      <Route path="/profile" element={
        <RequireAuth>
          <ShiftProvider>
            <ProfilePage />
          </ShiftProvider>
        </RequireAuth>
      } />

      <Route path="/" element={
        isAuthenticated
          ? <Navigate to={user?.role === 'admin' ? '/dashboard' : '/pos'} replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AnneeProvider } from './context/AnneeContext'
import { ToastProvider } from './components/Toast'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import Eleves from './pages/Eleves'
import Professeurs from './pages/Professeurs'
import Classes from './pages/Classes'
import Paiements from './pages/Paiements'
import Notes from './pages/Notes'
import Parametres from './pages/Parametres'

function AppLayout() {
  return (
    <AnneeProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </AnneeProvider>
  )
}

function RequireAuth() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function RequireAdmin() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login"           element={<LoginGuard />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/"           element={<Dashboard />} />
                <Route path="/notes"      element={<Notes />} />
                <Route element={<RequireAdmin />}>
                  <Route path="/eleves"      element={<Eleves />} />
                  <Route path="/professeurs" element={<Professeurs />} />
                  <Route path="/classes"     element={<Classes />} />
                  <Route path="/paiements"   element={<Paiements />} />
                  <Route path="/parametres"  element={<Parametres />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

function LoginGuard() {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return <Login />
}

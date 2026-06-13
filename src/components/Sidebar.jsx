import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, DollarSign,
  FileText, BarChart2, Settings, LogOut, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navAdmin = [
  { to: '/',              icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/eleves',        icon: Users,           label: 'Élèves' },
  { to: '/professeurs',   icon: GraduationCap,   label: 'Professeurs' },
  { to: '/classes',       icon: BookOpen,        label: 'Classes & Matières' },
  { to: '/paiements',     icon: DollarSign,      label: 'Paiements' },
  { to: '/notes',         icon: FileText,        label: 'Notes & Bulletins' },
  { to: '/parametres',    icon: Settings,        label: 'Paramètres' },
]

const navProf = [
  { to: '/',   icon: LayoutDashboard, label: 'Mon tableau de bord' },
  { to: '/notes', icon: FileText,     label: 'Notes & Bulletins' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const nav = user?.role === 'admin' ? navAdmin : navProf

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-64 bg-sidebar flex flex-col shrink-0 h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-white font-bold text-lg leading-tight">Collège Manager CI</h1>
        <p className="text-white/40 text-xs mt-0.5">Gestion scolaire</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all
               ${isActive
                 ? 'bg-white/15 text-white font-medium'
                 : 'text-white/60 hover:bg-white/10 hover:text-white'}`
            }
          >
            <item.icon size={18} />
            <span className="flex-1">{item.label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.prenom?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-medium truncate">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-white/40 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

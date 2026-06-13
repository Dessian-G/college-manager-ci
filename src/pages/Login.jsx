import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GraduationCap, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ login: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (location.state?.registered) {
      setSuccessMsg('Compte créé avec succès ! Connectez-vous.')
    }
  }, [location.state])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    if (!form.login || !form.password) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    const res = await login(form.login, form.password)
    if (res.success) navigate('/', { replace: true })
    else setError(res.error || 'Identifiants incorrects')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4 shadow-lg">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Collège Manager CI</h1>
          <p className="text-white/60 text-sm mt-1">Connectez-vous à votre espace</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">

          {successMsg && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2 text-sm">
              <CheckCircle size={16} className="shrink-0" />
              {successMsg}
            </div>
          )}

          <div>
            <label className="label">Identifiant</label>
            <input
              className="input"
              placeholder="Votre login"
              value={form.login}
              onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Mot de passe</label>
              <Link to="/forgot-password" className="text-xs text-accent hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPwd ? 'text' : 'password'}
                placeholder="Votre mot de passe"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPwd(v => !v)}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            className="btn-primary w-full justify-center py-3 text-base"
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Link
            to="/register"
            className="btn-secondary w-full justify-center py-2.5 text-sm"
          >
            Créer un compte
          </Link>

          <p className="text-xs text-center text-gray-400 mt-2">
            Démo : <strong>admin</strong> / <strong>admin123</strong>
          </p>
        </form>
      </div>
    </div>
  )
}

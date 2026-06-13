import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff } from 'lucide-react'
import { auth as authApi } from '../api'

const QUESTIONS = [
  'Quel est le nom de votre école primaire ?',
  'Quel est le prénom de votre mère ?',
  'Quelle est votre ville de naissance ?',
  'Quel est le nom de votre animal de compagnie ?',
  'Quel est votre plat préféré ?',
]

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nom: '', prenom: '', login: '',
    password: '', confirmPassword: '',
    question_secrete: QUESTIONS[0], reponse_secrete: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.nom || !form.prenom || !form.login || !form.password) {
      setError('Tous les champs obligatoires doivent être remplis.')
      return
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (!form.reponse_secrete) {
      setError('Veuillez répondre à la question secrète.')
      return
    }
    setLoading(true)
    const res = await authApi.register(form)
    setLoading(false)
    if (res.success) {
      navigate('/login', { state: { registered: true } })
    } else {
      setError(res.error || 'Erreur lors de la création du compte.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent rounded-2xl mb-3 shadow-lg">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Créer un compte</h1>
          <p className="text-white/60 text-sm mt-1">Collège Manager CI</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Ex: Kouamé" value={form.prenom}
                onChange={e => set('prenom', e.target.value)} />
            </div>
            <div>
              <label className="label">Nom <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Ex: Kouassi" value={form.nom}
                onChange={e => set('nom', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Identifiant de connexion <span className="text-red-500">*</span></label>
            <input className="input" placeholder="Ex: k.kouassi" value={form.login}
              onChange={e => set('login', e.target.value)} autoComplete="username" />
          </div>

          <div>
            <label className="label">Mot de passe <span className="text-red-500">*</span></label>
            <div className="relative">
              <input className="input pr-10" type={showPwd ? 'text' : 'password'}
                placeholder="Minimum 6 caractères" value={form.password}
                onChange={e => set('password', e.target.value)} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirmer le mot de passe <span className="text-red-500">*</span></label>
            <input className="input" type={showPwd ? 'text' : 'password'}
              placeholder="Répétez le mot de passe" value={form.confirmPassword}
              onChange={e => set('confirmPassword', e.target.value)} />
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 mb-3 font-medium">Question secrète (pour récupérer votre mot de passe)</p>
            <div>
              <label className="label">Question <span className="text-red-500">*</span></label>
              <select className="input" value={form.question_secrete}
                onChange={e => set('question_secrete', e.target.value)}>
                {QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="mt-3">
              <label className="label">Votre réponse <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Réponse (insensible à la casse)"
                value={form.reponse_secrete} onChange={e => set('reponse_secrete', e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-accent font-medium hover:underline">Se connecter</Link>
          </p>

          <p className="text-xs text-center text-gray-400 bg-gray-50 rounded-lg p-2">
            Les nouveaux comptes ont le rôle <strong>Professeur</strong>.<br/>
            L'administrateur peut modifier les droits par la suite.
          </p>
        </form>
      </div>
    </div>
  )
}

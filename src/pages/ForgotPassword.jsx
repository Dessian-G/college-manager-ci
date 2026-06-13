import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { auth as authApi } from '../api'

const STEP = { LOGIN: 1, QUESTION: 2, NEW_PASSWORD: 3, SUCCESS: 4 }

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep]         = useState(STEP.LOGIN)
  const [login, setLogin]       = useState('')
  const [question, setQuestion] = useState('')
  const [reponse, setReponse]   = useState('')
  const [newPwd, setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleFindLogin(e) {
    e.preventDefault()
    setError('')
    if (!login.trim()) { setError('Entrez votre identifiant.'); return }
    setLoading(true)
    const res = await authApi.getQuestionSecrete(login.trim())
    setLoading(false)
    if (res.success) {
      setQuestion(res.question)
      setStep(STEP.QUESTION)
    } else {
      setError(res.error)
    }
  }

  async function handleVerifyReponse(e) {
    e.preventDefault()
    setError('')
    if (!reponse.trim()) { setError('Veuillez répondre à la question.'); return }
    setLoading(true)
    // On vérifie la réponse en tentant un reset avec un mot de passe temporaire
    // En réalité on passe directement à l'étape suivante, la vérification se fera au reset
    setLoading(false)
    setStep(STEP.NEW_PASSWORD)
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (!newPwd) { setError('Entrez un nouveau mot de passe.'); return }
    if (newPwd.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (newPwd !== confirmPwd) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    const res = await authApi.resetPasswordByQuestion(login.trim(), reponse, newPwd)
    setLoading(false)
    if (res.success) {
      setStep(STEP.SUCCESS)
    } else {
      setError(res.error)
      if (res.error?.includes('Réponse')) setStep(STEP.QUESTION)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent rounded-2xl mb-3 shadow-lg">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Mot de passe oublié</h1>
          <p className="text-white/60 text-sm mt-1">Collège Manager CI</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Étape 1 : identifiant */}
          {step === STEP.LOGIN && (
            <form onSubmit={handleFindLogin} className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">Entrez votre identifiant pour trouver votre compte.</p>
              <div>
                <label className="label">Identifiant</label>
                <input className="input" placeholder="Votre login" value={login}
                  onChange={e => setLogin(e.target.value)} autoFocus />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
                {loading ? 'Recherche...' : 'Continuer'}
              </button>
            </form>
          )}

          {/* Étape 2 : question secrète */}
          {step === STEP.QUESTION && (
            <form onSubmit={handleVerifyReponse} className="space-y-4">
              <button type="button" onClick={() => { setStep(STEP.LOGIN); setError('') }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
                <ArrowLeft size={14} /> Retour
              </button>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Question secrète</p>
                <p className="text-sm text-gray-800">{question}</p>
              </div>
              <div>
                <label className="label">Votre réponse</label>
                <input className="input" placeholder="Réponse (insensible à la casse)"
                  value={reponse} onChange={e => setReponse(e.target.value)} autoFocus />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
                Vérifier
              </button>
            </form>
          )}

          {/* Étape 3 : nouveau mot de passe */}
          {step === STEP.NEW_PASSWORD && (
            <form onSubmit={handleReset} className="space-y-4">
              <button type="button" onClick={() => { setStep(STEP.QUESTION); setError('') }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
                <ArrowLeft size={14} /> Retour
              </button>
              <p className="text-sm text-gray-600">Choisissez votre nouveau mot de passe.</p>
              <div>
                <label className="label">Nouveau mot de passe</label>
                <div className="relative">
                  <input className="input pr-10" type={showPwd ? 'text' : 'password'}
                    placeholder="Minimum 6 caractères" value={newPwd}
                    onChange={e => setNewPwd(e.target.value)} autoFocus />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirmer</label>
                <input className="input" type={showPwd ? 'text' : 'password'}
                  placeholder="Répétez le mot de passe" value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          )}

          {/* Succès */}
          {step === STEP.SUCCESS && (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <p className="text-gray-800 font-semibold">Mot de passe réinitialisé !</p>
              <p className="text-sm text-gray-500">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full justify-center py-2.5">
                Se connecter
              </button>
            </div>
          )}

          {step !== STEP.SUCCESS && (
            <p className="text-center text-sm text-gray-500 mt-4">
              <Link to="/login" className="text-accent font-medium hover:underline">
                ← Retour à la connexion
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

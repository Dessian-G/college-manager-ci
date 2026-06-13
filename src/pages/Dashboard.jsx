import { useState, useEffect } from 'react'
import { Users, BookOpen, GraduationCap, TrendingUp, Clock, Banknote, FileText } from 'lucide-react'
import { dashboard as dashApi } from '../api'
import { useAnnee } from '../context/AnneeContext'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const FCFA = n => n != null ? new Intl.NumberFormat('fr-FR').format(n) + ' F' : '—'

const COLORS = ['#f97316', '#1e3a5f', '#16a34a', '#9333ea', '#dc2626', '#0ea5e9']

export default function Dashboard() {
  const { anneeId } = useAnnee()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [derniers, setDerniers] = useState([])
  const [parClasse, setParClasse] = useState([])
  const [parMode, setParMode] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!anneeId) return
    if (user?.role === 'admin') loadAdmin()
    else loadProf()
  }, [anneeId, user])

  async function loadAdmin() {
    setLoading(true)
    const [s, d, c, m] = await Promise.all([
      dashApi.getStats(anneeId),
      dashApi.getDerniersPaiements(anneeId, 8),
      dashApi.getRecouvrementParClasse(anneeId),
      dashApi.getPaiementsParMode(anneeId),
    ])
    setStats(s)
    setDerniers(d || [])
    setParClasse((c || []).map(r => ({
      name: r.libelle,
      attendu: r.total_attendu,
      percu: r.total_percu,
    })))
    setParMode((m || []).map(r => ({
      name: labelMode(r.mode_paiement),
      value: r.total,
    })))
    setLoading(false)
  }

  async function loadProf() {
    setLoading(true)
    const s = await dashApi.getStatsProfesseur(user.professeur_id, anneeId)
    setStats(s)
    setLoading(false)
  }

  function labelMode(m) {
    const map = {
      especes: 'Espèces', orange_money: 'Orange Money', mtn_money: 'MTN Money',
      moov_money: 'Moov', wave: 'Wave', virement: 'Virement', cheque: 'Chèque',
    }
    return map[m] || m
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Chargement...</div>

  if (user?.role === 'professeur') {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Mon tableau de bord</h1>
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Classes assignées" value={stats?.classes?.length ?? 0} icon={BookOpen} color="blue" />
          <StatCard title="Évaluations saisies" value={stats?.nb_evaluations ?? 0} icon={FileText} color="orange" />
        </div>
        {stats?.classes?.length > 0 && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Mes enseignements</h2>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100"><th className="py-2 text-left text-gray-500">Classe</th><th className="py-2 text-left text-gray-500">Matière</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {stats.classes.map((c, i) => (
                  <tr key={i}><td className="py-2">{c.libelle}</td><td className="py-2">{c.matiere_libelle}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 overflow-auto">
      <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Élèves actifs"    value={stats?.nb_eleves}      icon={Users}         color="blue"   />
        <StatCard title="Classes"          value={stats?.nb_classes}     icon={BookOpen}      color="purple" />
        <StatCard title="Professeurs"      value={stats?.nb_professeurs} icon={GraduationCap} color="green"  />
        <StatCard
          title="Taux de recouvrement"
          value={`${stats?.taux_recouvrement ?? 0}%`}
          sub={`${FCFA(stats?.total_percu)} / ${FCFA(stats?.total_attendu)}`}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recouvrement par classe */}
        <div className="card xl:col-span-2">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Recouvrement par classe</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={parClasse} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => Math.round(v / 1000) + 'k'} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => FCFA(v)} />
              <Bar dataKey="attendu" fill="#e2e8f0" name="Attendu" radius={[4,4,0,0]} />
              <Bar dataKey="percu"   fill="#f97316" name="Perçu"   radius={[4,4,0,0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Paiements par mode */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Modes de paiement</h2>
          {parMode.length === 0 ? (
            <p className="text-gray-400 text-sm text-center pt-8">Aucun paiement</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={parMode} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={e => `${e.name}`}>
                  {parMode.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => FCFA(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Derniers paiements */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Banknote size={18} className="text-accent" />
          Derniers paiements
        </h2>
        {derniers.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun paiement enregistré</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="py-2 text-left font-medium">Élève</th>
                <th className="py-2 text-left font-medium">Classe</th>
                <th className="py-2 text-left font-medium">Tranche</th>
                <th className="py-2 text-right font-medium">Montant</th>
                <th className="py-2 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {derniers.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-2 font-medium">{p.eleve_nom} {p.eleve_prenom}</td>
                  <td className="py-2 text-gray-500">{p.classe_libelle}</td>
                  <td className="py-2 text-gray-500">{p.tranche_libelle}</td>
                  <td className="py-2 text-right text-green-600 font-medium">{FCFA(p.montant_verse)}</td>
                  <td className="py-2 text-right text-gray-400">{p.date_paiement?.split('T')[0] || p.date_paiement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Save, Database, Upload, Plus, KeyRound, Shield } from 'lucide-react'
import { parametres as paramApi, utilisateurs as usersApi, annees as anneesApi } from '../api'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import Badge from '../components/Badge'

export default function Parametres() {
  const toast = useToast()
  const { user, changePassword } = useAuth()
  const [tab, setTab] = useState('etablissement')
  const [params, setParams] = useState({})
  const [users, setUsers] = useState([])
  const [annees, setAnnees] = useState([])
  const [userModal, setUserModal] = useState({ open: false })
  const [pwdModal, setPwdModal] = useState(false)

  useEffect(() => {
    paramApi.get().then(p => setParams(p || {}))
    usersApi.getAll().then(u => setUsers(u || []))
    anneesApi.getAll().then(a => setAnnees(a || []))
  }, [])

  const handleSaveParams = async () => {
    const res = await paramApi.save(params)
    if (res.success) toast.success('Paramètres sauvegardés')
    else toast.error(res.error)
  }

  const handleBackup = async () => {
    const res = await paramApi.sauvegarderDB()
    if (res.success) toast.success(`Sauvegarde créée : ${res.path}`)
    else toast.error(res.error)
  }

  const handleRestore = async () => {
    const res = await paramApi.restaurerDB(undefined) // dialog opened by main
    if (res?.success) toast.success('Base restaurée. Redémarrez l\'application.')
    else if (res?.error) toast.error(res.error)
  }

  const handleCreateUser = async formData => {
    const res = await usersApi.create(formData)
    if (res.success) { toast.success('Utilisateur créé'); setUserModal({ open: false }); usersApi.getAll().then(u => setUsers(u || [])) }
    else toast.error(res.error)
  }

  const handleDesactiver = async id => {
    await usersApi.desactiver(id)
    toast.success('Utilisateur désactivé')
    usersApi.getAll().then(u => setUsers(u || []))
  }

  const handleNewAnnee = async () => {
    const libelle = prompt('Libellé de la nouvelle année scolaire (ex: 2025-2026)')
    if (!libelle) return
    const res = await anneesApi.create({ libelle, date_debut: '', date_fin: '' })
    if (res.success) { toast.success('Année créée'); anneesApi.getAll().then(a => setAnnees(a || [])) }
    else toast.error(res.error)
  }

  const handleActiverAnnee = async id => {
    await anneesApi.activate(id)
    toast.success('Année activée')
    anneesApi.getAll().then(a => setAnnees(a || []))
  }

  const userCols = [
    { key: 'login', header: 'Login', accessor: 'login' },
    { key: 'nom', header: 'Nom', accessor: 'nom' },
    { key: 'role', header: 'Rôle', accessor: 'role', cell: r => <Badge variant={r.role === 'admin' ? 'orange' : 'blue'}>{r.role}</Badge> },
    { key: 'actif', header: 'Statut', accessor: 'actif', cell: r => <Badge variant={r.actif ? 'green' : 'gray'}>{r.actif ? 'Actif' : 'Inactif'}</Badge> },
    { key: 'connexion', header: 'Dernière connexion', accessor: 'derniere_connexion' },
    { key: 'actions', header: '', sortable: false,
      cell: r => r.id !== user?.id && r.actif ? (
        <button className="btn-ghost btn-sm text-red-500" onClick={() => handleDesactiver(r.id)}>Désactiver</button>
      ) : null },
  ]

  return (
    <div className="p-8 overflow-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Paramètres</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {['etablissement','annees','utilisateurs','securite','sauvegarde'].map(t => (
          <button key={t} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setTab(t)}>
            {{ etablissement: 'Établissement', annees: 'Années', utilisateurs: 'Utilisateurs', securite: 'Sécurité', sauvegarde: 'Sauvegarde' }[t]}
          </button>
        ))}
      </div>

      {tab === 'etablissement' && (
        <div className="card max-w-lg space-y-4">
          <FormField label="Nom de l'établissement">
            <input className="input" value={params.nom_etablissement || ''} onChange={e => setParams(p => ({ ...p, nom_etablissement: e.target.value }))} />
          </FormField>
          <FormField label="Adresse">
            <input className="input" value={params.adresse || ''} onChange={e => setParams(p => ({ ...p, adresse: e.target.value }))} />
          </FormField>
          <FormField label="Téléphone">
            <input className="input" value={params.telephone || ''} onChange={e => setParams(p => ({ ...p, telephone: e.target.value }))} />
          </FormField>
          <FormField label="Ville">
            <input className="input" value={params.ville || ''} onChange={e => setParams(p => ({ ...p, ville: e.target.value }))} />
          </FormField>
          <button className="btn-primary" onClick={handleSaveParams}><Save size={16} /> Enregistrer</button>
        </div>
      )}

      {tab === 'annees' && (
        <div className="space-y-3">
          <button className="btn-primary" onClick={handleNewAnnee}><Plus size={16} /> Nouvelle année</button>
          <div className="card max-w-md">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-gray-500">
                <th className="py-2 text-left">Libellé</th>
                <th className="py-2 text-center">Statut</th>
                <th className="py-2"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {annees.map(a => (
                  <tr key={a.id}>
                    <td className="py-2 font-medium">{a.libelle}</td>
                    <td className="py-2 text-center">
                      <Badge variant={a.active ? 'green' : 'gray'}>{a.active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="py-2 text-right">
                      {!a.active && (
                        <button className="btn-ghost btn-sm" onClick={() => handleActiverAnnee(a.id)}>Activer</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'utilisateurs' && (
        <div className="space-y-4">
          <button className="btn-primary" onClick={() => setUserModal({ open: true })}>
            <Plus size={16} /> Nouvel utilisateur
          </button>
          <DataTable columns={userCols} data={users} pageSize={15} />
        </div>
      )}

      {tab === 'securite' && (
        <div className="card max-w-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={20} className="text-accent" />
            <h2 className="font-semibold text-gray-800">Changer mon mot de passe</h2>
          </div>
          <button className="btn-secondary w-full" onClick={() => setPwdModal(true)}>
            <KeyRound size={16} /> Modifier le mot de passe
          </button>
        </div>
      )}

      {tab === 'sauvegarde' && (
        <div className="card max-w-sm space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Database size={18} className="text-accent" /> Base de données
          </h2>
          <p className="text-sm text-gray-500">Sauvegardez ou restaurez votre base de données SQLite.</p>
          <div className="flex flex-col gap-3">
            <button className="btn-primary" onClick={handleBackup}>
              <Database size={16} /> Sauvegarder maintenant
            </button>
            <button className="btn-secondary" onClick={handleRestore}>
              <Upload size={16} /> Restaurer une sauvegarde
            </button>
          </div>
        </div>
      )}

      {/* Modal utilisateur */}
      <UserModal open={userModal.open} onClose={() => setUserModal({ open: false })} onSave={handleCreateUser} />

      {/* Modal mot de passe */}
      <Modal open={pwdModal} onClose={() => setPwdModal(false)} title="Changer le mot de passe" size="sm">
        <ChangePwdForm
          onSave={async (old_, new_) => {
            const res = await changePassword(old_, new_)
            if (res.success) { toast.success('Mot de passe modifié'); setPwdModal(false) }
            else toast.error(res.error)
          }}
          onCancel={() => setPwdModal(false)}
        />
      </Modal>
    </div>
  )
}

function UserModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ nom: '', prenom: '', login: '', role: 'admin', password: '' })
  useEffect(() => { if (open) setForm({ nom: '', prenom: '', login: '', role: 'admin', password: '' }) }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Nouvel utilisateur" size="sm">
      <div className="space-y-4">
        <FormField label="Nom" required><input className="input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></FormField>
        <FormField label="Prénom" required><input className="input" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} /></FormField>
        <FormField label="Login" required><input className="input" value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))} /></FormField>
        <FormField label="Rôle">
          <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="admin">Admin</option>
            <option value="professeur">Professeur</option>
          </select>
        </FormField>
        <FormField label="Mot de passe" required><input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></FormField>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => onSave(form)}>Créer</button>
      </div>
    </Modal>
  )
}

function ChangePwdForm({ onSave, onCancel }) {
  const [old_, setOld] = useState('')
  const [new_, setNew] = useState('')
  const [conf, setConf] = useState('')
  const [err, setErr] = useState('')

  const submit = () => {
    setErr('')
    if (!old_ || !new_) { setErr('Tous les champs sont requis'); return }
    if (new_ !== conf) { setErr('Les mots de passe ne correspondent pas'); return }
    if (new_.length < 6) { setErr('Minimum 6 caractères'); return }
    onSave(old_, new_)
  }

  return (
    <div className="space-y-4">
      <FormField label="Ancien mot de passe"><input className="input" type="password" value={old_} onChange={e => setOld(e.target.value)} /></FormField>
      <FormField label="Nouveau mot de passe"><input className="input" type="password" value={new_} onChange={e => setNew(e.target.value)} /></FormField>
      <FormField label="Confirmer"><input className="input" type="password" value={conf} onChange={e => setConf(e.target.value)} /></FormField>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex justify-end gap-3">
        <button className="btn-secondary" onClick={onCancel}>Annuler</button>
        <button className="btn-primary" onClick={submit}>Modifier</button>
      </div>
    </div>
  )
}

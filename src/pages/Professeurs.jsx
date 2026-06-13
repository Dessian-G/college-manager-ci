import { useState, useEffect } from 'react'
import { Plus, Edit2, UserX, BookOpen, KeyRound, GraduationCap, Trash2 } from 'lucide-react'
import { professeurs as profsApi, classes as classesApi, matieres as matieresApi, annees as anneesApi } from '../api'
import { useAnnee } from '../context/AnneeContext'
import { useToast } from '../components/Toast'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import FormField from '../components/FormField'
import Badge from '../components/Badge'

export default function Professeurs() {
  const { anneeId } = useAnnee()
  const toast = useToast()
  const [data, setData] = useState([])
  const [modal, setModal] = useState({ open: false, item: null })
  const [ensModal, setEnsModal] = useState({ open: false, prof: null, enseignements: [] })
  const [compteModal, setCompteModal] = useState({ open: false, prof: null })
  const [confirm, setConfirm] = useState({ open: false, id: null })

  const load = async () => {
    const p = await profsApi.getAll()
    setData(p || [])
  }
  useEffect(() => { load() }, [])

  const openEnseignements = async prof => {
    const ens = await profsApi.getEnseignements(prof.id)
    setEnsModal({ open: true, prof, enseignements: ens || [] })
  }

  const handleSave = async formData => {
    const res = modal.item
      ? await profsApi.update(modal.item.id, formData)
      : await profsApi.create(formData)
    if (res.success) { toast.success('Professeur enregistré'); setModal({ open: false, item: null }); load() }
    else toast.error(res.error)
  }

  const handleDelete = async id => {
    const res = await profsApi.delete(id)
    if (res.success) { toast.success('Professeur désactivé'); load() }
    else toast.error(res.error)
  }

  const handleRemoveEns = async id => {
    await profsApi.removeEnseignement(id)
    const ens = await profsApi.getEnseignements(ensModal.prof.id)
    setEnsModal(s => ({ ...s, enseignements: ens || [] }))
    toast.success('Enseignement retiré')
  }

  const cols = [
    { key: 'mat',    header: 'Matricule', accessor: 'matricule' },
    { key: 'nom',    header: 'Nom',       accessor: 'nom' },
    { key: 'prenom', header: 'Prénom',    accessor: 'prenom' },
    { key: 'sexe',   header: 'Sexe',      accessor: 'sexe',
      cell: r => <Badge variant={r.sexe === 'M' ? 'blue' : 'purple'}>{r.sexe === 'M' ? 'Homme' : 'Femme'}</Badge> },
    { key: 'spec',   header: 'Spécialité', accessor: 'specialite' },
    { key: 'tel',    header: 'Téléphone', accessor: 'telephone' },
    { key: 'compte', header: 'Compte',    sortable: false,
      cell: r => r.login
        ? <Badge variant="green">{r.login}</Badge>
        : <Badge variant="gray">Aucun</Badge> },
    {
      key: 'actions', header: '', sortable: false,
      cell: r => (
        <div className="flex gap-1">
          <button className="btn-ghost btn-sm" title="Enseignements" onClick={() => openEnseignements(r)}>
            <BookOpen size={14} />
          </button>
          <button className="btn-ghost btn-sm" title="Compte" onClick={() => setCompteModal({ open: true, prof: r })}>
            <KeyRound size={14} />
          </button>
          <button className="btn-ghost btn-sm" onClick={() => setModal({ open: true, item: r })}>
            <Edit2 size={14} />
          </button>
          <button className="btn-ghost btn-sm text-red-500" onClick={() => setConfirm({ open: true, id: r.id })}>
            <UserX size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <GraduationCap size={24} className="text-accent" /> Professeurs
        </h1>
        <button className="btn-primary" onClick={() => setModal({ open: true, item: null })}>
          <Plus size={16} /> Nouveau professeur
        </button>
      </div>

      <DataTable columns={cols} data={data} searchPlaceholder="Rechercher un professeur..." emptyMessage="Aucun professeur" />

      <ProfModal open={modal.open} item={modal.item} onClose={() => setModal({ open: false, item: null })} onSave={handleSave} />

      <EnseignementsModal
        open={ensModal.open}
        prof={ensModal.prof}
        enseignements={ensModal.enseignements}
        anneeId={anneeId}
        onClose={() => setEnsModal(s => ({ ...s, open: false }))}
        onRemove={handleRemoveEns}
        onAdd={async data => {
          const res = await profsApi.addEnseignement({ ...data, professeur_id: ensModal.prof.id, annee_scolaire_id: anneeId })
          if (res.success) {
            const ens = await profsApi.getEnseignements(ensModal.prof.id)
            setEnsModal(s => ({ ...s, enseignements: ens || [] }))
            toast.success('Enseignement ajouté')
          } else toast.error(res.error)
        }}
      />

      <CompteModal
        open={compteModal.open}
        prof={compteModal.prof}
        onClose={() => setCompteModal({ open: false, prof: null })}
        onSave={async (login, pwd) => {
          const res = await profsApi.createCompte(compteModal.prof.id, login, pwd)
          if (res.success) { toast.success('Compte créé'); setCompteModal({ open: false, prof: null }); load() }
          else toast.error(res.error)
        }}
      />

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={() => handleDelete(confirm.id)}
        title="Désactiver le professeur"
        message="Ce professeur sera désactivé et ne pourra plus se connecter."
        danger
      />
    </div>
  )
}

function ProfModal({ open, item, onClose, onSave }) {
  const [form, setForm] = useState({})
  useEffect(() => {
    setForm(item ? { ...item } : { matricule: '', nom: '', prenom: '', sexe: 'M', telephone: '', email: '', specialite: '', date_embauche: '' })
  }, [item, open])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Modifier le professeur' : 'Nouveau professeur'} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Matricule" required>
          <input className="input" value={form.matricule || ''} onChange={e => set('matricule', e.target.value)} placeholder="PROF-0001" />
        </FormField>
        <FormField label="Sexe">
          <select className="input" value={form.sexe || 'M'} onChange={e => set('sexe', e.target.value)}>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </FormField>
        <FormField label="Nom" required>
          <input className="input" value={form.nom || ''} onChange={e => set('nom', e.target.value)} />
        </FormField>
        <FormField label="Prénom" required>
          <input className="input" value={form.prenom || ''} onChange={e => set('prenom', e.target.value)} />
        </FormField>
        <FormField label="Téléphone">
          <input className="input" value={form.telephone || ''} onChange={e => set('telephone', e.target.value)} />
        </FormField>
        <FormField label="Email">
          <input className="input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
        </FormField>
        <FormField label="Spécialité">
          <input className="input" value={form.specialite || ''} onChange={e => set('specialite', e.target.value)} />
        </FormField>
        <FormField label="Date d'embauche">
          <input className="input" type="date" value={form.date_embauche || ''} onChange={e => set('date_embauche', e.target.value)} />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => onSave(form)}>Enregistrer</button>
      </div>
    </Modal>
  )
}

function EnseignementsModal({ open, prof, enseignements, anneeId, onClose, onRemove, onAdd }) {
  const [classes, setClasses] = useState([])
  const [matieres, setMatieres] = useState([])
  const [addForm, setAddForm] = useState({ matiere_id: '', classe_id: '', coefficient: 1 })

  useEffect(() => {
    if (!open || !anneeId) return
    Promise.all([classesApi.getAll(anneeId), matieresApi.getAll()]).then(([c, m]) => {
      setClasses(c || [])
      setMatieres(m || [])
    })
  }, [open, anneeId])

  return (
    <Modal open={open} onClose={onClose} title={`Enseignements — ${prof?.prenom} ${prof?.nom}`} size="lg">
      <div className="space-y-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-gray-500">
            <th className="py-2 text-left">Matière</th>
            <th className="py-2 text-left">Classe</th>
            <th className="py-2 text-left">Coefficient</th>
            <th className="py-2"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {enseignements.length === 0 && (
              <tr><td colSpan={4} className="text-center py-4 text-gray-400">Aucun enseignement</td></tr>
            )}
            {enseignements.map(e => (
              <tr key={e.id}>
                <td className="py-2">{e.matiere_libelle}</td>
                <td className="py-2">{e.classe_libelle}</td>
                <td className="py-2">{e.coefficient}</td>
                <td className="py-2">
                  <button className="btn-ghost btn-sm text-red-500" onClick={() => onRemove(e.id)}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Ajouter un enseignement</p>
          <div className="flex gap-2 flex-wrap">
            <select className="input flex-1 min-w-[140px]" value={addForm.matiere_id} onChange={e => setAddForm(f => ({ ...f, matiere_id: e.target.value }))}>
              <option value="">Matière</option>
              {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
            </select>
            <select className="input flex-1 min-w-[140px]" value={addForm.classe_id} onChange={e => setAddForm(f => ({ ...f, classe_id: e.target.value }))}>
              <option value="">Classe</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
            </select>
            <input className="input w-20" type="number" min="1" max="10" placeholder="Coef" value={addForm.coefficient} onChange={e => setAddForm(f => ({ ...f, coefficient: +e.target.value }))} />
            <button className="btn-primary btn-sm" onClick={() => {
              if (!addForm.matiere_id || !addForm.classe_id) return
              onAdd(addForm)
              setAddForm({ matiere_id: '', classe_id: '', coefficient: 1 })
            }}>
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function CompteModal({ open, prof, onClose, onSave }) {
  const [login, setLogin] = useState('')
  const [pwd, setPwd] = useState('')
  useEffect(() => {
    if (open && prof) { setLogin(prof.login || ''); setPwd('') }
  }, [open, prof])

  return (
    <Modal open={open} onClose={onClose} title="Créer / modifier le compte" size="sm">
      <div className="space-y-4">
        <FormField label="Login" required>
          <input className="input" value={login} onChange={e => setLogin(e.target.value)} />
        </FormField>
        <FormField label="Mot de passe" required>
          <input className="input" type="password" value={pwd} onChange={e => setPwd(e.target.value)} />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => onSave(login, pwd)}>Enregistrer</button>
      </div>
    </Modal>
  )
}

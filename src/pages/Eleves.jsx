import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, Users, DollarSign } from 'lucide-react'
import { eleves as elevesApi, classes as classesApi } from '../api'
import { useAnnee } from '../context/AnneeContext'
import { useToast } from '../components/Toast'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import FormField from '../components/FormField'
import Badge from '../components/Badge'

const FCFA = n => n != null ? new Intl.NumberFormat('fr-FR').format(n) + ' F' : '0 F'

const statutVariant = { actif: 'green', parti: 'gray', exclu: 'red' }

export default function Eleves() {
  const { anneeId } = useAnnee()
  const toast = useToast()
  const [data, setData] = useState([])
  const [classes, setClasses] = useState([])
  const [filterClasse, setFilterClasse] = useState('')
  const [filterStatut, setFilterStatut] = useState('actif')
  const [modal, setModal] = useState({ open: false, item: null })
  const [situModal, setSituModal] = useState({ open: false, eleve: null, situation: null })
  const [confirm, setConfirm] = useState({ open: false, id: null })

  const load = async () => {
    if (!anneeId) return
    const [e, c] = await Promise.all([
      elevesApi.getAll({ annee_scolaire_id: anneeId, classe_id: filterClasse || undefined, statut: filterStatut || undefined }),
      classesApi.getAll(anneeId),
    ])
    setData(e || [])
    setClasses(c || [])
  }

  useEffect(() => { load() }, [anneeId, filterClasse, filterStatut])

  const openSituation = async eleve => {
    const s = await elevesApi.getSituationPaiement(eleve.id)
    setSituModal({ open: true, eleve, situation: s })
  }

  const handleSave = async formData => {
    const res = modal.item
      ? await elevesApi.update(modal.item.id, formData)
      : await elevesApi.create({ ...formData, annee_scolaire_id: anneeId })
    if (res.success) { toast.success('Élève enregistré'); setModal({ open: false, item: null }); load() }
    else toast.error(res.error)
  }

  const handleDelete = async id => {
    const res = await elevesApi.delete(id)
    if (res.success) { toast.success('Élève marqué comme parti'); load() }
    else toast.error(res.error)
  }

  const cols = [
    { key: 'mat',     header: 'Matricule', accessor: 'matricule' },
    { key: 'nom',     header: 'Nom',       accessor: 'nom' },
    { key: 'prenom',  header: 'Prénom',    accessor: 'prenom' },
    { key: 'sexe',    header: 'Sexe',      accessor: 'sexe',
      cell: r => <Badge variant={r.sexe === 'M' ? 'blue' : 'purple'}>{r.sexe === 'M' ? 'G' : 'F'}</Badge> },
    { key: 'classe',  header: 'Classe',    accessor: 'classe_libelle' },
    { key: 'tuteur',  header: 'Tuteur',    accessor: 'nom_tuteur' },
    { key: 'statut',  header: 'Statut',    accessor: 'statut',
      cell: r => <Badge variant={statutVariant[r.statut]}>{r.statut}</Badge> },
    {
      key: 'actions', header: '', sortable: false,
      cell: r => (
        <div className="flex gap-1">
          <button className="btn-ghost btn-sm" title="Situation paiement" onClick={() => openSituation(r)}>
            <DollarSign size={14} />
          </button>
          <button className="btn-ghost btn-sm" onClick={() => setModal({ open: true, item: r })}>
            <Edit2 size={14} />
          </button>
          <button className="btn-ghost btn-sm text-red-500" onClick={() => setConfirm({ open: true, id: r.id })}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={24} className="text-accent" /> Élèves
        </h1>
        <button className="btn-primary" onClick={() => setModal({ open: true, item: null })}>
          <Plus size={16} /> Nouvel élève
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select className="input w-48" value={filterClasse} onChange={e => setFilterClasse(e.target.value)}>
          <option value="">Toutes les classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
        </select>
        <select className="input w-36" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="actif">Actif</option>
          <option value="parti">Parti</option>
          <option value="exclu">Exclu</option>
        </select>
        <span className="text-sm text-gray-500 self-center">{data.length} élève{data.length > 1 ? 's' : ''}</span>
      </div>

      <DataTable columns={cols} data={data} searchPlaceholder="Rechercher un élève..." emptyMessage="Aucun élève" pageSize={20} />

      <EleveModal
        open={modal.open}
        item={modal.item}
        classes={classes}
        anneeId={anneeId}
        onClose={() => setModal({ open: false, item: null })}
        onSave={handleSave}
      />

      <Modal open={situModal.open} onClose={() => setSituModal(s => ({ ...s, open: false }))} title="Situation de paiement" size="md">
        {situModal.situation && <SituationPaiement s={situModal.situation} />}
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={() => handleDelete(confirm.id)}
        title="Marquer comme parti"
        message="Cet élève sera marqué comme 'parti'. Son historique sera conservé."
        danger
      />
    </div>
  )
}

function EleveModal({ open, item, classes, anneeId, onClose, onSave }) {
  const [form, setForm] = useState({})
  useEffect(() => {
    setForm(item ? { ...item } : { nom: '', prenom: '', sexe: 'M', date_naissance: '', lieu_naissance: '', classe_id: '', nom_tuteur: '', telephone_tuteur: '', adresse: '', boursier: false, montant_exonere: 0, statut: 'actif' })
  }, [item, open])
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Modifier l\'élève' : 'Nouvel élève'} size="xl">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nom" required>
          <input className="input" value={form.nom || ''} onChange={e => set('nom', e.target.value)} />
        </FormField>
        <FormField label="Prénom" required>
          <input className="input" value={form.prenom || ''} onChange={e => set('prenom', e.target.value)} />
        </FormField>
        <FormField label="Sexe">
          <select className="input" value={form.sexe || 'M'} onChange={e => set('sexe', e.target.value)}>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </FormField>
        <FormField label="Classe" required>
          <select className="input" value={form.classe_id || ''} onChange={e => set('classe_id', +e.target.value)}>
            <option value="">— Choisir —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
          </select>
        </FormField>
        <FormField label="Date de naissance">
          <input className="input" type="date" value={form.date_naissance || ''} onChange={e => set('date_naissance', e.target.value)} />
        </FormField>
        <FormField label="Lieu de naissance">
          <input className="input" value={form.lieu_naissance || ''} onChange={e => set('lieu_naissance', e.target.value)} />
        </FormField>
        <FormField label="Nom du tuteur">
          <input className="input" value={form.nom_tuteur || ''} onChange={e => set('nom_tuteur', e.target.value)} />
        </FormField>
        <FormField label="Téléphone tuteur">
          <input className="input" value={form.telephone_tuteur || ''} onChange={e => set('telephone_tuteur', e.target.value)} />
        </FormField>
        <FormField label="Adresse" className="col-span-2">
          <input className="input" value={form.adresse || ''} onChange={e => set('adresse', e.target.value)} />
        </FormField>
        {item && (
          <FormField label="Statut">
            <select className="input" value={form.statut || 'actif'} onChange={e => set('statut', e.target.value)}>
              <option value="actif">Actif</option>
              <option value="parti">Parti</option>
              <option value="exclu">Exclu</option>
            </select>
          </FormField>
        )}
        <FormField label="Montant exonéré (FCFA)">
          <input className="input" type="number" value={form.montant_exonere || 0} onChange={e => set('montant_exonere', +e.target.value)} />
        </FormField>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="boursier" checked={!!form.boursier} onChange={e => set('boursier', e.target.checked)} className="w-4 h-4 accent-accent" />
          <label htmlFor="boursier" className="text-sm text-gray-700">Boursier</label>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => onSave(form)}>Enregistrer</button>
      </div>
    </Modal>
  )
}

function SituationPaiement({ s }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="bg-blue-50 rounded-lg px-4 py-3 flex-1 text-center">
          <p className="text-xs text-blue-600">Total dû</p>
          <p className="text-lg font-bold text-blue-700">{FCFA(s.totalDu)}</p>
        </div>
        <div className="bg-green-50 rounded-lg px-4 py-3 flex-1 text-center">
          <p className="text-xs text-green-600">Payé</p>
          <p className="text-lg font-bold text-green-700">{FCFA(s.totalPaye)}</p>
        </div>
        <div className="bg-orange-50 rounded-lg px-4 py-3 flex-1 text-center">
          <p className="text-xs text-orange-600">Reste</p>
          <p className="text-lg font-bold text-orange-700">{FCFA(s.resteAPayer)}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500">
            <th className="py-2 text-left">Tranche</th>
            <th className="py-2 text-right">Montant</th>
            <th className="py-2 text-right">Payé</th>
            <th className="py-2 text-center">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {s.tranches.map(t => (
            <tr key={t.id}>
              <td className="py-2">{t.libelle}</td>
              <td className="py-2 text-right">{FCFA(t.montant)}</td>
              <td className="py-2 text-right">{FCFA(t.montant_paye)}</td>
              <td className="py-2 text-center">
                <Badge variant={t.payee ? 'green' : 'red'}>{t.payee ? 'Soldé' : 'En attente'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

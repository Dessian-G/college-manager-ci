import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Settings, BookOpen } from 'lucide-react'
import { classes as classesApi, matieres as matieresApi } from '../api'
import { useAnnee } from '../context/AnneeContext'
import { useToast } from '../components/Toast'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import FormField from '../components/FormField'
import Badge from '../components/Badge'

const FCFA = n => n != null ? new Intl.NumberFormat('fr-FR').format(n) + ' F' : '0 F'

const niveaux = ['6ème','5ème','4ème','3ème','2nde','1ère','Terminale']

export default function Classes() {
  const { anneeId, anneeActive } = useAnnee()
  const toast = useToast()
  const [data, setData] = useState([])
  const [matieres, setMatieres] = useState([])
  const [modal, setModal] = useState({ open: false, item: null })
  const [trancheModal, setTrancheModal] = useState({ open: false, classeId: null, tranches: [] })
  const [matModal, setMatModal] = useState({ open: false, item: null })
  const [confirm, setConfirm] = useState({ open: false, id: null })

  const load = async () => {
    if (!anneeId) return
    const [c, m] = await Promise.all([classesApi.getAll(anneeId), matieresApi.getAll()])
    setData(c || [])
    setMatieres(m || [])
  }

  useEffect(() => { load() }, [anneeId])

  const openEdit = item => setModal({ open: true, item })
  const openNew  = ()   => setModal({ open: true, item: null })

  const openTranches = async classe => {
    const t = await classesApi.getTranches(classe.id)
    setTrancheModal({ open: true, classeId: classe.id, tranches: t || [] })
  }

  const handleSaveClasse = async formData => {
    const res = modal.item
      ? await classesApi.update(modal.item.id, formData)
      : await classesApi.create({ ...formData, annee_scolaire_id: anneeId })
    if (res.success) { toast.success('Classe enregistrée'); setModal({ open: false, item: null }); load() }
    else toast.error(res.error)
  }

  const handleDelete = async id => {
    const res = await classesApi.delete(id)
    if (res.success) { toast.success('Classe supprimée'); load() }
    else toast.error(res.error)
  }

  const handleSaveTranches = async () => {
    const res = await classesApi.saveTranches(trancheModal.classeId, trancheModal.tranches)
    if (res.success) { toast.success('Échéancier sauvegardé'); setTrancheModal(t => ({ ...t, open: false })) }
    else toast.error(res.error)
  }

  const handleSaveMatiere = async formData => {
    const res = matModal.item
      ? await matieresApi.update(matModal.item.id, formData)
      : await matieresApi.create(formData)
    if (res.success) { toast.success('Matière enregistrée'); setMatModal({ open: false, item: null }); load() }
    else toast.error(res.error)
  }

  const handleDeleteMatiere = async id => {
    const res = await matieresApi.delete(id)
    if (res.success) { toast.success('Matière supprimée'); load() }
    else toast.error(res.error)
  }

  const cols = [
    { key: 'libelle',   header: 'Classe',   accessor: 'libelle' },
    { key: 'niveau',    header: 'Niveau',   accessor: 'niveau',
      cell: r => <Badge variant="blue">{r.niveau}</Badge> },
    { key: 'effectif',  header: 'Effectif', accessor: 'nb_eleves',
      cell: r => `${r.nb_eleves ?? 0} / ${r.effectif_max}` },
    { key: 'frais_inscription', header: 'Inscription', accessor: 'frais_inscription',
      cell: r => FCFA(r.frais_inscription) },
    { key: 'frais_total', header: 'Scolarité totale', accessor: 'frais_scolarite_total',
      cell: r => FCFA(r.frais_scolarite_total) },
    {
      key: 'actions', header: '', sortable: false,
      cell: r => (
        <div className="flex gap-1">
          <button className="btn-ghost btn-sm" onClick={() => openTranches(r)} title="Échéancier">
            <Settings size={14} />
          </button>
          <button className="btn-ghost btn-sm" onClick={() => openEdit(r)} title="Modifier">
            <Edit2 size={14} />
          </button>
          <button className="btn-ghost btn-sm text-red-500 hover:text-red-600" onClick={() => setConfirm({ open: true, id: r.id })}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  const matCols = [
    { key: 'code',    header: 'Code',        accessor: 'code' },
    { key: 'libelle', header: 'Matière',     accessor: 'libelle' },
    { key: 'coef',    header: 'Coef. défaut', accessor: 'coefficient_defaut' },
    {
      key: 'actions', header: '', sortable: false,
      cell: r => (
        <div className="flex gap-1">
          <button className="btn-ghost btn-sm" onClick={() => setMatModal({ open: true, item: r })}>
            <Edit2 size={14} />
          </button>
          <button className="btn-ghost btn-sm text-red-500" onClick={() => handleDeleteMatiere(r.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-8 space-y-8 overflow-auto">
      {/* Classes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen size={24} className="text-accent" /> Classes
          </h1>
          <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nouvelle classe</button>
        </div>
        <DataTable columns={cols} data={data} emptyMessage="Aucune classe pour cette année" pageSize={15} />
      </section>

      {/* Matières */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Matières</h2>
          <button className="btn-secondary" onClick={() => setMatModal({ open: true, item: null })}>
            <Plus size={16} /> Ajouter
          </button>
        </div>
        <DataTable columns={matCols} data={matieres} pageSize={15} />
      </section>

      {/* Modal Classe */}
      <ClasseModal
        open={modal.open}
        item={modal.item}
        onClose={() => setModal({ open: false, item: null })}
        onSave={handleSaveClasse}
      />

      {/* Modal Tranches */}
      <Modal open={trancheModal.open} onClose={() => setTrancheModal(t => ({ ...t, open: false }))} title="Échéancier de la classe" size="md">
        <TranchesEditor
          tranches={trancheModal.tranches}
          onChange={t => setTrancheModal(s => ({ ...s, tranches: t }))}
        />
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setTrancheModal(t => ({ ...t, open: false }))}>Annuler</button>
          <button className="btn-primary" onClick={handleSaveTranches}>Enregistrer</button>
        </div>
      </Modal>

      {/* Modal Matière */}
      <MatiereModal
        open={matModal.open}
        item={matModal.item}
        onClose={() => setMatModal({ open: false, item: null })}
        onSave={handleSaveMatiere}
      />

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={() => handleDelete(confirm.id)}
        title="Supprimer la classe"
        message="Cette classe sera supprimée. Cette action est irréversible."
        danger
      />
    </div>
  )
}

function ClasseModal({ open, item, onClose, onSave }) {
  const [form, setForm] = useState({})
  useEffect(() => {
    setForm(item ? { ...item } : { libelle: '', niveau: '6ème', effectif_max: 45, frais_inscription: 0, frais_scolarite_total: 0 })
  }, [item, open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Modifier la classe' : 'Nouvelle classe'}>
      <div className="space-y-4">
        <FormField label="Libellé" required>
          <input className="input" value={form.libelle || ''} onChange={e => set('libelle', e.target.value)} placeholder="Ex: 6ème A" />
        </FormField>
        <FormField label="Niveau" required>
          <select className="input" value={form.niveau || ''} onChange={e => set('niveau', e.target.value)}>
            {niveaux.map(n => <option key={n}>{n}</option>)}
          </select>
        </FormField>
        <FormField label="Effectif maximum">
          <input className="input" type="number" value={form.effectif_max || 45} onChange={e => set('effectif_max', +e.target.value)} />
        </FormField>
        <FormField label="Frais d'inscription (FCFA)">
          <input className="input" type="number" value={form.frais_inscription || 0} onChange={e => set('frais_inscription', +e.target.value)} />
        </FormField>
        <FormField label="Scolarité totale (FCFA)">
          <input className="input" type="number" value={form.frais_scolarite_total || 0} onChange={e => set('frais_scolarite_total', +e.target.value)} />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => onSave(form)}>Enregistrer</button>
      </div>
    </Modal>
  )
}

function TranchesEditor({ tranches, onChange }) {
  const addTranche = () => {
    const nums = tranches.map(t => t.numero_tranche)
    const next = nums.length === 0 ? 0 : Math.max(...nums) + 1
    onChange([...tranches, { numero_tranche: next, libelle: `Tranche ${next}`, montant: 0, date_echeance: '' }])
  }
  const remove = i => onChange(tranches.filter((_, idx) => idx !== i))
  const update = (i, k, v) => onChange(tranches.map((t, idx) => idx === i ? { ...t, [k]: v } : t))

  return (
    <div className="space-y-3">
      {tranches.map((t, i) => (
        <div key={i} className="flex gap-2 items-end">
          <FormField label={i === 0 ? 'Libellé' : ''} className="flex-1">
            <input className="input" value={t.libelle} onChange={e => update(i, 'libelle', e.target.value)} />
          </FormField>
          <FormField label={i === 0 ? 'Montant (FCFA)' : ''} className="w-36">
            <input className="input" type="number" value={t.montant} onChange={e => update(i, 'montant', +e.target.value)} />
          </FormField>
          <FormField label={i === 0 ? 'Échéance' : ''} className="w-36">
            <input className="input" type="date" value={t.date_echeance || ''} onChange={e => update(i, 'date_echeance', e.target.value)} />
          </FormField>
          <button className="btn-ghost btn-sm text-red-500 mb-0.5" onClick={() => remove(i)}><Trash2 size={14} /></button>
        </div>
      ))}
      <button className="btn-secondary btn-sm mt-2" onClick={addTranche}><Plus size={14} /> Ajouter une tranche</button>
    </div>
  )
}

function MatiereModal({ open, item, onClose, onSave }) {
  const [form, setForm] = useState({})
  useEffect(() => {
    setForm(item ? { ...item } : { code: '', libelle: '', coefficient_defaut: 1 })
  }, [item, open])

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Modifier la matière' : 'Nouvelle matière'} size="sm">
      <div className="space-y-4">
        <FormField label="Code" required>
          <input className="input uppercase" value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="MATH" />
        </FormField>
        <FormField label="Libellé" required>
          <input className="input" value={form.libelle || ''} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Mathématiques" />
        </FormField>
        <FormField label="Coefficient par défaut">
          <input className="input" type="number" min="1" value={form.coefficient_defaut || 1} onChange={e => setForm(f => ({ ...f, coefficient_defaut: +e.target.value }))} />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => onSave(form)}>Enregistrer</button>
      </div>
    </Modal>
  )
}

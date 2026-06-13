import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Save, FileText, Download } from 'lucide-react'
import { notes as notesApi, classes as classesApi, matieres as matieresApi, eleves as elevesApi, exportXlsx, professeurs as profsApi } from '../api'
import { useAnnee } from '../context/AnneeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import ConfirmDialog from '../components/ConfirmDialog'
import Badge from '../components/Badge'

const mention = m => m == null ? '—' : m >= 16 ? 'Très Bien' : m >= 14 ? 'Bien' : m >= 12 ? 'Assez Bien' : m >= 10 ? 'Passable' : 'Insuffisant'
const mentionVariant = m => m == null ? 'gray' : m >= 14 ? 'green' : m >= 10 ? 'blue' : 'red'

export default function Notes() {
  const { anneeId } = useAnnee()
  const { user } = useAuth()
  const toast = useToast()

  const [tab, setTab] = useState('evaluations')
  const [classes, setClasses] = useState([])
  const [matieres, setMatieres] = useState([])
  const [selClasse, setSelClasse] = useState('')
  const [selMatiere, setSelMatiere] = useState('')
  const [selTrimestre, setSelTrimestre] = useState(1)
  const [evaluations, setEvaluations] = useState([])
  const [selEval, setSelEval] = useState(null)
  const [grille, setGrille] = useState([]) // [{eleve_id, nom, prenom, valeur}]
  const [moyennes, setMoyennes] = useState([])
  const [evalModal, setEvalModal] = useState({ open: false })
  const [confirm, setConfirm] = useState({ open: false, id: null })

  // Pour les profs: filtrer les classes/matieres selon enseignements
  const [profEns, setProfEns] = useState([])

  useEffect(() => {
    if (!anneeId) return
    if (user?.role === 'professeur' && user.professeur_id) {
      profsApi.getEnseignements(user.professeur_id).then(ens => {
        setProfEns(ens || [])
        const classeIds = [...new Set((ens || []).map(e => e.classe_id))]
        classesApi.getAll(anneeId).then(c => setClasses((c || []).filter(cl => classeIds.includes(cl.id))))
        matieresApi.getAll().then(m => {
          const matIds = [...new Set((ens || []).map(e => e.matiere_id))]
          setMatieres((m || []).filter(mat => matIds.includes(mat.id)))
        })
      })
    } else {
      Promise.all([classesApi.getAll(anneeId), matieresApi.getAll()]).then(([c, m]) => {
        setClasses(c || [])
        setMatieres(m || [])
      })
    }
  }, [anneeId, user])

  useEffect(() => {
    if (!selClasse) return
    loadEvaluations()
    if (tab === 'moyennes') loadMoyennes()
  }, [selClasse, selMatiere, selTrimestre, tab])

  const loadEvaluations = async () => {
    const e = await notesApi.getEvaluations(selClasse, selMatiere || undefined, selTrimestre)
    setEvaluations(e || [])
    setSelEval(null)
    setGrille([])
  }

  const loadMoyennes = async () => {
    const m = await notesApi.getMoyennesClasse(selClasse, selTrimestre, anneeId)
    setMoyennes(m || [])
  }

  const openEval = async eval_ => {
    setSelEval(eval_)
    const notesData = await loadNotesEval(eval_.id)
    setGrille(notesData)
  }

  const loadNotesEval = async (evalId) => {
    const eleves = await elevesApi.getAll({ classe_id: selClasse, annee_scolaire_id: anneeId, statut: 'actif' })
    const notesMap = {}
    await Promise.all((eleves || []).map(async el => {
      const ns = await notesApi.getNotesByEleve(el.id, selClasse, selTrimestre)
      const n = (ns || []).find(n => n.evaluation_id === evalId)
      notesMap[el.id] = n?.valeur ?? ''
    }))
    return (eleves || []).map(el => ({
      eleve_id: el.id,
      nom: el.nom,
      prenom: el.prenom,
      valeur: notesMap[el.id] ?? '',
    }))
  }

  const handleSaveNotes = async () => {
    if (!selEval) return
    const toSave = grille.filter(r => r.valeur !== '' && r.valeur != null)
      .map(r => ({ eleve_id: r.eleve_id, valeur: parseFloat(r.valeur) }))
    const res = await notesApi.saveNotes(selEval.id, toSave)
    if (res.success) toast.success('Notes enregistrées')
    else toast.error(res.error)
  }

  const handleCreateEval = async formData => {
    const res = await notesApi.createEvaluation({
      ...formData,
      classe_id: selClasse,
      matiere_id: selMatiere || formData.matiere_id,
      trimestre: selTrimestre,
      professeur_id: user?.role === 'professeur' ? user.professeur_id : null,
    })
    if (res.success) { toast.success('Évaluation créée'); setEvalModal({ open: false }); loadEvaluations() }
    else toast.error(res.error)
  }

  const handleDeleteEval = async id => {
    const res = await notesApi.deleteEvaluation(id)
    if (res.success) { toast.success('Évaluation supprimée'); loadEvaluations() }
    else toast.error(res.error)
  }

  const matieresFiltrees = useMemo(() => {
    if (!selClasse || user?.role !== 'professeur') return matieres
    return matieres.filter(m => profEns.some(e => e.matiere_id === m.id && String(e.classe_id) === String(selClasse)))
  }, [matieres, selClasse, profEns, user])

  return (
    <div className="p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText size={24} className="text-accent" /> Notes & Bulletins
        </h1>
        {tab === 'moyennes' && selClasse && (
          <button className="btn-secondary btn-sm" onClick={() => exportXlsx.resultatsClasse(selClasse, selTrimestre, anneeId)}>
            <Download size={14} /> Export Excel
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {['evaluations', 'moyennes'].map(t => (
          <button key={t} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setTab(t)}>
            {t === 'evaluations' ? 'Saisie des notes' : 'Moyennes / Classement'}
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select className="input w-48" value={selClasse} onChange={e => { setSelClasse(e.target.value); setSelEval(null); setGrille([]) }}>
          <option value="">— Classe —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
        </select>
        <select className="input w-48" value={selMatiere} onChange={e => setSelMatiere(e.target.value)}>
          <option value="">Toutes les matières</option>
          {matieresFiltrees.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
        </select>
        <select className="input w-36" value={selTrimestre} onChange={e => setSelTrimestre(+e.target.value)}>
          <option value={1}>Trimestre 1</option>
          <option value={2}>Trimestre 2</option>
          <option value={3}>Trimestre 3</option>
        </select>
      </div>

      {tab === 'evaluations' && (
        <div className="flex gap-6">
          {/* Liste évaluations */}
          <div className="w-72 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Évaluations</span>
              {selClasse && (
                <button className="btn-primary btn-sm" onClick={() => setEvalModal({ open: true })}>
                  <Plus size={12} /> Créer
                </button>
              )}
            </div>
            <div className="space-y-1">
              {evaluations.map(ev => (
                <div
                  key={ev.id}
                  className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition-colors ${selEval?.id === ev.id ? 'bg-accent/10 border-accent/30' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                  onClick={() => openEval(ev)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.libelle}</p>
                    <p className="text-xs text-gray-400">{ev.matiere_libelle} · /{ev.note_sur} · {ev.nb_notes} notes</p>
                  </div>
                  <button className="text-gray-300 hover:text-red-500" onClick={e => { e.stopPropagation(); setConfirm({ open: true, id: ev.id }) }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {selClasse && evaluations.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">Aucune évaluation</p>
              )}
            </div>
          </div>

          {/* Grille notes */}
          <div className="flex-1">
            {selEval ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold">{selEval.libelle}</h2>
                    <p className="text-sm text-gray-500">{selEval.matiere_libelle} — Note sur {selEval.note_sur}</p>
                  </div>
                  <button className="btn-primary btn-sm" onClick={handleSaveNotes}>
                    <Save size={14} /> Enregistrer
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Élève</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-600">Note / {selEval.note_sur}</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-600">/ 20</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {grille.map((row, i) => {
                        const sur20 = row.valeur !== '' ? Math.round((parseFloat(row.valeur) / selEval.note_sur) * 2000) / 100 : null
                        return (
                          <tr key={row.eleve_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{row.nom} {row.prenom}</td>
                            <td className="px-4 py-2 w-28">
                              <input
                                className="input text-center w-24"
                                type="number"
                                min="0"
                                max={selEval.note_sur}
                                step="0.5"
                                value={row.valeur}
                                onChange={e => setGrille(g => g.map((r, idx) => idx === i ? { ...r, valeur: e.target.value } : r))}
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              {sur20 != null && (
                                <Badge variant={mentionVariant(sur20)}>{sur20.toFixed(2)}</Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                <FileText size={48} />
                <p className="mt-2 text-sm">Sélectionnez une évaluation</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'moyennes' && (
        <MoyennesTable moyennes={moyennes} anneeId={anneeId} selClasse={selClasse} selTrimestre={selTrimestre} />
      )}

      {/* Modal créer évaluation */}
      <EvalModal
        open={evalModal.open}
        matieres={matieresFiltrees}
        onClose={() => setEvalModal({ open: false })}
        onSave={handleCreateEval}
      />

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={() => handleDeleteEval(confirm.id)}
        title="Supprimer l'évaluation"
        message="Cette évaluation et toutes ses notes seront supprimées."
        danger
      />
    </div>
  )
}

function MoyennesTable({ moyennes, anneeId, selClasse, selTrimestre }) {
  if (!selClasse) return <p className="text-gray-400 text-sm">Sélectionnez une classe</p>
  if (moyennes.length === 0) return <p className="text-gray-400 text-sm">Aucune donnée disponible</p>

  const sorted = [...moyennes].sort((a, b) => (b.moyenne_generale || 0) - (a.moyenne_generale || 0))

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-4 py-3 text-center font-semibold text-gray-600 w-12">Rang</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Élève</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600">Moy. Gén.</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600">Mention</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((e, i) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-center font-bold text-gray-500">{e.moyenne_generale != null ? i + 1 : '—'}</td>
              <td className="px-4 py-2 font-medium">{e.nom} {e.prenom}</td>
              <td className="px-4 py-2 text-center">
                {e.moyenne_generale != null ? (
                  <span className={`font-bold ${e.moyenne_generale >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                    {e.moyenne_generale.toFixed(2)}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-2 text-center">
                <Badge variant={mentionVariant(e.moyenne_generale)}>{mention(e.moyenne_generale)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EvalModal({ open, matieres, onClose, onSave }) {
  const [form, setForm] = useState({ libelle: '', type: 'devoir', matiere_id: '', note_sur: 20, date: new Date().toISOString().split('T')[0] })
  useEffect(() => {
    if (open) setForm({ libelle: '', type: 'devoir', matiere_id: matieres[0]?.id || '', note_sur: 20, date: new Date().toISOString().split('T')[0] })
  }, [open, matieres])

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle évaluation" size="sm">
      <div className="space-y-4">
        <FormField label="Libellé" required>
          <input className="input" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Devoir n°1" />
        </FormField>
        <FormField label="Matière" required>
          <select className="input" value={form.matiere_id} onChange={e => setForm(f => ({ ...f, matiere_id: +e.target.value }))}>
            <option value="">— Choisir —</option>
            {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
          </select>
        </FormField>
        <FormField label="Type">
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="interrogation">Interrogation</option>
            <option value="devoir">Devoir</option>
            <option value="composition">Composition</option>
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Note sur">
            <input className="input" type="number" value={form.note_sur} onChange={e => setForm(f => ({ ...f, note_sur: +e.target.value }))} />
          </FormField>
          <FormField label="Date">
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </FormField>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => onSave(form)}>Créer</button>
      </div>
    </Modal>
  )
}

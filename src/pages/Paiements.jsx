import { useState, useEffect } from 'react'
import { DollarSign, AlertCircle, Plus, Download } from 'lucide-react'
import { paiements as paiApi, classes as classesApi, eleves as elevesApi, exportXlsx } from '../api'
import { useAnnee } from '../context/AnneeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import Badge from '../components/Badge'

const FCFA = n => n != null ? new Intl.NumberFormat('fr-FR').format(n) + ' F' : '0 F'

const modesLabel = {
  especes: 'Espèces', orange_money: 'Orange Money', mtn_money: 'MTN Money',
  moov_money: 'Moov Money', wave: 'Wave', virement: 'Virement', cheque: 'Chèque',
}

export default function Paiements() {
  const { anneeId } = useAnnee()
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('saisie')
  const [classes, setClasses] = useState([])
  const [selectedClasse, setSelectedClasse] = useState('')
  const [tableau, setTableau] = useState([])
  const [retards, setRetards] = useState([])
  const [paiModal, setPaiModal] = useState({ open: false, eleveId: null, trancheId: null, montant: 0 })

  useEffect(() => {
    if (!anneeId) return
    classesApi.getAll(anneeId).then(c => setClasses(c || []))
    paiApi.getRetards(anneeId).then(r => setRetards(r || []))
  }, [anneeId])

  useEffect(() => {
    if (!selectedClasse || !anneeId) return
    loadTableau()
  }, [selectedClasse, anneeId])

  const loadTableau = async () => {
    const data = await paiApi.getByClasse(selectedClasse, anneeId)
    setTableau(data || [])
  }

  const openPaiement = (eleveId, trancheId, montantDu, montantPaye) => {
    const reste = montantDu - montantPaye
    setPaiModal({ open: true, eleveId, trancheId, montant: reste > 0 ? reste : 0 })
  }

  const handleEnregistrer = async formData => {
    const res = await paiApi.enregistrer({
      ...formData,
      eleve_id: paiModal.eleveId,
      tranche_scolarite_id: paiModal.trancheId,
      encaisse_par: user.id,
    })
    if (res.success) {
      toast.success(`Paiement enregistré — Reçu ${res.recu_numero}`)
      setPaiModal({ open: false, eleveId: null, trancheId: null, montant: 0 })
      loadTableau()
    } else toast.error(res.error)
  }

  // Pivot tableau
  const tranches = [...new Set(tableau.map(r => r.tranche_id))]
    .map(id => tableau.find(r => r.tranche_id === id))
    .sort((a, b) => a.numero_tranche - b.numero_tranche)
  const eleveIds = [...new Set(tableau.map(r => r.eleve_id))]

  const retardCols = [
    { key: 'mat', header: 'Matricule', accessor: 'matricule' },
    { key: 'nom', header: 'Nom', accessor: 'eleve_nom' },
    { key: 'prenom', header: 'Prénom', accessor: 'eleve_prenom' },
    { key: 'classe', header: 'Classe', accessor: 'classe_libelle' },
    { key: 'tranche', header: 'Tranche', accessor: 'tranche_libelle' },
    { key: 'echeance', header: 'Échéance', accessor: 'date_echeance' },
    { key: 'retard', header: 'Retard', sortable: false,
      cell: r => <span className="text-red-600 font-medium">{FCFA(r.montant - r.montant_paye)}</span> },
  ]

  return (
    <div className="p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign size={24} className="text-accent" /> Paiements
        </h1>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => exportXlsx.etatPaiementGlobal(anneeId)}>
            <Download size={14} /> Export global
          </button>
          {selectedClasse && (
            <button className="btn-secondary btn-sm" onClick={() => exportXlsx.etatPaiementClasse(selectedClasse, anneeId)}>
              <Download size={14} /> Export classe
            </button>
          )}
          {tab === 'retards' && (
            <button className="btn-secondary btn-sm" onClick={() => exportXlsx.retards(anneeId)}>
              <Download size={14} /> Export retards
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {['saisie','retards'].map(t => (
          <button
            key={t}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab(t)}
          >
            {t === 'saisie' ? 'Saisie paiements' : `Retards (${retards.length})`}
          </button>
        ))}
      </div>

      {tab === 'saisie' && (
        <>
          <select className="input w-64 mb-6" value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)}>
            <option value="">— Choisir une classe —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
          </select>

          {selectedClasse && tranches.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Élève</th>
                    {tranches.map(t => (
                      <th key={t.tranche_id} className="px-4 py-3 text-center font-semibold text-gray-600 whitespace-nowrap">
                        {t.tranche_libelle}<br />
                        <span className="text-xs font-normal text-gray-400">{FCFA(t.montant)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {eleveIds.map(eleveId => {
                    const rows = tableau.filter(r => r.eleve_id === eleveId)
                    const nom = `${rows[0]?.nom} ${rows[0]?.prenom}`
                    return (
                      <tr key={eleveId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{nom}</td>
                        {tranches.map(tranche => {
                          const cell = rows.find(r => r.tranche_id === tranche.tranche_id)
                          const payee = cell?.payee
                          return (
                            <td key={tranche.tranche_id} className="px-4 py-2 text-center">
                              {payee ? (
                                <Badge variant="green">Soldé</Badge>
                              ) : (
                                <button
                                  className="btn-primary btn-sm"
                                  onClick={() => openPaiement(eleveId, tranche.tranche_id, tranche.montant, cell?.montant_paye || 0)}
                                >
                                  <Plus size={12} /> Payer
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : selectedClasse ? (
            <p className="text-gray-400">Aucune tranche configurée pour cette classe.</p>
          ) : null}
        </>
      )}

      {tab === 'retards' && (
        <DataTable
          columns={retardCols}
          data={retards}
          emptyMessage="Aucun retard de paiement"
          searchPlaceholder="Rechercher..."
        />
      )}

      <PaiementModal
        open={paiModal.open}
        montantDu={paiModal.montant}
        onClose={() => setPaiModal(s => ({ ...s, open: false }))}
        onSave={handleEnregistrer}
      />
    </div>
  )
}

function PaiementModal({ open, montantDu, onClose, onSave }) {
  const [form, setForm] = useState({ montant_verse: 0, mode_paiement: 'especes', reference: '', date_paiement: new Date().toISOString().split('T')[0] })
  useEffect(() => {
    if (open) setForm(f => ({ ...f, montant_verse: montantDu }))
  }, [open, montantDu])

  return (
    <Modal open={open} onClose={onClose} title="Enregistrer un paiement" size="sm">
      <div className="space-y-4">
        <FormField label="Montant à verser (FCFA)" required>
          <input className="input" type="number" value={form.montant_verse} onChange={e => setForm(f => ({ ...f, montant_verse: +e.target.value }))} />
          <p className="text-xs text-gray-400 mt-1">Reste dû : {FCFA(montantDu)}</p>
        </FormField>
        <FormField label="Mode de paiement" required>
          <select className="input" value={form.mode_paiement} onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}>
            {Object.entries(modesLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </FormField>
        <FormField label="Référence / N° transaction">
          <input className="input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
        </FormField>
        <FormField label="Date de paiement">
          <input className="input" type="date" value={form.date_paiement} onChange={e => setForm(f => ({ ...f, date_paiement: e.target.value }))} />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button className="btn-primary" onClick={() => onSave(form)}>Enregistrer</button>
      </div>
    </Modal>
  )
}

const ExcelJS = require('exceljs')
const path = require('path')
const { app, dialog } = require('electron')
const { getDb } = require('../database/db')

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true }
const ACCENT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } }
const BORDER = { style: 'thin', color: { argb: 'FFCCCCCC' } }
const ALL_BORDERS = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }

function formatFCFA(n) {
  if (n == null) return ''
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

function applyHeaderRow(sheet, columns) {
  const row = sheet.addRow(columns.map(c => c.header))
  row.eachCell(cell => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = ALL_BORDERS
  })
  columns.forEach((c, i) => { sheet.getColumn(i + 1).width = c.width || 15 })
  return row
}

async function saveWorkbook(wb, defaultName) {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Enregistrer le fichier Excel',
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  })
  if (!filePath) return { success: false, cancelled: true }
  await wb.xlsx.writeFile(filePath)
  return { success: true, path: filePath }
}

async function etatPaiementClasse(classeId, anneeId) {
  const db = getDb()
  const classe = db.prepare('SELECT * FROM classes WHERE id=?').get(classeId)
  const annee  = db.prepare('SELECT * FROM annees_scolaires WHERE id=?').get(anneeId)
  const tranches = db.prepare(
    'SELECT * FROM tranches_scolarite WHERE classe_id=? ORDER BY numero_tranche'
  ).all(classeId)
  const eleves = db.prepare(
    "SELECT * FROM eleves WHERE classe_id=? AND annee_scolaire_id=? AND statut='actif' ORDER BY nom"
  ).all(classeId, anneeId)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(`État paiements - ${classe.libelle}`)

  ws.mergeCells('A1:' + String.fromCharCode(65 + tranches.length + 3) + '1')
  const title = ws.getCell('A1')
  title.value = `État des paiements — ${classe.libelle} — ${annee.libelle}`
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: 'center' }
  ws.addRow([])

  const cols = [
    { header: 'N°',         width: 5  },
    { header: 'Matricule',  width: 15 },
    { header: 'Nom & Prénom', width: 25 },
    ...tranches.map(t => ({ header: t.libelle, width: 18 })),
    { header: 'Total payé', width: 15 },
    { header: 'Reste',      width: 15 },
  ]
  applyHeaderRow(ws, cols)

  eleves.forEach((e, i) => {
    const paiementsEleve = tranches.map(t => {
      const p = db.prepare(
        'SELECT COALESCE(SUM(montant_verse),0) as total FROM paiements WHERE eleve_id=? AND tranche_scolarite_id=?'
      ).get(e.id, t.id)
      return p.total
    })

    const totalPaye = paiementsEleve.reduce((s, v) => s + v, 0)
    const totalDu = (classe.frais_inscription + classe.frais_scolarite_total) - (e.montant_exonere || 0)
    const reste = totalDu - totalPaye

    const row = ws.addRow([
      i + 1,
      e.matricule,
      `${e.nom} ${e.prenom}`,
      ...paiementsEleve.map(p => formatFCFA(p)),
      formatFCFA(totalPaye),
      reste <= 0 ? 'Soldé' : formatFCFA(reste),
    ])

    if (i % 2 === 0) {
      row.eachCell(cell => { cell.fill = ACCENT_FILL })
    }
    if (reste <= 0) {
      row.getCell(tranches.length + 5).font = { color: { argb: 'FF16A34A' }, bold: true }
    } else {
      row.getCell(tranches.length + 5).font = { color: { argb: 'FFDC2626' } }
    }
    row.eachCell(cell => { cell.border = ALL_BORDERS })
  })

  return saveWorkbook(wb, `paiements_${classe.libelle.replace(/\s/g, '_')}_${annee.libelle}.xlsx`)
}

async function etatPaiementGlobal(anneeId) {
  const db = getDb()
  const annee   = db.prepare('SELECT * FROM annees_scolaires WHERE id=?').get(anneeId)
  const classes = db.prepare(
    "SELECT c.*, COUNT(DISTINCT e.id) as nb_eleves FROM classes c LEFT JOIN eleves e ON e.classe_id=c.id AND e.statut='actif' WHERE c.annee_scolaire_id=? GROUP BY c.id ORDER BY c.niveau"
  ).all(anneeId)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Synthèse globale')

  ws.mergeCells('A1:G1')
  ws.getCell('A1').value = `Synthèse globale des paiements — ${annee.libelle}`
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.addRow([])

  applyHeaderRow(ws, [
    { header: 'Classe', width: 20 }, { header: 'Niveau', width: 12 },
    { header: 'Effectif', width: 10 }, { header: 'Total attendu', width: 18 },
    { header: 'Total perçu', width: 18 }, { header: 'Reste', width: 18 },
    { header: 'Taux', width: 10 },
  ])

  let grandAttendu = 0, grandPercu = 0
  classes.forEach((c, i) => {
    const attendu = c.nb_eleves * (c.frais_inscription + c.frais_scolarite_total)
    const percu = db.prepare(
      "SELECT COALESCE(SUM(p.montant_verse),0) as t FROM paiements p JOIN eleves e ON e.id=p.eleve_id WHERE e.classe_id=?"
    ).get(c.id).t
    const reste = attendu - percu
    const taux = attendu > 0 ? Math.round((percu / attendu) * 100) : 0
    grandAttendu += attendu; grandPercu += percu

    const row = ws.addRow([
      c.libelle, c.niveau, c.nb_eleves,
      formatFCFA(attendu), formatFCFA(percu), formatFCFA(reste), `${taux}%`
    ])
    if (i % 2 === 0) row.eachCell(cell => { cell.fill = ACCENT_FILL })
    row.eachCell(cell => { cell.border = ALL_BORDERS })
  })

  const totRow = ws.addRow([
    'TOTAL', '', '',
    formatFCFA(grandAttendu), formatFCFA(grandPercu),
    formatFCFA(grandAttendu - grandPercu),
    `${grandAttendu > 0 ? Math.round((grandPercu / grandAttendu) * 100) : 0}%`
  ])
  totRow.font = { bold: true }
  totRow.eachCell(cell => { cell.fill = HEADER_FILL; cell.font = { ...HEADER_FONT } })

  return saveWorkbook(wb, `synthese_paiements_${annee.libelle}.xlsx`)
}

async function retards(anneeId) {
  const db = getDb()
  const annee = db.prepare('SELECT * FROM annees_scolaires WHERE id=?').get(anneeId)
  const today = new Date().toISOString().split('T')[0]

  const data = db.prepare(
    `SELECT e.matricule, e.nom, e.prenom, c.libelle as classe, ts.libelle as tranche,
            ts.date_echeance, ts.montant,
            COALESCE(SUM(p.montant_verse),0) as montant_paye,
            (ts.montant - COALESCE(SUM(p.montant_verse),0)) as retard
     FROM eleves e JOIN classes c ON c.id=e.classe_id
     CROSS JOIN tranches_scolarite ts ON ts.classe_id=e.classe_id
     LEFT JOIN paiements p ON p.eleve_id=e.id AND p.tranche_scolarite_id=ts.id
     WHERE e.annee_scolaire_id=? AND e.statut='actif' AND ts.date_echeance < ?
     GROUP BY e.id, ts.id
     HAVING retard > 0
     ORDER BY c.libelle, e.nom`
  ).all(anneeId, today)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Retards de paiement')

  ws.mergeCells('A1:G1')
  ws.getCell('A1').value = `Élèves en retard de paiement — ${annee.libelle} (au ${today})`
  ws.getCell('A1').font = { bold: true, size: 13 }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.addRow([])

  applyHeaderRow(ws, [
    { header: 'Matricule', width: 15 }, { header: 'Nom', width: 15 },
    { header: 'Prénom', width: 15 }, { header: 'Classe', width: 15 },
    { header: 'Tranche', width: 18 }, { header: 'Échéance', width: 12 },
    { header: 'Montant dû', width: 15 },
  ])

  data.forEach(r => {
    const row = ws.addRow([
      r.matricule, r.nom, r.prenom, r.classe, r.tranche, r.date_echeance, formatFCFA(r.retard)
    ])
    row.eachCell(cell => { cell.border = ALL_BORDERS })
    row.getCell(7).font = { color: { argb: 'FFDC2626' } }
  })

  return saveWorkbook(wb, `retards_${annee.libelle}.xlsx`)
}

async function resultatsClasse(classeId, trimestre, anneeId) {
  const db = getDb()
  const classe = db.prepare('SELECT * FROM classes WHERE id=?').get(classeId)
  const annee  = db.prepare('SELECT * FROM annees_scolaires WHERE id=?').get(anneeId)
  const { getMoyennesClasse } = require('./notesService')
  const resultats = getMoyennesClasse(classeId, trimestre, anneeId)
    .sort((a, b) => (b.moyenne_generale || 0) - (a.moyenne_generale || 0))

  const matieres = db.prepare(
    `SELECT DISTINCT m.id, m.libelle, m.code FROM evaluations ev
     JOIN matieres m ON m.id=ev.matiere_id
     WHERE ev.classe_id=? AND ev.trimestre=?`
  ).all(classeId, trimestre)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(`Résultats T${trimestre}`)

  ws.mergeCells('A1:' + String.fromCharCode(65 + matieres.length + 3) + '1')
  ws.getCell('A1').value = `Résultats ${classe.libelle} — Trimestre ${trimestre} — ${annee.libelle}`
  ws.getCell('A1').font = { bold: true, size: 13 }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.addRow([])

  applyHeaderRow(ws, [
    { header: 'Rang', width: 6 }, { header: 'Élève', width: 25 },
    ...matieres.map(m => ({ header: m.code, width: 8 })),
    { header: 'Moy. Gén.', width: 12 },
    { header: 'Mention', width: 14 },
  ])

  resultats.forEach((e, i) => {
    const moy = e.moyenne_generale
    const mention = moy == null ? '-' : moy >= 16 ? 'Très Bien' : moy >= 14 ? 'Bien' :
      moy >= 12 ? 'Assez Bien' : moy >= 10 ? 'Passable' : 'Insuffisant'

    const row = ws.addRow([
      i + 1,
      `${e.nom} ${e.prenom}`,
      ...matieres.map(m => {
        const v = e.moyennesParMatiere[m.id]
        return v != null ? v : ''
      }),
      moy != null ? moy : '',
      mention,
    ])
    if (moy != null && moy < 10) {
      row.getCell(matieres.length + 3).font = { color: { argb: 'FFDC2626' }, bold: true }
    } else if (moy != null && moy >= 14) {
      row.getCell(matieres.length + 3).font = { color: { argb: 'FF16A34A' }, bold: true }
    }
    row.eachCell(cell => { cell.border = ALL_BORDERS })
  })

  return saveWorkbook(wb, `resultats_${classe.libelle.replace(/\s/g, '_')}_T${trimestre}_${annee.libelle}.xlsx`)
}

async function listeEleves(classeId, anneeId) {
  const db = getDb()
  const classe = db.prepare('SELECT * FROM classes WHERE id=?').get(classeId)
  const annee  = db.prepare('SELECT * FROM annees_scolaires WHERE id=?').get(anneeId)
  const eleves = db.prepare(
    "SELECT * FROM eleves WHERE classe_id=? AND annee_scolaire_id=? AND statut='actif' ORDER BY nom"
  ).all(classeId, anneeId)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(`Liste ${classe.libelle}`)

  ws.mergeCells('A1:H1')
  ws.getCell('A1').value = `Liste des élèves — ${classe.libelle} — ${annee.libelle}`
  ws.getCell('A1').font = { bold: true, size: 13 }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.addRow([])

  applyHeaderRow(ws, [
    { header: 'N°', width: 5 }, { header: 'Matricule', width: 15 },
    { header: 'Nom', width: 18 }, { header: 'Prénom', width: 18 },
    { header: 'Sexe', width: 8 }, { header: 'Date naissance', width: 15 },
    { header: 'Tuteur', width: 20 }, { header: 'Téléphone', width: 15 },
  ])

  eleves.forEach((e, i) => {
    const row = ws.addRow([
      i + 1, e.matricule, e.nom, e.prenom, e.sexe,
      e.date_naissance || '', e.nom_tuteur || '', e.telephone_tuteur || '',
    ])
    if (i % 2 === 0) row.eachCell(cell => { cell.fill = ACCENT_FILL })
    row.eachCell(cell => { cell.border = ALL_BORDERS })
  })

  return saveWorkbook(wb, `eleves_${classe.libelle.replace(/\s/g, '_')}_${annee.libelle}.xlsx`)
}

async function listeProfesseurs(anneeId) {
  const db = getDb()
  const annee = db.prepare('SELECT * FROM annees_scolaires WHERE id=?').get(anneeId)
  const profs = db.prepare(
    `SELECT p.*, GROUP_CONCAT(DISTINCT m.libelle) as matieres_enseignees
     FROM professeurs p
     LEFT JOIN enseignements en ON en.professeur_id=p.id AND en.annee_scolaire_id=?
     LEFT JOIN matieres m ON m.id=en.matiere_id
     WHERE p.actif=1
     GROUP BY p.id ORDER BY p.nom`
  ).all(anneeId)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Liste professeurs')

  ws.mergeCells('A1:G1')
  ws.getCell('A1').value = `Liste des professeurs — ${annee.libelle}`
  ws.getCell('A1').font = { bold: true, size: 13 }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.addRow([])

  applyHeaderRow(ws, [
    { header: 'Matricule', width: 15 }, { header: 'Nom', width: 18 },
    { header: 'Prénom', width: 18 }, { header: 'Sexe', width: 8 },
    { header: 'Téléphone', width: 15 }, { header: 'Spécialité', width: 20 },
    { header: 'Matières enseignées', width: 35 },
  ])

  profs.forEach((p, i) => {
    const row = ws.addRow([
      p.matricule, p.nom, p.prenom, p.sexe,
      p.telephone || '', p.specialite || '', p.matieres_enseignees || '',
    ])
    if (i % 2 === 0) row.eachCell(cell => { cell.fill = ACCENT_FILL })
    row.eachCell(cell => { cell.border = ALL_BORDERS })
  })

  return saveWorkbook(wb, `professeurs_${annee.libelle}.xlsx`)
}

module.exports = {
  etatPaiementClasse, etatPaiementGlobal, retards, resultatsClasse,
  listeEleves, listeProfesseurs,
}

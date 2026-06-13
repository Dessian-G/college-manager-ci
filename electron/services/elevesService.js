const { getDb } = require('../database/db')

function getAll(filters = {}) {
  const db = getDb()
  let sql = `
    SELECT e.*,
           c.libelle as classe_libelle, c.niveau,
           a.libelle as annee_libelle
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    LEFT JOIN annees_scolaires a ON a.id = e.annee_scolaire_id
    WHERE 1=1`

  const params = []
  if (filters.annee_scolaire_id) {
    sql += ' AND e.annee_scolaire_id = ?'
    params.push(filters.annee_scolaire_id)
  }
  if (filters.classe_id) {
    sql += ' AND e.classe_id = ?'
    params.push(filters.classe_id)
  }
  if (filters.statut) {
    sql += ' AND e.statut = ?'
    params.push(filters.statut)
  }
  if (filters.search) {
    sql += ' AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ?)'
    const s = `%${filters.search}%`
    params.push(s, s, s)
  }
  sql += ' ORDER BY e.nom, e.prenom'

  return db.prepare(sql).all(...params)
}

function getById(id) {
  return getDb().prepare(
    `SELECT e.*, c.libelle as classe_libelle, c.niveau, c.frais_inscription, c.frais_scolarite_total,
            a.libelle as annee_libelle
     FROM eleves e
     LEFT JOIN classes c ON c.id = e.classe_id
     LEFT JOIN annees_scolaires a ON a.id = e.annee_scolaire_id
     WHERE e.id = ?`
  ).get(id)
}

function getNextMatricule(db, anneeId) {
  const annee = db.prepare('SELECT libelle FROM annees_scolaires WHERE id=?').get(anneeId)
  const year = annee ? annee.libelle.split('-')[0] : new Date().getFullYear()
  const last = db.prepare(
    "SELECT matricule FROM eleves WHERE matricule LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`ELV-${year}-%`)
  if (!last) return `ELV-${year}-0001`
  const num = parseInt(last.matricule.split('-').pop(), 10) + 1
  return `ELV-${year}-${String(num).padStart(4, '0')}`
}

function create(data) {
  const db = getDb()
  const matricule = data.matricule || getNextMatricule(db, data.annee_scolaire_id)
  try {
    const r = db.prepare(
      `INSERT INTO eleves (matricule, nom, prenom, sexe, date_naissance, lieu_naissance,
                           classe_id, annee_scolaire_id, nom_tuteur, telephone_tuteur,
                           adresse, boursier, montant_exonere, statut)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'actif')`
    ).run(
      matricule, data.nom, data.prenom, data.sexe,
      data.date_naissance || null, data.lieu_naissance || null,
      data.classe_id, data.annee_scolaire_id,
      data.nom_tuteur || null, data.telephone_tuteur || null,
      data.adresse || null,
      data.boursier ? 1 : 0,
      data.montant_exonere || 0
    )
    return { success: true, id: r.lastInsertRowid, matricule }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'Ce matricule existe déjà' }
    return { success: false, error: err.message }
  }
}

function update(id, data) {
  try {
    getDb().prepare(
      `UPDATE eleves SET nom=?, prenom=?, sexe=?, date_naissance=?, lieu_naissance=?,
                         classe_id=?, nom_tuteur=?, telephone_tuteur=?, adresse=?,
                         boursier=?, montant_exonere=?, statut=? WHERE id=?`
    ).run(
      data.nom, data.prenom, data.sexe,
      data.date_naissance || null, data.lieu_naissance || null,
      data.classe_id,
      data.nom_tuteur || null, data.telephone_tuteur || null,
      data.adresse || null,
      data.boursier ? 1 : 0,
      data.montant_exonere || 0,
      data.statut || 'actif', id
    )
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

function deleteEleve(id) {
  getDb().prepare("UPDATE eleves SET statut='parti' WHERE id=?").run(id)
  return { success: true }
}

function getSituationPaiement(eleveId) {
  const db = getDb()
  const eleve = db.prepare(
    'SELECT e.*, c.frais_inscription, c.frais_scolarite_total FROM eleves e LEFT JOIN classes c ON c.id=e.classe_id WHERE e.id=?'
  ).get(eleveId)
  if (!eleve) return null

  const tranches = db.prepare(
    `SELECT ts.*,
            COALESCE(SUM(p.montant_verse),0) as montant_paye,
            CASE WHEN COALESCE(SUM(p.montant_verse),0) >= ts.montant THEN 1 ELSE 0 END as payee
     FROM tranches_scolarite ts
     LEFT JOIN paiements p ON p.tranche_scolarite_id = ts.id AND p.eleve_id = ?
     WHERE ts.classe_id = ?
     GROUP BY ts.id
     ORDER BY ts.numero_tranche`
  ).all(eleveId, eleve.classe_id)

  const totalPaye = tranches.reduce((s, t) => s + t.montant_paye, 0)
  const totalDu = (eleve.frais_inscription || 0) + (eleve.frais_scolarite_total || 0) - (eleve.montant_exonere || 0)
  const resteAPayer = Math.max(0, totalDu - totalPaye)

  return { eleve, tranches, totalPaye, totalDu, resteAPayer }
}

function getHistoriqueNotes(eleveId, anneeId) {
  return getDb().prepare(
    `SELECT n.*, ev.libelle as eval_libelle, ev.type as eval_type, ev.trimestre, ev.note_sur,
            ev.date as eval_date,
            m.libelle as matiere_libelle, m.code as matiere_code,
            en.coefficient
     FROM notes n
     JOIN evaluations ev ON ev.id = n.evaluation_id
     JOIN matieres m ON m.id = ev.matiere_id
     LEFT JOIN enseignements en ON en.matiere_id = ev.matiere_id AND en.classe_id = ev.classe_id
                                AND en.annee_scolaire_id = ?
     WHERE n.eleve_id = ?
     ORDER BY ev.trimestre, m.libelle, ev.date`
  ).all(anneeId, eleveId)
}

module.exports = {
  getAll, getById, create, update, delete: deleteEleve,
  getSituationPaiement, getHistoriqueNotes,
}

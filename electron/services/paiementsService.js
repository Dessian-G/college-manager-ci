const { getDb } = require('../database/db')

function getNextRecuNum(db) {
  const year = new Date().getFullYear()
  const last = db.prepare(
    "SELECT recu_numero FROM paiements WHERE recu_numero LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`REC-${year}-%`)
  if (!last) return `REC-${year}-0001`
  const num = parseInt(last.recu_numero.split('-').pop(), 10) + 1
  return `REC-${year}-${String(num).padStart(4, '0')}`
}

function enregistrer(data) {
  const db = getDb()
  const recuNum = data.recu_numero || getNextRecuNum(db)
  try {
    const r = db.prepare(
      `INSERT INTO paiements (eleve_id, tranche_scolarite_id, montant_verse, mode_paiement,
                              reference, date_paiement, recu_numero, encaisse_par)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(
      data.eleve_id, data.tranche_scolarite_id, data.montant_verse,
      data.mode_paiement, data.reference || null,
      data.date_paiement || new Date().toISOString().split('T')[0],
      recuNum, data.encaisse_par
    )
    return { success: true, id: r.lastInsertRowid, recu_numero: recuNum }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'Numéro de reçu déjà utilisé' }
    return { success: false, error: err.message }
  }
}

function getById(id) {
  return getDb().prepare(
    `SELECT p.*,
            e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule as eleve_matricule,
            ts.libelle as tranche_libelle, ts.numero_tranche,
            c.libelle as classe_libelle,
            u.nom as encaisseur_nom, u.prenom as encaisseur_prenom
     FROM paiements p
     JOIN eleves e ON e.id = p.eleve_id
     JOIN tranches_scolarite ts ON ts.id = p.tranche_scolarite_id
     JOIN classes c ON c.id = ts.classe_id
     LEFT JOIN utilisateurs u ON u.id = p.encaisse_par
     WHERE p.id = ?`
  ).get(id)
}

function getHistorique(eleveId) {
  return getDb().prepare(
    `SELECT p.*,
            ts.libelle as tranche_libelle, ts.numero_tranche,
            u.nom as encaisseur_nom, u.prenom as encaisseur_prenom
     FROM paiements p
     JOIN tranches_scolarite ts ON ts.id = p.tranche_scolarite_id
     LEFT JOIN utilisateurs u ON u.id = p.encaisse_par
     WHERE p.eleve_id = ?
     ORDER BY p.date_paiement DESC`
  ).all(eleveId)
}

function getByClasse(classeId, anneeId) {
  const db = getDb()
  return db.prepare(
    `SELECT e.id as eleve_id, e.matricule, e.nom, e.prenom, e.boursier, e.montant_exonere,
            ts.id as tranche_id, ts.numero_tranche, ts.libelle as tranche_libelle, ts.montant,
            ts.date_echeance,
            COALESCE(SUM(p.montant_verse),0) as montant_paye,
            CASE WHEN COALESCE(SUM(p.montant_verse),0) >= ts.montant THEN 1 ELSE 0 END as payee
     FROM eleves e
     CROSS JOIN tranches_scolarite ts
     LEFT JOIN paiements p ON p.eleve_id = e.id AND p.tranche_scolarite_id = ts.id
     WHERE e.classe_id = ? AND e.annee_scolaire_id = ? AND e.statut='actif'
       AND ts.classe_id = ?
     GROUP BY e.id, ts.id
     ORDER BY e.nom, e.prenom, ts.numero_tranche`
  ).all(classeId, anneeId, classeId)
}

function getRetards(anneeId) {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]
  return db.prepare(
    `SELECT e.id as eleve_id, e.matricule, e.nom as eleve_nom, e.prenom as eleve_prenom,
            c.libelle as classe_libelle, c.id as classe_id,
            ts.libelle as tranche_libelle, ts.date_echeance, ts.montant,
            COALESCE(SUM(p.montant_verse),0) as montant_paye
     FROM eleves e
     JOIN classes c ON c.id = e.classe_id
     CROSS JOIN tranches_scolarite ts ON ts.classe_id = e.classe_id
     LEFT JOIN paiements p ON p.eleve_id = e.id AND p.tranche_scolarite_id = ts.id
     WHERE e.annee_scolaire_id = ? AND e.statut='actif'
       AND ts.date_echeance < ?
     GROUP BY e.id, ts.id
     HAVING montant_paye < ts.montant
     ORDER BY ts.date_echeance, c.libelle, e.nom`
  ).all(anneeId, today)
}

function getDashboardStats(anneeId) {
  const db = getDb()
  const totalAttendu = db.prepare(
    `SELECT COALESCE(SUM(c.frais_inscription + c.frais_scolarite_total),0) as total
     FROM eleves e JOIN classes c ON c.id=e.classe_id
     WHERE e.annee_scolaire_id=? AND e.statut='actif'`
  ).get(anneeId)

  const totalPercu = db.prepare(
    `SELECT COALESCE(SUM(p.montant_verse),0) as total
     FROM paiements p
     JOIN eleves e ON e.id = p.eleve_id
     WHERE e.annee_scolaire_id=?`
  ).get(anneeId)

  return {
    total_attendu: totalAttendu.total,
    total_percu: totalPercu.total,
    taux_recouvrement: totalAttendu.total > 0
      ? Math.round((totalPercu.total / totalAttendu.total) * 100)
      : 0,
  }
}

module.exports = {
  enregistrer, getById, getHistorique, getByClasse, getRetards, getDashboardStats,
}

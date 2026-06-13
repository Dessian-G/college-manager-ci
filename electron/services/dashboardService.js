const { getDb } = require('../database/db')

function getStats(anneeId) {
  const db = getDb()

  const nbEleves = db.prepare(
    "SELECT COUNT(*) as n FROM eleves WHERE annee_scolaire_id=? AND statut='actif'"
  ).get(anneeId)

  const nbClasses = db.prepare(
    'SELECT COUNT(*) as n FROM classes WHERE annee_scolaire_id=?'
  ).get(anneeId)

  const nbProfs = db.prepare(
    'SELECT COUNT(DISTINCT professeur_id) as n FROM enseignements WHERE annee_scolaire_id=?'
  ).get(anneeId)

  const totalAttendu = db.prepare(
    `SELECT COALESCE(SUM(c.frais_inscription + c.frais_scolarite_total),0) as total
     FROM eleves e JOIN classes c ON c.id=e.classe_id
     WHERE e.annee_scolaire_id=? AND e.statut='actif'`
  ).get(anneeId)

  const totalPercu = db.prepare(
    `SELECT COALESCE(SUM(p.montant_verse),0) as total
     FROM paiements p JOIN eleves e ON e.id=p.eleve_id
     WHERE e.annee_scolaire_id=?`
  ).get(anneeId)

  const tauxRecouvrement = totalAttendu.total > 0
    ? Math.round((totalPercu.total / totalAttendu.total) * 100)
    : 0

  return {
    nb_eleves: nbEleves.n,
    nb_classes: nbClasses.n,
    nb_professeurs: nbProfs.n,
    total_attendu: totalAttendu.total,
    total_percu: totalPercu.total,
    taux_recouvrement: tauxRecouvrement,
    reste_a_percevoir: totalAttendu.total - totalPercu.total,
  }
}

function getDerniersPaiements(anneeId, limit = 10) {
  return getDb().prepare(
    `SELECT p.*, e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule as eleve_matricule,
            c.libelle as classe_libelle, ts.libelle as tranche_libelle
     FROM paiements p
     JOIN eleves e ON e.id = p.eleve_id
     JOIN tranches_scolarite ts ON ts.id = p.tranche_scolarite_id
     JOIN classes c ON c.id = ts.classe_id
     WHERE e.annee_scolaire_id = ?
     ORDER BY p.date_paiement DESC, p.id DESC
     LIMIT ?`
  ).all(anneeId, limit)
}

function getProchainesEcheances(anneeId, limit = 10) {
  const today = new Date().toISOString().split('T')[0]
  const inMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  return getDb().prepare(
    `SELECT ts.*, c.libelle as classe_libelle,
            COUNT(DISTINCT e.id) as nb_eleves_concernes,
            COALESCE(SUM(
              CASE WHEN EXISTS(
                SELECT 1 FROM paiements p2
                WHERE p2.tranche_scolarite_id=ts.id
                GROUP BY p2.eleve_id
                HAVING SUM(p2.montant_verse) >= ts.montant
              ) THEN 1 ELSE 0 END
            ), 0) as nb_payes
     FROM tranches_scolarite ts
     JOIN classes c ON c.id = ts.classe_id AND c.annee_scolaire_id = ?
     JOIN eleves e ON e.classe_id = c.id AND e.statut='actif'
     WHERE ts.date_echeance BETWEEN ? AND ?
     GROUP BY ts.id
     ORDER BY ts.date_echeance
     LIMIT ?`
  ).all(anneeId, today, inMonth, limit)
}

function getRecouvrementParClasse(anneeId) {
  return getDb().prepare(
    `SELECT c.id, c.libelle, c.niveau,
            COUNT(DISTINCT e.id) as nb_eleves,
            COALESCE(SUM(c.frais_inscription + c.frais_scolarite_total),0) as total_attendu,
            COALESCE((
              SELECT SUM(p.montant_verse) FROM paiements p
              JOIN eleves e2 ON e2.id=p.eleve_id WHERE e2.classe_id=c.id
            ),0) as total_percu
     FROM classes c
     LEFT JOIN eleves e ON e.classe_id=c.id AND e.statut='actif' AND e.annee_scolaire_id=?
     WHERE c.annee_scolaire_id=?
     GROUP BY c.id
     ORDER BY c.niveau, c.libelle`
  ).all(anneeId, anneeId)
}

function getPaiementsParMode(anneeId) {
  return getDb().prepare(
    `SELECT p.mode_paiement, SUM(p.montant_verse) as total, COUNT(*) as nb
     FROM paiements p JOIN eleves e ON e.id=p.eleve_id
     WHERE e.annee_scolaire_id=?
     GROUP BY p.mode_paiement
     ORDER BY total DESC`
  ).all(anneeId)
}

function getStatsProfesseur(profId, anneeId) {
  const db = getDb()
  const classes = db.prepare(
    `SELECT DISTINCT c.id, c.libelle, c.niveau, m.libelle as matiere_libelle, m.id as matiere_id
     FROM enseignements en
     JOIN classes c ON c.id=en.classe_id
     JOIN matieres m ON m.id=en.matiere_id
     WHERE en.professeur_id=? AND en.annee_scolaire_id=?`
  ).all(profId, anneeId)

  const nbEvals = db.prepare(
    'SELECT COUNT(*) as n FROM evaluations WHERE professeur_id=?'
  ).get(profId)

  return { classes, nb_evaluations: nbEvals.n }
}

module.exports = {
  getStats, getDerniersPaiements, getProchainesEcheances,
  getRecouvrementParClasse, getPaiementsParMode, getStatsProfesseur,
}

const { getDb } = require('../database/db')

// ─── Années scolaires ───────────────────────────────────────────────────────

function getAllAnnees() {
  return getDb().prepare('SELECT * FROM annees_scolaires ORDER BY date_debut DESC').all()
}

function getAnneeActive() {
  return getDb().prepare('SELECT * FROM annees_scolaires WHERE active=1 LIMIT 1').get()
}

function createAnnee(data) {
  try {
    const r = getDb().prepare(
      'INSERT INTO annees_scolaires (libelle, date_debut, date_fin, active) VALUES (?,?,?,0)'
    ).run(data.libelle, data.date_debut, data.date_fin)
    return { success: true, id: r.lastInsertRowid }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

function activerAnnee(id) {
  const db = getDb()
  db.prepare('UPDATE annees_scolaires SET active=0').run()
  db.prepare('UPDATE annees_scolaires SET active=1 WHERE id=?').run(id)
  return { success: true }
}

function updateAnnee(id, data) {
  getDb().prepare(
    'UPDATE annees_scolaires SET libelle=?, date_debut=?, date_fin=? WHERE id=?'
  ).run(data.libelle, data.date_debut, data.date_fin, id)
  return { success: true }
}

// ─── Classes ─────────────────────────────────────────────────────────────────

function getAll(anneeId) {
  const db = getDb()
  const query = `
    SELECT c.*,
           a.libelle as annee_libelle,
           p.nom as prof_principal_nom, p.prenom as prof_principal_prenom,
           COUNT(DISTINCT e.id) as nb_eleves
    FROM classes c
    JOIN annees_scolaires a ON a.id = c.annee_scolaire_id
    LEFT JOIN professeurs p ON p.id = c.professeur_principal_id
    LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut='actif'
    WHERE c.annee_scolaire_id = ?
    GROUP BY c.id
    ORDER BY c.niveau, c.libelle`
  return db.prepare(query).all(anneeId)
}

function getById(id) {
  return getDb().prepare('SELECT * FROM classes WHERE id=?').get(id)
}

function create(data) {
  try {
    const r = getDb().prepare(
      `INSERT INTO classes (libelle, niveau, annee_scolaire_id, effectif_max, professeur_principal_id,
                            frais_inscription, frais_scolarite_total)
       VALUES (?,?,?,?,?,?,?)`
    ).run(
      data.libelle, data.niveau, data.annee_scolaire_id,
      data.effectif_max || 50,
      data.professeur_principal_id || null,
      data.frais_inscription || 0,
      data.frais_scolarite_total || 0
    )
    return { success: true, id: r.lastInsertRowid }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

function update(id, data) {
  try {
    getDb().prepare(
      `UPDATE classes SET libelle=?, niveau=?, effectif_max=?, professeur_principal_id=?,
                          frais_inscription=?, frais_scolarite_total=? WHERE id=?`
    ).run(
      data.libelle, data.niveau,
      data.effectif_max || 50,
      data.professeur_principal_id || null,
      data.frais_inscription || 0,
      data.frais_scolarite_total || 0,
      id
    )
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

function deleteClasse(id) {
  const db = getDb()
  const nb = db.prepare('SELECT COUNT(*) as n FROM eleves WHERE classe_id=?').get(id)
  if (nb.n > 0) return { success: false, error: 'Cette classe contient des élèves' }
  db.prepare('DELETE FROM classes WHERE id=?').run(id)
  return { success: true }
}

function getTranches(classeId) {
  return getDb()
    .prepare('SELECT * FROM tranches_scolarite WHERE classe_id=? ORDER BY numero_tranche')
    .all(classeId)
}

function saveTranches(classeId, tranches) {
  const db = getDb()
  const deleteOld = db.prepare('DELETE FROM tranches_scolarite WHERE classe_id=?')
  const insert = db.prepare(
    `INSERT INTO tranches_scolarite (classe_id, numero_tranche, libelle, montant, date_echeance)
     VALUES (?,?,?,?,?)`
  )
  const tx = db.transaction(() => {
    deleteOld.run(classeId)
    tranches.forEach(t => insert.run(classeId, t.numero_tranche, t.libelle, t.montant, t.date_echeance))
  })
  tx()
  return { success: true }
}

module.exports = {
  getAllAnnees, getAnneeActive, createAnnee, activerAnnee, updateAnnee,
  getAll, getById, create, update, delete: deleteClasse, getTranches, saveTranches,
}

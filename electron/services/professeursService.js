const bcrypt = require('bcryptjs')
const { getDb } = require('../database/db')

function getAll() {
  return getDb().prepare(
    `SELECT p.*,
            u.login, u.actif as compte_actif, u.id as user_id
     FROM professeurs p
     LEFT JOIN utilisateurs u ON u.professeur_id = p.id
     WHERE p.actif=1
     ORDER BY p.nom, p.prenom`
  ).all()
}

function getById(id) {
  return getDb().prepare('SELECT * FROM professeurs WHERE id=?').get(id)
}

function create(data) {
  try {
    const r = getDb().prepare(
      `INSERT INTO professeurs (matricule, nom, prenom, sexe, telephone, email, specialite, date_embauche)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(
      data.matricule, data.nom, data.prenom, data.sexe,
      data.telephone || null, data.email || null,
      data.specialite || null, data.date_embauche || null
    )
    return { success: true, id: r.lastInsertRowid }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'Ce matricule existe déjà' }
    return { success: false, error: err.message }
  }
}

function update(id, data) {
  try {
    getDb().prepare(
      `UPDATE professeurs SET nom=?, prenom=?, sexe=?, telephone=?, email=?, specialite=?, date_embauche=?
       WHERE id=?`
    ).run(
      data.nom, data.prenom, data.sexe,
      data.telephone || null, data.email || null,
      data.specialite || null, data.date_embauche || null, id
    )
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

function deleteProf(id) {
  const db = getDb()
  const nb = db.prepare('SELECT COUNT(*) as n FROM enseignements WHERE professeur_id=?').get(id)
  if (nb.n > 0) return { success: false, error: 'Ce professeur a des enseignements affectés' }
  db.prepare('UPDATE professeurs SET actif=0 WHERE id=?').run(id)
  return { success: true }
}

function getEnseignements(profId) {
  return getDb().prepare(
    `SELECT e.*, m.libelle as matiere_libelle, m.code as matiere_code,
            c.libelle as classe_libelle, c.niveau,
            a.libelle as annee_libelle
     FROM enseignements e
     JOIN matieres m ON m.id = e.matiere_id
     JOIN classes c ON c.id = e.classe_id
     JOIN annees_scolaires a ON a.id = e.annee_scolaire_id
     WHERE e.professeur_id = ?
     ORDER BY a.date_debut DESC, c.niveau, m.libelle`
  ).all(profId)
}

function addEnseignement(data) {
  try {
    const r = getDb().prepare(
      `INSERT INTO enseignements (professeur_id, matiere_id, classe_id, annee_scolaire_id, coefficient)
       VALUES (?,?,?,?,?)`
    ).run(data.professeur_id, data.matiere_id, data.classe_id, data.annee_scolaire_id, data.coefficient || 1)
    return { success: true, id: r.lastInsertRowid }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'Cet enseignement existe déjà' }
    return { success: false, error: err.message }
  }
}

function removeEnseignement(id) {
  getDb().prepare('DELETE FROM enseignements WHERE id=?').run(id)
  return { success: true }
}

function createCompte(profId, login, password) {
  const db = getDb()
  const prof = db.prepare('SELECT * FROM professeurs WHERE id=?').get(profId)
  if (!prof) return { success: false, error: 'Professeur introuvable' }

  const hash = bcrypt.hashSync(password, 10)
  try {
    const r = db.prepare(
      `INSERT INTO utilisateurs (nom, prenom, login, mot_de_passe_hash, role, professeur_id)
       VALUES (?,?,?,?,'professeur',?)`
    ).run(prof.nom, prof.prenom, login, hash, profId)
    return { success: true, id: r.lastInsertRowid }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'Ce login existe déjà' }
    return { success: false, error: err.message }
  }
}

module.exports = {
  getAll, getById, create, update, delete: deleteProf,
  getEnseignements, addEnseignement, removeEnseignement, createCompte,
}

const bcrypt = require('bcryptjs')
const { getDb } = require('../database/db')

function login(login, password) {
  const db = getDb()
  const user = db.prepare(
    `SELECT u.*, p.matricule as prof_matricule
     FROM utilisateurs u
     LEFT JOIN professeurs p ON p.id = u.professeur_id
     WHERE u.login = ? AND u.actif = 1`
  ).get(login)

  if (!user) return { success: false, error: 'Identifiants incorrects' }

  const valid = bcrypt.compareSync(password, user.mot_de_passe_hash)
  if (!valid) return { success: false, error: 'Identifiants incorrects' }

  db.prepare("UPDATE utilisateurs SET derniere_connexion = datetime('now','localtime') WHERE id = ?").run(user.id)

  const { mot_de_passe_hash, ...userSafe } = user
  return { success: true, user: userSafe }
}

function changePassword(userId, oldPassword, newPassword) {
  const db = getDb()
  const user = db.prepare('SELECT * FROM utilisateurs WHERE id = ?').get(userId)
  if (!user) return { success: false, error: 'Utilisateur introuvable' }

  const valid = bcrypt.compareSync(oldPassword, user.mot_de_passe_hash)
  if (!valid) return { success: false, error: 'Ancien mot de passe incorrect' }

  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE utilisateurs SET mot_de_passe_hash = ? WHERE id = ?').run(hash, userId)
  return { success: true }
}

function getAllUtilisateurs() {
  const db = getDb()
  return db.prepare(
    `SELECT u.id, u.nom, u.prenom, u.login, u.role, u.actif, u.date_creation, u.derniere_connexion,
            p.nom as prof_nom, p.prenom as prof_prenom
     FROM utilisateurs u
     LEFT JOIN professeurs p ON p.id = u.professeur_id
     ORDER BY u.role, u.nom`
  ).all()
}

function createUtilisateur(data) {
  const db = getDb()
  const hash = bcrypt.hashSync(data.password, 10)
  const stmt = db.prepare(
    `INSERT INTO utilisateurs (nom, prenom, login, mot_de_passe_hash, role, professeur_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  try {
    const result = stmt.run(data.nom, data.prenom, data.login, hash, data.role, data.professeur_id || null)
    return { success: true, id: result.lastInsertRowid }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'Ce login existe déjà' }
    return { success: false, error: err.message }
  }
}

function updateUtilisateur(id, data) {
  const db = getDb()
  db.prepare('UPDATE utilisateurs SET nom=?, prenom=?, login=?, actif=? WHERE id=?')
    .run(data.nom, data.prenom, data.login, data.actif ? 1 : 0, id)
  return { success: true }
}

function desactiverUtilisateur(id) {
  const db = getDb()
  db.prepare('UPDATE utilisateurs SET actif = 0 WHERE id = ?').run(id)
  return { success: true }
}

function resetPassword(id, newPassword) {
  const db = getDb()
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE utilisateurs SET mot_de_passe_hash = ? WHERE id = ?').run(hash, id)
  return { success: true }
}

function register(data) {
  const db = getDb()
  const hash = bcrypt.hashSync(data.password, 10)
  const repHash = data.reponse_secrete ? bcrypt.hashSync(data.reponse_secrete.toLowerCase().trim(), 10) : null
  try {
    const r = db.prepare(
      `INSERT INTO utilisateurs (nom, prenom, login, mot_de_passe_hash, role, question_secrete, reponse_secrete_hash)
       VALUES (?, ?, ?, ?, 'professeur', ?, ?)`
    ).run(data.nom, data.prenom, data.login, hash, data.question_secrete || null, repHash)
    return { success: true, id: r.lastInsertRowid }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'Ce login est déjà utilisé' }
    return { success: false, error: err.message }
  }
}

function getQuestionSecrete(login) {
  const db = getDb()
  const user = db.prepare('SELECT question_secrete FROM utilisateurs WHERE login=? AND actif=1').get(login)
  if (!user) return { success: false, error: 'Compte introuvable' }
  if (!user.question_secrete) return { success: false, error: 'Aucune question secrète définie pour ce compte' }
  return { success: true, question: user.question_secrete }
}

function resetPasswordByQuestion(login, reponse, newPassword) {
  const db = getDb()
  const user = db.prepare('SELECT * FROM utilisateurs WHERE login=? AND actif=1').get(login)
  if (!user) return { success: false, error: 'Compte introuvable' }
  if (!user.reponse_secrete_hash) return { success: false, error: 'Aucune question secrète définie pour ce compte' }
  const valid = bcrypt.compareSync(reponse.toLowerCase().trim(), user.reponse_secrete_hash)
  if (!valid) return { success: false, error: 'Réponse incorrecte' }
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE utilisateurs SET mot_de_passe_hash=? WHERE id=?').run(hash, user.id)
  return { success: true }
}

module.exports = {
  login,
  changePassword,
  register,
  getQuestionSecrete,
  resetPasswordByQuestion,
  getAllUtilisateurs,
  createUtilisateur,
  updateUtilisateur,
  desactiverUtilisateur,
  resetPassword,
}

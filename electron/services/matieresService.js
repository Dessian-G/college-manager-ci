const { getDb } = require('../database/db')

function getAll() {
  return getDb().prepare('SELECT * FROM matieres ORDER BY libelle').all()
}

function create(data) {
  try {
    const r = getDb().prepare(
      'INSERT INTO matieres (code, libelle, coefficient_defaut) VALUES (?, ?, ?)'
    ).run(data.code.toUpperCase(), data.libelle, data.coefficient_defaut || 1)
    return { success: true, id: r.lastInsertRowid }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'Ce code matière existe déjà' }
    return { success: false, error: err.message }
  }
}

function update(id, data) {
  try {
    getDb().prepare(
      'UPDATE matieres SET code=?, libelle=?, coefficient_defaut=? WHERE id=?'
    ).run(data.code.toUpperCase(), data.libelle, data.coefficient_defaut || 1, id)
    return { success: true }
  } catch (err) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'Ce code matière existe déjà' }
    return { success: false, error: err.message }
  }
}

function deleteMatiere(id) {
  const db = getDb()
  const used = db.prepare('SELECT COUNT(*) as n FROM enseignements WHERE matiere_id=?').get(id)
  if (used.n > 0) return { success: false, error: 'Cette matière est utilisée dans des enseignements' }
  db.prepare('DELETE FROM matieres WHERE id=?').run(id)
  return { success: true }
}

module.exports = { getAll, create, update, delete: deleteMatiere }

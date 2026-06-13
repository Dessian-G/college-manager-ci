const path = require('path')
const fs = require('fs')
const { getDb, getDbPath } = require('../database/db')

function get() {
  return getDb().prepare('SELECT * FROM parametres WHERE id=1').get()
}

function save(data) {
  getDb().prepare(
    `UPDATE parametres SET nom_etablissement=?, adresse=?, telephone=?, ville=?, logo_path=?
     WHERE id=1`
  ).run(
    data.nom_etablissement, data.adresse || '',
    data.telephone || '', data.ville || '',
    data.logo_path || ''
  )
  return { success: true }
}

function sauvegarderDB() {
  const dbPath = getDbPath()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupPath = dbPath.replace('.db', `_backup_${timestamp}.db`)
  try {
    fs.copyFileSync(dbPath, backupPath)
    return { success: true, path: backupPath }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

function restaurerDB(filePath) {
  const dbPath = getDbPath()
  if (!filePath || !fs.existsSync(filePath)) {
    return { success: false, error: 'Fichier introuvable' }
  }
  try {
    fs.copyFileSync(filePath, dbPath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

module.exports = { get, save, sauvegarderDB, restaurerDB }

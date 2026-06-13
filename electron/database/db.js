const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db = null

function getDbPath() {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'college_manager.db')
}

function getDb() {
  if (!db) throw new Error('Base de données non initialisée')
  return db
}

function initDatabase() {
  const Database = require('better-sqlite3')
  const dbPath = getDbPath()

  console.log('Chemin DB:', dbPath)

  db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null })

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Appliquer le schéma
  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  db.exec(schema)

  // Initialiser les paramètres si absent
  const params = db.prepare('SELECT id FROM parametres WHERE id = 1').get()
  if (!params) {
    db.prepare(`INSERT INTO parametres (id, nom_etablissement, ville)
                VALUES (1, 'Mon Établissement', 'Abidjan')`).run()
  }

  // Migrations : ajout de colonnes si absentes
  try { db.exec('ALTER TABLE utilisateurs ADD COLUMN question_secrete TEXT') } catch (_) {}
  try { db.exec('ALTER TABLE utilisateurs ADD COLUMN reponse_secrete_hash TEXT') } catch (_) {}

  // Seed si la base est vide
  const adminExists = db.prepare("SELECT id FROM utilisateurs WHERE role = 'admin' LIMIT 1").get()
  if (!adminExists) {
    const { seedDatabase } = require('./seed')
    seedDatabase(db)
  }

  return db
}

function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

module.exports = { initDatabase, getDb, getDbPath, closeDatabase }

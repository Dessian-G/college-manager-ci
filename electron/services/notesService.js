const { getDb } = require('../database/db')

function getEvaluations(classeId, matiereId, trimestre) {
  const db = getDb()
  let sql = `
    SELECT ev.*, m.libelle as matiere_libelle,
           p.nom as prof_nom, p.prenom as prof_prenom,
           COUNT(n.id) as nb_notes
    FROM evaluations ev
    JOIN matieres m ON m.id = ev.matiere_id
    LEFT JOIN professeurs p ON p.id = ev.professeur_id
    LEFT JOIN notes n ON n.evaluation_id = ev.id
    WHERE ev.classe_id = ?`
  const params = [classeId]

  if (matiereId) { sql += ' AND ev.matiere_id = ?'; params.push(matiereId) }
  if (trimestre)  { sql += ' AND ev.trimestre = ?';  params.push(trimestre) }

  sql += ' GROUP BY ev.id ORDER BY ev.trimestre, ev.date DESC'
  return db.prepare(sql).all(...params)
}

function createEvaluation(data) {
  try {
    const r = getDb().prepare(
      `INSERT INTO evaluations (libelle, type, matiere_id, classe_id, professeur_id, trimestre, note_sur, date)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(
      data.libelle, data.type, data.matiere_id, data.classe_id,
      data.professeur_id || null, data.trimestre,
      data.note_sur || 20,
      data.date || new Date().toISOString().split('T')[0]
    )
    return { success: true, id: r.lastInsertRowid }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

function saveNotes(evaluationId, notes) {
  const db = getDb()
  const upsert = db.prepare(
    `INSERT INTO notes (evaluation_id, eleve_id, valeur, observation)
     VALUES (?,?,?,?)
     ON CONFLICT(evaluation_id, eleve_id) DO UPDATE SET valeur=excluded.valeur, observation=excluded.observation`
  )
  const tx = db.transaction(() => {
    notes.forEach(n => upsert.run(evaluationId, n.eleve_id, n.valeur, n.observation || null))
  })
  tx()
  return { success: true }
}

function getNotesByEleve(eleveId, classeId, trimestre) {
  return getDb().prepare(
    `SELECT n.*, ev.libelle as eval_libelle, ev.type, ev.trimestre, ev.note_sur, ev.date as eval_date,
            m.libelle as matiere_libelle, m.code as matiere_code,
            COALESCE(en.coefficient, m.coefficient_defaut) as coefficient
     FROM notes n
     JOIN evaluations ev ON ev.id = n.evaluation_id
     JOIN matieres m ON m.id = ev.matiere_id
     LEFT JOIN enseignements en ON en.matiere_id = ev.matiere_id AND en.classe_id = ev.classe_id
     WHERE n.eleve_id = ? AND ev.classe_id = ? AND ev.trimestre = ?
     ORDER BY m.libelle, ev.date`
  ).all(eleveId, classeId, trimestre)
}

function getMoyennesClasse(classeId, trimestre, anneeId) {
  const db = getDb()
  const eleves = db.prepare(
    "SELECT * FROM eleves WHERE classe_id=? AND annee_scolaire_id=? AND statut='actif' ORDER BY nom"
  ).all(classeId, anneeId)

  const matieres = db.prepare(
    `SELECT DISTINCT m.id, m.libelle, m.code, COALESCE(en.coefficient, m.coefficient_defaut) as coefficient
     FROM evaluations ev
     JOIN matieres m ON m.id = ev.matiere_id
     LEFT JOIN enseignements en ON en.matiere_id = m.id AND en.classe_id = ev.classe_id
     WHERE ev.classe_id = ? AND ev.trimestre = ?`
  ).all(classeId, trimestre)

  return eleves.map(eleve => {
    let totalPoints = 0, totalCoefs = 0
    const moyennesParMatiere = {}

    matieres.forEach(mat => {
      const notes = db.prepare(
        `SELECT n.valeur, ev.note_sur FROM notes n
         JOIN evaluations ev ON ev.id = n.evaluation_id
         WHERE n.eleve_id = ? AND ev.matiere_id = ? AND ev.classe_id = ? AND ev.trimestre = ?`
      ).all(eleve.id, mat.id, classeId, trimestre)

      if (notes.length === 0) {
        moyennesParMatiere[mat.id] = null
        return
      }

      const moy = notes.reduce((s, n) => s + (n.valeur / n.note_sur) * 20, 0) / notes.length
      moyennesParMatiere[mat.id] = Math.round(moy * 100) / 100
      totalPoints += moy * mat.coefficient
      totalCoefs += mat.coefficient
    })

    const moyenne_generale = totalCoefs > 0 ? Math.round((totalPoints / totalCoefs) * 100) / 100 : null

    return { ...eleve, moyennesParMatiere, moyenne_generale }
  })
}

function getBulletin(eleveId, trimestre, anneeId) {
  const db = getDb()
  const eleve = db.prepare(
    `SELECT e.*, c.libelle as classe_libelle, c.niveau
     FROM eleves e LEFT JOIN classes c ON c.id=e.classe_id
     WHERE e.id=?`
  ).get(eleveId)
  if (!eleve) return null

  const matieres = db.prepare(
    `SELECT DISTINCT m.id, m.libelle, m.code, COALESCE(en.coefficient, m.coefficient_defaut) as coefficient,
            p.nom as prof_nom, p.prenom as prof_prenom
     FROM evaluations ev
     JOIN matieres m ON m.id = ev.matiere_id
     LEFT JOIN enseignements en ON en.matiere_id = m.id AND en.classe_id = ev.classe_id
                                AND en.annee_scolaire_id = ?
     LEFT JOIN professeurs p ON p.id = en.professeur_id
     WHERE ev.classe_id = ? AND ev.trimestre = ?`
  ).all(anneeId, eleve.classe_id, trimestre)

  let totalPoints = 0, totalCoefs = 0
  const lignes = matieres.map(mat => {
    const notes = db.prepare(
      `SELECT n.valeur, ev.note_sur, ev.type, ev.libelle
       FROM notes n JOIN evaluations ev ON ev.id=n.evaluation_id
       WHERE n.eleve_id=? AND ev.matiere_id=? AND ev.classe_id=? AND ev.trimestre=?`
    ).all(eleveId, mat.id, eleve.classe_id, trimestre)

    if (notes.length === 0) return { ...mat, notes: [], moyenne: null }

    const moyenne = notes.reduce((s, n) => s + (n.valeur / n.note_sur) * 20, 0) / notes.length
    const moyRounded = Math.round(moyenne * 100) / 100
    totalPoints += moyRounded * mat.coefficient
    totalCoefs += mat.coefficient

    return { ...mat, notes, moyenne: moyRounded }
  })

  const moyenne_generale = totalCoefs > 0 ? Math.round((totalPoints / totalCoefs) * 100) / 100 : null

  // Rang dans la classe
  const classeMoyennes = getMoyennesClasse(eleve.classe_id, trimestre, anneeId)
  const sorted = classeMoyennes
    .filter(e => e.moyenne_generale !== null)
    .sort((a, b) => b.moyenne_generale - a.moyenne_generale)
  const rang = sorted.findIndex(e => e.id === eleveId) + 1

  return { eleve, lignes, moyenne_generale, rang, nb_eleves: sorted.length, trimestre, anneeId }
}

function deleteEvaluation(id) {
  getDb().prepare('DELETE FROM evaluations WHERE id=?').run(id)
  return { success: true }
}

module.exports = {
  getEvaluations, createEvaluation, saveNotes,
  getNotesByEleve, getMoyennesClasse, getBulletin, deleteEvaluation,
}

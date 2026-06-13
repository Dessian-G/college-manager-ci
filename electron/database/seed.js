const bcrypt = require('bcryptjs')

function seedDatabase(db) {
  console.log('Initialisation des données de démonstration...')

  // Année scolaire active
  const anneeId = db.prepare(
    `INSERT INTO annees_scolaires (libelle, date_debut, date_fin, active)
     VALUES ('2024-2025', '2024-09-01', '2025-06-30', 1)`
  ).run().lastInsertRowid

  // Compte admin
  const adminHash = bcrypt.hashSync('admin123', 10)
  db.prepare(
    `INSERT INTO utilisateurs (nom, prenom, login, mot_de_passe_hash, role)
     VALUES ('Administrateur', 'Système', 'admin', ?, 'admin')`
  ).run(adminHash)

  // Matières standard ivoiriennes
  const matieresSeed = [
    { code: 'MATH', libelle: 'Mathématiques', coef: 4 },
    { code: 'FR',   libelle: 'Français',       coef: 4 },
    { code: 'ANG',  libelle: 'Anglais',         coef: 3 },
    { code: 'PC',   libelle: 'Physique-Chimie', coef: 3 },
    { code: 'SVT',  libelle: 'Sciences de la Vie et de la Terre', coef: 2 },
    { code: 'HG',   libelle: 'Histoire-Géographie', coef: 2 },
    { code: 'EPS',  libelle: 'Éducation Physique et Sportive', coef: 1 },
    { code: 'ICT',  libelle: 'Informatique',    coef: 2 },
    { code: 'ESP',  libelle: 'Espagnol',         coef: 2 },
    { code: 'EC',   libelle: 'Éducation Civique', coef: 1 },
    { code: 'PHILO', libelle: 'Philosophie',    coef: 3 },
    { code: 'ECO',  libelle: 'Sciences Économiques', coef: 3 },
  ]
  const insertMatiere = db.prepare(
    `INSERT INTO matieres (code, libelle, coefficient_defaut) VALUES (?, ?, ?)`
  )
  matieresSeed.forEach(m => insertMatiere.run(m.code, m.libelle, m.coef))

  // 4 Professeurs démo
  const profs = [
    { mat: 'PROF-0001', nom: 'Kouassi', prenom: 'Jean-Baptiste', sexe: 'M', tel: '07 01 23 45', spec: 'Mathématiques' },
    { mat: 'PROF-0002', nom: 'Bah',     prenom: 'Fatoumata',     sexe: 'F', tel: '05 34 56 78', spec: 'Français' },
    { mat: 'PROF-0003', nom: 'Traoré',  prenom: 'Moussa',        sexe: 'M', tel: '01 45 67 89', spec: 'Physique-Chimie' },
    { mat: 'PROF-0004', nom: 'Konan',   prenom: 'Awa',           sexe: 'F', tel: '07 78 90 12', spec: 'Anglais' },
  ]
  const insertProf = db.prepare(
    `INSERT INTO professeurs (matricule, nom, prenom, sexe, telephone, specialite, date_embauche, actif)
     VALUES (?, ?, ?, ?, ?, ?, '2024-09-01', 1)`
  )
  const profIds = profs.map(p => insertProf.run(p.mat, p.nom, p.prenom, p.sexe, p.tel, p.spec).lastInsertRowid)

  // Comptes de connexion pour les profs
  const profHash = bcrypt.hashSync('prof123', 10)
  profIds.forEach((pid, i) => {
    db.prepare(
      `INSERT INTO utilisateurs (nom, prenom, login, mot_de_passe_hash, role, professeur_id)
       VALUES (?, ?, ?, ?, 'professeur', ?)`
    ).run(profs[i].nom, profs[i].prenom, `prof${i + 1}`, profHash, pid)
  })

  // 5 Classes avec leurs tranches
  const classesData = [
    { libelle: '6ème A', niveau: '6ème', inscription: 25000, total: 150000 },
    { libelle: '5ème A', niveau: '5ème', inscription: 25000, total: 150000 },
    { libelle: '4ème A', niveau: '4ème', inscription: 30000, total: 180000 },
    { libelle: '3ème A', niveau: '3ème', inscription: 30000, total: 180000 },
    { libelle: 'Terminale D', niveau: 'Terminale', inscription: 40000, total: 240000 },
  ]

  const insertClasse = db.prepare(
    `INSERT INTO classes (libelle, niveau, annee_scolaire_id, effectif_max, frais_inscription, frais_scolarite_total)
     VALUES (?, ?, ?, 45, ?, ?)`
  )
  const insertTranche = db.prepare(
    `INSERT INTO tranches_scolarite (classe_id, numero_tranche, libelle, montant, date_echeance)
     VALUES (?, ?, ?, ?, ?)`
  )

  const classeIds = classesData.map(c => {
    const classeId = insertClasse.run(c.libelle, c.niveau, anneeId, c.inscription, c.total).lastInsertRowid

    // Inscription + 3 tranches
    const resteApresInscription = c.total - c.inscription
    const tranche = Math.floor(resteApresInscription / 3)

    insertTranche.run(classeId, 0, 'Inscription', c.inscription, '2024-09-30')
    insertTranche.run(classeId, 1, '1ère tranche', tranche, '2024-11-30')
    insertTranche.run(classeId, 2, '2ème tranche', tranche, '2025-02-28')
    insertTranche.run(classeId, 3, '3ème tranche', resteApresInscription - tranche * 2, '2025-04-30')

    return classeId
  })

  // Affectations prof → matière → classe
  const mathId = db.prepare("SELECT id FROM matieres WHERE code='MATH'").get().id
  const frId   = db.prepare("SELECT id FROM matieres WHERE code='FR'").get().id
  const pcId   = db.prepare("SELECT id FROM matieres WHERE code='PC'").get().id
  const angId  = db.prepare("SELECT id FROM matieres WHERE code='ANG'").get().id

  const insertEns = db.prepare(
    `INSERT OR IGNORE INTO enseignements (professeur_id, matiere_id, classe_id, annee_scolaire_id, coefficient)
     VALUES (?, ?, ?, ?, ?)`
  )

  classeIds.forEach(cid => {
    insertEns.run(profIds[0], mathId, cid, anneeId, 4)
    insertEns.run(profIds[1], frId,   cid, anneeId, 4)
    insertEns.run(profIds[2], pcId,   cid, anneeId, 3)
    insertEns.run(profIds[3], angId,  cid, anneeId, 3)
  })

  // 20 élèves démo répartis dans les classes
  const prenoms = ['Koffi','Ama','Kouamé','Adjoua','Yao','Akissi','Konan','Amenan','Brou','Affoue',
                   'Séraphin','Mariam','Désiré','Edwige','Prosper','Carine','Théodore','Raïssa','Elvis','Sandra']
  const noms = ['Kouassi','Bah','Yao','Touré','Gnagna','Kobenan','Assouman','N\'Guessan','Dago','Kpan']

  const insertEleve = db.prepare(
    `INSERT INTO eleves (matricule, nom, prenom, sexe, date_naissance, classe_id, annee_scolaire_id, nom_tuteur, telephone_tuteur, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif')`
  )

  const adminId = db.prepare("SELECT id FROM utilisateurs WHERE role='admin' LIMIT 1").get().id

  const insertPaiement = db.prepare(
    `INSERT INTO paiements (eleve_id, tranche_scolarite_id, montant_verse, mode_paiement, date_paiement, recu_numero, encaisse_par)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  let recuCounter = 1
  for (let i = 0; i < 20; i++) {
    const classeIdx = i % 5
    const classeId = classeIds[classeIdx]
    const prenom = prenoms[i]
    const nom = noms[i % 10]
    const sexe = i % 2 === 0 ? 'M' : 'F'
    const annee = 2010 - Math.floor(i / 4)
    const matricule = `ELV-2024-${String(i + 1).padStart(4, '0')}`

    const eleveId = insertEleve.run(
      matricule, nom, prenom, sexe,
      `${annee}-${String((i % 12) + 1).padStart(2, '0')}-15`,
      classeId, anneeId,
      `Parent de ${prenom}`, `07 ${String(10 + i).padStart(2, '0')} ${String(20 + i).padStart(2, '0')} ${String(30 + i).padStart(2, '0')}`,
    ).lastInsertRowid

    // Quelques élèves ont payé l'inscription
    if (i < 16) {
      const tranche0 = db.prepare('SELECT id, montant FROM tranches_scolarite WHERE classe_id=? AND numero_tranche=0').get(classeId)
      const modes = ['especes','orange_money','mtn_money','wave']
      const recuNum = `REC-2024-${String(recuCounter++).padStart(4, '0')}`
      insertPaiement.run(eleveId, tranche0.id, tranche0.montant, modes[i % 4], '2024-09-15', recuNum, adminId)
    }

    // Certains ont payé la 1ère tranche
    if (i < 10) {
      const tranche1 = db.prepare('SELECT id, montant FROM tranches_scolarite WHERE classe_id=? AND numero_tranche=1').get(classeId)
      const recuNum = `REC-2024-${String(recuCounter++).padStart(4, '0')}`
      insertPaiement.run(eleveId, tranche1.id, tranche1.montant, 'especes', '2024-11-20', recuNum, adminId)
    }
  }

  console.log('Données de démonstration insérées avec succès.')
  console.log('Compte admin: login=admin, mot de passe=admin123')
  console.log('Comptes profs: login=prof1/prof2/prof3/prof4, mot de passe=prof123')
}

module.exports = { seedDatabase }

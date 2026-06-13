PRAGMA foreign_keys = ON;

-- Années scolaires
CREATE TABLE IF NOT EXISTS annees_scolaires (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle   TEXT NOT NULL,
  date_debut TEXT,
  date_fin  TEXT,
  active    INTEGER DEFAULT 0
);

-- Utilisateurs (admin + profs)
CREATE TABLE IF NOT EXISTS utilisateurs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  nom                TEXT NOT NULL,
  prenom             TEXT NOT NULL,
  login              TEXT NOT NULL UNIQUE,
  mot_de_passe_hash  TEXT NOT NULL,
  role               TEXT NOT NULL CHECK(role IN ('admin','professeur')),
  professeur_id      INTEGER REFERENCES professeurs(id) ON DELETE SET NULL,
  actif              INTEGER DEFAULT 1,
  date_creation      TEXT DEFAULT (datetime('now','localtime')),
  derniere_connexion TEXT
);

-- Professeurs
CREATE TABLE IF NOT EXISTS professeurs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  matricule      TEXT NOT NULL UNIQUE,
  nom            TEXT NOT NULL,
  prenom         TEXT NOT NULL,
  sexe           TEXT CHECK(sexe IN ('M','F')),
  telephone      TEXT,
  email          TEXT,
  specialite     TEXT,
  date_embauche  TEXT,
  actif          INTEGER DEFAULT 1
);

-- Matières
CREATE TABLE IF NOT EXISTS matieres (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  code                TEXT NOT NULL UNIQUE,
  libelle             TEXT NOT NULL,
  coefficient_defaut  INTEGER DEFAULT 1
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle                 TEXT NOT NULL,
  niveau                  TEXT NOT NULL,
  annee_scolaire_id       INTEGER NOT NULL REFERENCES annees_scolaires(id),
  effectif_max            INTEGER DEFAULT 50,
  professeur_principal_id INTEGER REFERENCES professeurs(id) ON DELETE SET NULL,
  frais_inscription       INTEGER DEFAULT 0,
  frais_scolarite_total   INTEGER DEFAULT 0
);

-- Tranches de scolarité (échéancier par classe)
CREATE TABLE IF NOT EXISTS tranches_scolarite (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  classe_id       INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  numero_tranche  INTEGER NOT NULL,
  libelle         TEXT NOT NULL,
  montant         INTEGER NOT NULL DEFAULT 0,
  date_echeance   TEXT
);

-- Élèves
CREATE TABLE IF NOT EXISTS eleves (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  matricule          TEXT NOT NULL UNIQUE,
  nom                TEXT NOT NULL,
  prenom             TEXT NOT NULL,
  sexe               TEXT CHECK(sexe IN ('M','F')),
  date_naissance     TEXT,
  lieu_naissance     TEXT,
  classe_id          INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  annee_scolaire_id  INTEGER NOT NULL REFERENCES annees_scolaires(id),
  nom_tuteur         TEXT,
  telephone_tuteur   TEXT,
  adresse            TEXT,
  date_inscription   TEXT DEFAULT (date('now','localtime')),
  photo              TEXT,
  boursier           INTEGER DEFAULT 0,
  montant_exonere    INTEGER DEFAULT 0,
  statut             TEXT DEFAULT 'actif' CHECK(statut IN ('actif','parti','exclu'))
);

-- Affectations prof → matière → classe
CREATE TABLE IF NOT EXISTS enseignements (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  professeur_id     INTEGER NOT NULL REFERENCES professeurs(id) ON DELETE CASCADE,
  matiere_id        INTEGER NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
  classe_id         INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  coefficient       INTEGER DEFAULT 1,
  UNIQUE(professeur_id, matiere_id, classe_id, annee_scolaire_id)
);

-- Évaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  libelle       TEXT NOT NULL,
  type          TEXT NOT NULL CHECK(type IN ('interrogation','devoir','composition')),
  matiere_id    INTEGER NOT NULL REFERENCES matieres(id),
  classe_id     INTEGER NOT NULL REFERENCES classes(id),
  professeur_id INTEGER REFERENCES professeurs(id),
  trimestre     INTEGER NOT NULL CHECK(trimestre IN (1,2,3)),
  note_sur      INTEGER DEFAULT 20,
  date          TEXT DEFAULT (date('now','localtime'))
);

-- Notes des élèves
CREATE TABLE IF NOT EXISTS notes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id  INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  eleve_id       INTEGER NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  valeur         REAL NOT NULL,
  observation    TEXT,
  UNIQUE(evaluation_id, eleve_id)
);

-- Paiements de scolarité
CREATE TABLE IF NOT EXISTS paiements (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id              INTEGER NOT NULL REFERENCES eleves(id),
  tranche_scolarite_id  INTEGER NOT NULL REFERENCES tranches_scolarite(id),
  montant_verse         INTEGER NOT NULL,
  mode_paiement         TEXT NOT NULL CHECK(mode_paiement IN ('especes','orange_money','mtn_money','moov_money','wave','virement','cheque')),
  reference             TEXT,
  date_paiement         TEXT DEFAULT (datetime('now','localtime')),
  recu_numero           TEXT NOT NULL UNIQUE,
  encaisse_par          INTEGER REFERENCES utilisateurs(id)
);

-- Paramètres de l'établissement
CREATE TABLE IF NOT EXISTS parametres (
  id        INTEGER PRIMARY KEY CHECK(id = 1),
  nom_etablissement TEXT DEFAULT 'Mon Établissement',
  adresse   TEXT DEFAULT '',
  telephone TEXT DEFAULT '',
  ville     TEXT DEFAULT 'Abidjan',
  logo_path TEXT DEFAULT ''
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_eleves_classe ON eleves(classe_id);
CREATE INDEX IF NOT EXISTS idx_eleves_annee ON eleves(annee_scolaire_id);
CREATE INDEX IF NOT EXISTS idx_paiements_eleve ON paiements(eleve_id);
CREATE INDEX IF NOT EXISTS idx_paiements_tranche ON paiements(tranche_scolarite_id);
CREATE INDEX IF NOT EXISTS idx_notes_evaluation ON notes(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_notes_eleve ON notes(eleve_id);
CREATE INDEX IF NOT EXISTS idx_enseignements_prof ON enseignements(professeur_id);
CREATE INDEX IF NOT EXISTS idx_enseignements_classe ON enseignements(classe_id);

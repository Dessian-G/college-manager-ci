// Thin wrapper: maps api.xxx() calls to window.api IPC calls exposed by preload.js
const api = window.api

export const auth = {
  login:                  (login, password)          => api.invoke('auth:login', login, password),
  changePassword:         (id, old_, new_)           => api.invoke('auth:changePassword', id, old_, new_),
  register:               (data)                     => api.invoke('auth:register', data),
  getQuestionSecrete:     (login)                    => api.invoke('auth:getQuestionSecrete', login),
  resetPasswordByQuestion:(login, reponse, newPwd)   => api.invoke('auth:resetPasswordByQuestion', login, reponse, newPwd),
}

export const annees = {
  getAll:    ()         => api.invoke('annees:getAll'),
  getActive: ()         => api.invoke('annees:getActive'),
  create:    (data)     => api.invoke('annees:create', data),
  activate:  (id)       => api.invoke('annees:activate', id),
  update:    (id, data) => api.invoke('annees:update', id, data),
}

export const matieres = {
  getAll:  ()         => api.invoke('matieres:getAll'),
  create:  (data)     => api.invoke('matieres:create', data),
  update:  (id, data) => api.invoke('matieres:update', id, data),
  delete:  (id)       => api.invoke('matieres:delete', id),
}

export const classes = {
  getAll:      (anneeId)          => api.invoke('classes:getAll', anneeId),
  getById:     (id)               => api.invoke('classes:getById', id),
  create:      (data)             => api.invoke('classes:create', data),
  update:      (id, data)         => api.invoke('classes:update', id, data),
  delete:      (id)               => api.invoke('classes:delete', id),
  getTranches: (classeId)         => api.invoke('classes:getTranches', classeId),
  saveTranches:(classeId, t)      => api.invoke('classes:saveTranches', classeId, t),
}

export const professeurs = {
  getAll:           ()                    => api.invoke('professeurs:getAll'),
  getById:          (id)                  => api.invoke('professeurs:getById', id),
  create:           (data)                => api.invoke('professeurs:create', data),
  update:           (id, data)            => api.invoke('professeurs:update', id, data),
  delete:           (id)                  => api.invoke('professeurs:delete', id),
  getEnseignements: (profId)              => api.invoke('professeurs:getEnseignements', profId),
  addEnseignement:  (data)               => api.invoke('professeurs:addEnseignement', data),
  removeEnseignement:(id)                => api.invoke('professeurs:removeEnseignement', id),
  createCompte:     (profId, login, pwd)  => api.invoke('professeurs:createCompte', profId, login, pwd),
}

export const eleves = {
  getAll:               (filters)         => api.invoke('eleves:getAll', filters),
  getById:              (id)              => api.invoke('eleves:getById', id),
  create:               (data)            => api.invoke('eleves:create', data),
  update:               (id, data)        => api.invoke('eleves:update', id, data),
  delete:               (id)              => api.invoke('eleves:delete', id),
  getSituationPaiement: (id)              => api.invoke('eleves:getSituationPaiement', id),
  getHistoriqueNotes:   (id, anneeId)     => api.invoke('eleves:getHistoriqueNotes', id, anneeId),
}

export const paiements = {
  enregistrer:       (data)              => api.invoke('paiements:enregistrer', data),
  getById:           (id)               => api.invoke('paiements:getById', id),
  getHistorique:     (eleveId)          => api.invoke('paiements:getHistorique', eleveId),
  getByClasse:       (classeId, anneeId)=> api.invoke('paiements:getByClasse', classeId, anneeId),
  getRetards:        (anneeId)          => api.invoke('paiements:getRetards', anneeId),
  getDashboardStats: (anneeId)          => api.invoke('paiements:getDashboardStats', anneeId),
}

export const notes = {
  getEvaluations:    (classeId, matId, trim) => api.invoke('notes:getEvaluations', classeId, matId, trim),
  createEvaluation:  (data)                  => api.invoke('notes:createEvaluation', data),
  saveNotes:         (evalId, notes)         => api.invoke('notes:saveNotes', evalId, notes),
  getNotesByEleve:   (eleveId, classeId, t)  => api.invoke('notes:getNotesByEleve', eleveId, classeId, t),
  getMoyennesClasse: (classeId, t, anneeId)  => api.invoke('notes:getMoyennesClasse', classeId, t, anneeId),
  getBulletin:       (eleveId, t, anneeId)   => api.invoke('notes:getBulletin', eleveId, t, anneeId),
  deleteEvaluation:  (id)                    => api.invoke('notes:deleteEvaluation', id),
}

export const exportXlsx = {
  etatPaiementClasse:  (cId, aId)          => api.invoke('export:etatPaiementClasse', cId, aId),
  etatPaiementGlobal:  (aId)               => api.invoke('export:etatPaiementGlobal', aId),
  retards:             (aId)               => api.invoke('export:retards', aId),
  resultatsClasse:     (cId, trim, aId)    => api.invoke('export:resultatsClasse', cId, trim, aId),
  listeEleves:         (cId, aId)          => api.invoke('export:listeEleves', cId, aId),
  listeProfesseurs:    (aId)               => api.invoke('export:listeProfesseurs', aId),
}

export const parametres = {
  get:          ()       => api.invoke('parametres:get'),
  save:         (data)   => api.invoke('parametres:save', data),
  sauvegarderDB:()       => api.invoke('parametres:sauvegarderDB'),
  restaurerDB:  (path)   => api.invoke('parametres:restaurerDB', path),
}

export const utilisateurs = {
  getAll:        ()         => api.invoke('utilisateurs:getAll'),
  create:        (data)     => api.invoke('utilisateurs:create', data),
  update:        (id, data) => api.invoke('utilisateurs:update', id, data),
  desactiver:    (id)       => api.invoke('utilisateurs:desactiver', id),
  resetPassword: (id, pwd)  => api.invoke('utilisateurs:resetPassword', id, pwd),
}

export const dashboard = {
  getStats:                (anneeId)        => api.invoke('dashboard:getStats', anneeId),
  getDerniersPaiements:    (anneeId, limit) => api.invoke('dashboard:getDerniersPaiements', anneeId, limit),
  getProchainesEcheances:  (anneeId, limit) => api.invoke('dashboard:getProchainesEcheances', anneeId, limit),
  getRecouvrementParClasse:(anneeId)        => api.invoke('dashboard:getRecouvrementParClasse', anneeId),
  getPaiementsParMode:     (anneeId)        => api.invoke('dashboard:getPaiementsParMode', anneeId),
  getStatsProfesseur:      (profId, anneeId)=> api.invoke('dashboard:getStatsProfesseur', profId, anneeId),
}

const { contextBridge, ipcRenderer } = require('electron')

// Expose des méthodes sécurisées au renderer via window.api
contextBridge.exposeInMainWorld('api', {
  // Méthode générique IPC — utilisée par src/api.js
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // Test
  ping: () => ipcRenderer.invoke('ping'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getDataPath: () => ipcRenderer.invoke('app:getDataPath'),

  // Dialogues système
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),

  // Authentification
  auth: {
    login: (login, password) => ipcRenderer.invoke('auth:login', login, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    changePassword: (userId, oldPassword, newPassword) =>
      ipcRenderer.invoke('auth:changePassword', userId, oldPassword, newPassword),
  },

  // Années scolaires
  annees: {
    getAll: () => ipcRenderer.invoke('annees:getAll'),
    getActive: () => ipcRenderer.invoke('annees:getActive'),
    create: (data) => ipcRenderer.invoke('annees:create', data),
    activate: (id) => ipcRenderer.invoke('annees:activate', id),
    update: (id, data) => ipcRenderer.invoke('annees:update', id, data),
  },

  // Matières
  matieres: {
    getAll: () => ipcRenderer.invoke('matieres:getAll'),
    create: (data) => ipcRenderer.invoke('matieres:create', data),
    update: (id, data) => ipcRenderer.invoke('matieres:update', id, data),
    delete: (id) => ipcRenderer.invoke('matieres:delete', id),
  },

  // Classes
  classes: {
    getAll: (anneeId) => ipcRenderer.invoke('classes:getAll', anneeId),
    getById: (id) => ipcRenderer.invoke('classes:getById', id),
    create: (data) => ipcRenderer.invoke('classes:create', data),
    update: (id, data) => ipcRenderer.invoke('classes:update', id, data),
    delete: (id) => ipcRenderer.invoke('classes:delete', id),
    getTranches: (classeId) => ipcRenderer.invoke('classes:getTranches', classeId),
    saveTranches: (classeId, tranches) => ipcRenderer.invoke('classes:saveTranches', classeId, tranches),
  },

  // Professeurs
  professeurs: {
    getAll: () => ipcRenderer.invoke('professeurs:getAll'),
    getById: (id) => ipcRenderer.invoke('professeurs:getById', id),
    create: (data) => ipcRenderer.invoke('professeurs:create', data),
    update: (id, data) => ipcRenderer.invoke('professeurs:update', id, data),
    delete: (id) => ipcRenderer.invoke('professeurs:delete', id),
    getEnseignements: (profId) => ipcRenderer.invoke('professeurs:getEnseignements', profId),
    addEnseignement: (data) => ipcRenderer.invoke('professeurs:addEnseignement', data),
    removeEnseignement: (id) => ipcRenderer.invoke('professeurs:removeEnseignement', id),
    createCompte: (profId, login, password) =>
      ipcRenderer.invoke('professeurs:createCompte', profId, login, password),
  },

  // Élèves
  eleves: {
    getAll: (filters) => ipcRenderer.invoke('eleves:getAll', filters),
    getById: (id) => ipcRenderer.invoke('eleves:getById', id),
    create: (data) => ipcRenderer.invoke('eleves:create', data),
    update: (id, data) => ipcRenderer.invoke('eleves:update', id, data),
    delete: (id) => ipcRenderer.invoke('eleves:delete', id),
    getSituationPaiement: (eleveId) => ipcRenderer.invoke('eleves:getSituationPaiement', eleveId),
    getHistoriqueNotes: (eleveId, anneeId) =>
      ipcRenderer.invoke('eleves:getHistoriqueNotes', eleveId, anneeId),
  },

  // Paiements
  paiements: {
    getByClasse: (classeId, anneeId) => ipcRenderer.invoke('paiements:getByClasse', classeId, anneeId),
    getRetards: (anneeId) => ipcRenderer.invoke('paiements:getRetards', anneeId),
    enregistrer: (data) => ipcRenderer.invoke('paiements:enregistrer', data),
    getById: (id) => ipcRenderer.invoke('paiements:getById', id),
    getHistorique: (eleveId) => ipcRenderer.invoke('paiements:getHistorique', eleveId),
    getDashboardStats: (anneeId) => ipcRenderer.invoke('paiements:getDashboardStats', anneeId),
  },

  // Notes & Évaluations
  notes: {
    getEvaluations: (classeId, matiereId, trimestre) =>
      ipcRenderer.invoke('notes:getEvaluations', classeId, matiereId, trimestre),
    createEvaluation: (data) => ipcRenderer.invoke('notes:createEvaluation', data),
    saveNotes: (evaluationId, notes) => ipcRenderer.invoke('notes:saveNotes', evaluationId, notes),
    getNotesByEleve: (eleveId, classeId, trimestre) =>
      ipcRenderer.invoke('notes:getNotesByEleve', eleveId, classeId, trimestre),
    getMoyennesClasse: (classeId, trimestre, anneeId) =>
      ipcRenderer.invoke('notes:getMoyennesClasse', classeId, trimestre, anneeId),
    getBulletin: (eleveId, trimestre, anneeId) =>
      ipcRenderer.invoke('notes:getBulletin', eleveId, trimestre, anneeId),
    deleteEvaluation: (id) => ipcRenderer.invoke('notes:deleteEvaluation', id),
  },

  // Export Excel
  export: {
    etatPaiementClasse: (classeId, anneeId) =>
      ipcRenderer.invoke('export:etatPaiementClasse', classeId, anneeId),
    etatPaiementGlobal: (anneeId) => ipcRenderer.invoke('export:etatPaiementGlobal', anneeId),
    retards: (anneeId) => ipcRenderer.invoke('export:retards', anneeId),
    resultatsClasse: (classeId, trimestre, anneeId) =>
      ipcRenderer.invoke('export:resultatsClasse', classeId, trimestre, anneeId),
    listeEleves: (classeId, anneeId) => ipcRenderer.invoke('export:listeEleves', classeId, anneeId),
    listeProfesseurs: (anneeId) => ipcRenderer.invoke('export:listeProfesseurs', anneeId),
  },

  // Paramètres
  parametres: {
    get: () => ipcRenderer.invoke('parametres:get'),
    save: (data) => ipcRenderer.invoke('parametres:save', data),
    sauvegarderDB: () => ipcRenderer.invoke('parametres:sauvegarderDB'),
    restaurerDB: (filePath) => ipcRenderer.invoke('parametres:restaurerDB', filePath),
  },

  // Utilisateurs
  utilisateurs: {
    getAll: () => ipcRenderer.invoke('utilisateurs:getAll'),
    create: (data) => ipcRenderer.invoke('utilisateurs:create', data),
    update: (id, data) => ipcRenderer.invoke('utilisateurs:update', id, data),
    desactiver: (id) => ipcRenderer.invoke('utilisateurs:desactiver', id),
    resetPassword: (id, newPassword) => ipcRenderer.invoke('utilisateurs:resetPassword', id, newPassword),
  },

  // Dashboard stats
  dashboard: {
    getStats: (anneeId) => ipcRenderer.invoke('dashboard:getStats', anneeId),
    getDerniersPaiements: (anneeId, limit) =>
      ipcRenderer.invoke('dashboard:getDerniersPaiements', anneeId, limit),
    getProchainesEcheances: (anneeId, limit) =>
      ipcRenderer.invoke('dashboard:getProchainesEcheances', anneeId, limit),
    getRecouvrementParClasse: (anneeId) =>
      ipcRenderer.invoke('dashboard:getRecouvrementParClasse', anneeId),
    getPaiementsParMode: (anneeId) =>
      ipcRenderer.invoke('dashboard:getPaiementsParMode', anneeId),
    getStatsProfesseur: (profId, anneeId) =>
      ipcRenderer.invoke('dashboard:getStatsProfesseur', profId, anneeId),
  },
})

const { ipcMain } = require('electron')
const authService = require('../services/authService')
const elevesService = require('../services/elevesService')
const professeursService = require('../services/professeursService')
const classesService = require('../services/classesService')
const matieresService = require('../services/matieresService')
const notesService = require('../services/notesService')
const paiementsService = require('../services/paiementsService')
const exportExcelService = require('../services/exportExcelService')
const parametresService = require('../services/parametresService')
const dashboardService = require('../services/dashboardService')

function registerHandlers() {
  // === AUTH ===
  ipcMain.handle('auth:login', (_, login, password) => authService.login(login, password))
  ipcMain.handle('auth:changePassword', (_, userId, oldPwd, newPwd) =>
    authService.changePassword(userId, oldPwd, newPwd))
  ipcMain.handle('auth:register', (_, data) => authService.register(data))
  ipcMain.handle('auth:getQuestionSecrete', (_, login) => authService.getQuestionSecrete(login))
  ipcMain.handle('auth:resetPasswordByQuestion', (_, login, reponse, newPwd) =>
    authService.resetPasswordByQuestion(login, reponse, newPwd))

  // === ANNÉES SCOLAIRES ===
  ipcMain.handle('annees:getAll', () => classesService.getAllAnnees())
  ipcMain.handle('annees:getActive', () => classesService.getAnneeActive())
  ipcMain.handle('annees:create', (_, data) => classesService.createAnnee(data))
  ipcMain.handle('annees:activate', (_, id) => classesService.activerAnnee(id))
  ipcMain.handle('annees:update', (_, id, data) => classesService.updateAnnee(id, data))

  // === MATIÈRES ===
  ipcMain.handle('matieres:getAll', () => matieresService.getAll())
  ipcMain.handle('matieres:create', (_, data) => matieresService.create(data))
  ipcMain.handle('matieres:update', (_, id, data) => matieresService.update(id, data))
  ipcMain.handle('matieres:delete', (_, id) => matieresService.delete(id))

  // === CLASSES ===
  ipcMain.handle('classes:getAll', (_, anneeId) => classesService.getAll(anneeId))
  ipcMain.handle('classes:getById', (_, id) => classesService.getById(id))
  ipcMain.handle('classes:create', (_, data) => classesService.create(data))
  ipcMain.handle('classes:update', (_, id, data) => classesService.update(id, data))
  ipcMain.handle('classes:delete', (_, id) => classesService.delete(id))
  ipcMain.handle('classes:getTranches', (_, classeId) => classesService.getTranches(classeId))
  ipcMain.handle('classes:saveTranches', (_, classeId, tranches) =>
    classesService.saveTranches(classeId, tranches))

  // === PROFESSEURS ===
  ipcMain.handle('professeurs:getAll', () => professeursService.getAll())
  ipcMain.handle('professeurs:getById', (_, id) => professeursService.getById(id))
  ipcMain.handle('professeurs:create', (_, data) => professeursService.create(data))
  ipcMain.handle('professeurs:update', (_, id, data) => professeursService.update(id, data))
  ipcMain.handle('professeurs:delete', (_, id) => professeursService.delete(id))
  ipcMain.handle('professeurs:getEnseignements', (_, profId) =>
    professeursService.getEnseignements(profId))
  ipcMain.handle('professeurs:addEnseignement', (_, data) =>
    professeursService.addEnseignement(data))
  ipcMain.handle('professeurs:removeEnseignement', (_, id) =>
    professeursService.removeEnseignement(id))
  ipcMain.handle('professeurs:createCompte', (_, profId, login, password) =>
    professeursService.createCompte(profId, login, password))

  // === ÉLÈVES ===
  ipcMain.handle('eleves:getAll', (_, filters) => elevesService.getAll(filters))
  ipcMain.handle('eleves:getById', (_, id) => elevesService.getById(id))
  ipcMain.handle('eleves:create', (_, data) => elevesService.create(data))
  ipcMain.handle('eleves:update', (_, id, data) => elevesService.update(id, data))
  ipcMain.handle('eleves:delete', (_, id) => elevesService.delete(id))
  ipcMain.handle('eleves:getSituationPaiement', (_, eleveId) =>
    elevesService.getSituationPaiement(eleveId))
  ipcMain.handle('eleves:getHistoriqueNotes', (_, eleveId, anneeId) =>
    elevesService.getHistoriqueNotes(eleveId, anneeId))

  // === PAIEMENTS ===
  ipcMain.handle('paiements:getByClasse', (_, classeId, anneeId) =>
    paiementsService.getByClasse(classeId, anneeId))
  ipcMain.handle('paiements:getRetards', (_, anneeId) => paiementsService.getRetards(anneeId))
  ipcMain.handle('paiements:enregistrer', (_, data) => paiementsService.enregistrer(data))
  ipcMain.handle('paiements:getById', (_, id) => paiementsService.getById(id))
  ipcMain.handle('paiements:getHistorique', (_, eleveId) => paiementsService.getHistorique(eleveId))
  ipcMain.handle('paiements:getDashboardStats', (_, anneeId) =>
    paiementsService.getDashboardStats(anneeId))

  // === NOTES ===
  ipcMain.handle('notes:getEvaluations', (_, classeId, matiereId, trimestre) =>
    notesService.getEvaluations(classeId, matiereId, trimestre))
  ipcMain.handle('notes:createEvaluation', (_, data) => notesService.createEvaluation(data))
  ipcMain.handle('notes:saveNotes', (_, evaluationId, notes) =>
    notesService.saveNotes(evaluationId, notes))
  ipcMain.handle('notes:getNotesByEleve', (_, eleveId, classeId, trimestre) =>
    notesService.getNotesByEleve(eleveId, classeId, trimestre))
  ipcMain.handle('notes:getMoyennesClasse', (_, classeId, trimestre, anneeId) =>
    notesService.getMoyennesClasse(classeId, trimestre, anneeId))
  ipcMain.handle('notes:getBulletin', (_, eleveId, trimestre, anneeId) =>
    notesService.getBulletin(eleveId, trimestre, anneeId))
  ipcMain.handle('notes:deleteEvaluation', (_, id) => notesService.deleteEvaluation(id))

  // === EXPORT EXCEL ===
  ipcMain.handle('export:etatPaiementClasse', (_, classeId, anneeId) =>
    exportExcelService.etatPaiementClasse(classeId, anneeId))
  ipcMain.handle('export:etatPaiementGlobal', (_, anneeId) =>
    exportExcelService.etatPaiementGlobal(anneeId))
  ipcMain.handle('export:retards', (_, anneeId) => exportExcelService.retards(anneeId))
  ipcMain.handle('export:resultatsClasse', (_, classeId, trimestre, anneeId) =>
    exportExcelService.resultatsClasse(classeId, trimestre, anneeId))
  ipcMain.handle('export:listeEleves', (_, classeId, anneeId) =>
    exportExcelService.listeEleves(classeId, anneeId))
  ipcMain.handle('export:listeProfesseurs', (_, anneeId) =>
    exportExcelService.listeProfesseurs(anneeId))

  // === PARAMÈTRES ===
  ipcMain.handle('parametres:get', () => parametresService.get())
  ipcMain.handle('parametres:save', (_, data) => parametresService.save(data))
  ipcMain.handle('parametres:sauvegarderDB', () => parametresService.sauvegarderDB())
  ipcMain.handle('parametres:restaurerDB', (_, filePath) => parametresService.restaurerDB(filePath))

  // === UTILISATEURS ===
  ipcMain.handle('utilisateurs:getAll', () => authService.getAllUtilisateurs())
  ipcMain.handle('utilisateurs:create', (_, data) => authService.createUtilisateur(data))
  ipcMain.handle('utilisateurs:update', (_, id, data) => authService.updateUtilisateur(id, data))
  ipcMain.handle('utilisateurs:desactiver', (_, id) => authService.desactiverUtilisateur(id))
  ipcMain.handle('utilisateurs:resetPassword', (_, id, newPwd) =>
    authService.resetPassword(id, newPwd))

  // === DASHBOARD ===
  ipcMain.handle('dashboard:getStats', (_, anneeId) => dashboardService.getStats(anneeId))
  ipcMain.handle('dashboard:getDerniersPaiements', (_, anneeId, limit) =>
    dashboardService.getDerniersPaiements(anneeId, limit))
  ipcMain.handle('dashboard:getProchainesEcheances', (_, anneeId, limit) =>
    dashboardService.getProchainesEcheances(anneeId, limit))
  ipcMain.handle('dashboard:getRecouvrementParClasse', (_, anneeId) =>
    dashboardService.getRecouvrementParClasse(anneeId))
  ipcMain.handle('dashboard:getPaiementsParMode', (_, anneeId) =>
    dashboardService.getPaiementsParMode(anneeId))
  ipcMain.handle('dashboard:getStatsProfesseur', (_, profId, anneeId) =>
    dashboardService.getStatsProfesseur(profId, anneeId))
}

module.exports = registerHandlers()

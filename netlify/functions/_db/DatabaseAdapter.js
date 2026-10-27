// ==============================================================================
// DATABASE ADAPTER BASE (CONTRATO DEL PATRÓN REPOSITORY)
// Don Yeyo S.A. | Trivia Inocuidad 2026 (Backend Netlify)
// ==============================================================================

/**
 * @typedef {Object} ParticipantRecord
 * @property {number|string} [id]
 * @property {string} legajo
 * @property {string} token_hash
 * @property {string} [apellido]
 * @property {string} [nombre]
 * @property {string} [documento]
 * @property {string} [sector]
 * @property {string} [telefono]
 * @property {string} [email]
 */

/**
 * @typedef {Object} UserProgress
 * @property {boolean} hasRecord
 * @property {Array<{questionId: number, timeSpent: number, fechaHoraRespuesta: string, isCorrect?: boolean, pointsEarned?: number}>} answers
 * @property {number} score
 * @property {number} correctCount
 * @property {number} totalTime
 * @property {string} [fechaHora]
 * @property {boolean} isPhaseCompleted
 */

/**
 * @typedef {Object} TriviaConfig
 * @property {number} activePhase
 * @property {boolean} isPhaseClosed
 * @property {boolean} isClassificationPublished
 * @property {number} classificationTopCount
 * @property {boolean} showPartialInTable
 * @property {boolean} showUnansweredInTable
 * @property {string|null} classificationPublishedAt
 * @property {number} timePerQuestion
 * @property {boolean} shuffleQuestions
 * @property {boolean} hideSummaryAnswered
 * @property {boolean} hideSummaryTime
 */

/**
 * Interfaz base abstracta que define las operaciones soportadas por cualquier motor de persistencia.
 */
export class DatabaseAdapter {
  constructor(name = 'BaseAdapter') {
    this.name = name;
  }

  /**
   * Inicializa o valida la conexión y el esquema si aplica.
   * @returns {Promise<boolean>}
   */
  async init() {
    throw new Error(`${this.name}.init() no implementado`);
  }

  /**
   * Obtiene la configuración activa del sistema.
   * @returns {Promise<TriviaConfig>}
   */
  async getConfig() {
    throw new Error(`${this.name}.getConfig() no implementado`);
  }

  /**
   * Actualiza parámetros en la configuración.
   * @param {Record<string, string>} updates Clave-Valor a modificar
   * @returns {Promise<boolean>}
   */
  async updateConfig(updates) {
    throw new Error(`${this.name}.updateConfig() no implementado`);
  }

  /**
   * Busca un participante por su token_hash (o legajo si allowSessionReset es true).
   * @param {string} token Token hash a buscar
   * @param {boolean} [allowSessionReset=false]
   * @returns {Promise<ParticipantRecord|null>}
   */
  async getUserByHash(token, allowSessionReset = false) {
    throw new Error(`${this.name}.getUserByHash() no implementado`);
  }

  /**
   * Obtiene el progreso registrado de un participante en una fase.
   * @param {string} legajo
   * @param {number} phase
   * @returns {Promise<UserProgress>}
   */
  async getUserProgress(legajo, phase) {
    throw new Error(`${this.name}.getUserProgress() no implementado`);
  }

  /**
   * Obtiene las preguntas para la fase indicada.
   * @param {number} phase
   * @param {boolean} [sanitized=true] Si es true, oculta la respuesta correcta y puntos de auditoría.
   * @returns {Promise<Array<Object>>}
   */
  async getQuestions(phase, sanitized = true) {
    throw new Error(`${this.name}.getQuestions() no implementado`);
  }

  /**
   * Registra atómicamente la respuesta a una pregunta de la trivia.
   * @param {Object} params
   * @param {string} params.legajo
   * @param {number} params.phase
   * @param {number} params.questionId
   * @param {number|null} params.selectedOptionId
   * @param {boolean} params.isCorrect
   * @param {number} params.pointsEarned
   * @param {number} params.timeSpent
   * @param {string} params.timestamp
   * @returns {Promise<{success: boolean, id?: string|number}>}
   */
  async saveQuestionAnswer(params) {
    throw new Error(`${this.name}.saveQuestionAnswer() no implementado`);
  }

  /**
   * Calcula o devuelve la clasificación, podio y participantes de la fase.
   * @param {number} phase
   * @param {number} topCount
   * @param {boolean} showPartial
   * @param {boolean} showUnanswered
   * @returns {Promise<Object>}
   */
  async getClassification(phase, topCount, showPartial, showUnanswered) {
    throw new Error(`${this.name}.getClassification() no implementado`);
  }

  /**
   * Importa masivamente una nómina de participantes.
   * @param {Array<ParticipantRecord>} participants
   * @param {'REPLACE'|'APPEND'} [mode='REPLACE']
   * @returns {Promise<{success: boolean, totalImportados: number, duplicadosOmitidos: number}>}
   */
  async importParticipants(participants, mode = 'REPLACE') {
    throw new Error(`${this.name}.importParticipants() no implementado`);
  }

  /**
   * Obtiene la nómina completa de participantes para el panel de administración con estadísticas.
   * @returns {Promise<Array<Object>>}
   */
  async getParticipantsAdmin() {
    throw new Error(`${this.name}.getParticipantsAdmin() no implementado`);
  }

  /**
   * Crea un nuevo participante.
   * @param {Object} data
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async createParticipant(data) {
    throw new Error(`${this.name}.createParticipant() no implementado`);
  }

  /**
   * Actualiza los datos de un participante existente.
   * @param {string} legajo
   * @param {Object} data
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateParticipant(legajo, data) {
    throw new Error(`${this.name}.updateParticipant() no implementado`);
  }

  /**
   * Elimina un participante y sus respuestas asociadas.
   * @param {string} legajo
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteParticipant(legajo) {
    throw new Error(`${this.name}.deleteParticipant() no implementado`);
  }

  /**
   * Regenera el token_hash de un participante usando la frase semilla oficial.
   * @param {string} legajo
   * @returns {Promise<{success: boolean, token_hash?: string, error?: string}>}
   */
  async generateParticipantHash(legajo) {
    throw new Error(`${this.name}.generateParticipantHash() no implementado`);
  }

  /**
   * Genera el hash de todos los participantes que aún no posean token_hash.
   * @returns {Promise<{success: boolean, updatedCount: number, error?: string}>}
   */
  async generateAllMissingHashes() {
    throw new Error(`${this.name}.generateAllMissingHashes() no implementado`);
  }

  /**
   * Marca o desmarca si el email de participación o resultados fue enviado.
   * @param {string} legajo
   * @param {boolean} emailSent
   * @param {'INVITACION'|'RESULTADOS'} [tipo='INVITACION']
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async toggleEmailSent(legajo, emailSent, tipo = 'INVITACION') {
    throw new Error(`${this.name}.toggleEmailSent() no implementado`);
  }

  /**
   * Marca o desmarca masivamente el estado de email para una lista de legajos.
   * @param {Array<string>} legajos
   * @param {boolean} emailSent
   * @param {'INVITACION'|'RESULTADOS'} [tipo='INVITACION']
   * @returns {Promise<{success: boolean, updatedCount?: number, error?: string}>}
   */
  async toggleEmailSentBatch(legajos, emailSent, tipo = 'INVITACION') {
    throw new Error(`${this.name}.toggleEmailSentBatch() no implementado`);
  }

  /**
   * Cambia el estado de activo (true/false) de un participante.
   * @param {string} legajo
   * @param {boolean} activo
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async setActiveStatus(legajo, activo) {
    throw new Error(`${this.name}.setActiveStatus() no implementado`);
  }

  /**
   * Cambia masivamente el estado de activo (true/false) de múltiples participantes.
   * @param {Array<string>} legajos
   * @param {boolean} activo
   * @returns {Promise<{success: boolean, updatedCount?: number, error?: string}>}
   */
  async setActiveStatusBatch(legajos, activo) {
    throw new Error(`${this.name}.setActiveStatusBatch() no implementado`);
  }

  /**
   * Blanquea el token_hash de un participante dejándolo sin enlace de acceso.
   * @param {string} legajo
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async clearParticipantHash(legajo) {
    throw new Error(`${this.name}.clearParticipantHash() no implementado`);
  }

  /**
   * Blanquea masivamente el token_hash de múltiples participantes.
   * @param {Array<string>} legajos
   * @returns {Promise<{success: boolean, updatedCount?: number, error?: string}>}
   */
  async clearParticipantHashBatch(legajos) {
    throw new Error(`${this.name}.clearParticipantHashBatch() no implementado`);
  }

  /**
   * Regenera el token_hash de una lista seleccionada de legajos.
   * @param {Array<string>} legajos
   * @returns {Promise<{success: boolean, updatedCount?: number, error?: string}>}
   */
  async generateParticipantHashBatch(legajos) {
    throw new Error(`${this.name}.generateParticipantHashBatch() no implementado`);
  }

  /**
   * Resetea el progreso y respuestas de un participante en la fase especificada (o en todas).
   * @param {string} legajo
   * @param {number|null} [phase=null]
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async resetParticipantTrivia(legajo, phase = null) {
    throw new Error(`${this.name}.resetParticipantTrivia() no implementado`);
  }

  /**
   * Resetea masivamente el progreso y respuestas de una lista de participantes en la fase especificada (o en todas).
   * @param {Array<string>} legajos
   * @param {number|null} [phase=null]
   * @returns {Promise<{success: boolean, updatedCount?: number, error?: string}>}
   */
  async resetParticipantTriviaBatch(legajos, phase = null) {
    throw new Error(`${this.name}.resetParticipantTriviaBatch() no implementado`);
  }

  /**
   * Obtiene el detalle completo de respuestas de un participante para una fase específica,
   * cruzando las preguntas con las respuestas seleccionadas y su estado.
   * @param {string} legajo
   * @param {number} phase
   * @returns {Promise<{success: boolean, participant?: Object, phase: number, questions: Array<Object>, error?: string}>}
   */
  async getParticipantResponsesDetail(legajo, phase) {
    throw new Error(`${this.name}.getParticipantResponsesDetail() no implementado`);
  }

  /**
   * Obtiene la lista de grupos creados y la cantidad de miembros asignados.
   * @returns {Promise<Array<{nombre: string, descripcion?: string, color?: string, count: number}>>}
   */
  async getGroups() {
    throw new Error(`${this.name}.getGroups() no implementado`);
  }

  /**
   * Crea un nuevo grupo de participantes.
   * @param {Object} groupData
   * @param {string} groupData.nombre
   * @param {string} [groupData.descripcion]
   * @param {string} [groupData.color]
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async createGroup(groupData) {
    throw new Error(`${this.name}.createGroup() no implementado`);
  }

  /**
   * Elimina un grupo y desvincula a sus participantes.
   * @param {string} nombre
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteGroup(nombre) {
    throw new Error(`${this.name}.deleteGroup() no implementado`);
  }

  /**
   * Asigna o desasigna un grupo masivamente a una lista de participantes.
   * @param {Array<string>} legajos
   * @param {string|null} grupoNombre Nombre del grupo (o '' / null para quitar del grupo)
   * @returns {Promise<{success: boolean, updatedCount?: number, error?: string}>}
   */
  async assignGroupBatch(legajos, grupoNombre) {
    throw new Error(`${this.name}.assignGroupBatch() no implementado`);
  }

  /**
   * Obtiene la lista completa de preguntas con respuesta correcta y explicación para el administrador.
   * @param {number|null} [phase=null]
   * @returns {Promise<Array<any>>}
   */
  async getQuestionsAdmin(phase = null) {
    throw new Error(`${this.name}.getQuestionsAdmin() no implementado`);
  }

  /**
   * Crea una nueva pregunta en el sistema.
   * @param {Object} questionData
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async createQuestion(questionData) {
    throw new Error(`${this.name}.createQuestion() no implementado`);
  }

  /**
   * Actualiza una pregunta existente.
   * @param {number} fase
   * @param {number} id
   * @param {Object} questionData
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateQuestion(fase, id, questionData) {
    throw new Error(`${this.name}.updateQuestion() no implementado`);
  }

  /**
   * Elimina una pregunta.
   * @param {number} fase
   * @param {number} id
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteQuestion(fase, id) {
    throw new Error(`${this.name}.deleteQuestion() no implementado`);
  }

  /**
   * Obtiene los parámetros de mailing configurados (por tipo o todos).
   * @param {string|null} [emailTipo=null] 'INVITACION' | 'RESULTADOS' | null
   * @returns {Promise<Array<Object>>}
   */
  async getMailingParams(emailTipo = null) {
    throw new Error(`${this.name}.getMailingParams() no implementado`);
  }

  /**
   * Guarda o actualiza un conjunto de parámetros de mailing.
   * @param {string} emailTipo 'INVITACION' | 'RESULTADOS'
   * @param {Object} paramsMap Objeto clave-valor con los parámetros
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveMailingParams(emailTipo, paramsMap) {
    throw new Error(`${this.name}.saveMailingParams() no implementado`);
  }
}


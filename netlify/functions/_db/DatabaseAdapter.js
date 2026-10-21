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
   * Marca o desmarca si el email de participación fue enviado.
   * @param {string} legajo
   * @param {boolean} emailSent
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async toggleEmailSent(legajo, emailSent) {
    throw new Error(`${this.name}.toggleEmailSent() no implementado`);
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
}


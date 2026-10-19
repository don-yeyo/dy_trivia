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
}

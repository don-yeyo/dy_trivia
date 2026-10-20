// ==============================================================================
// UTILIDAD DE CÁLCULO DE PUNTAJE GAMER
// Sistema Jerárquico por Aciertos (Opción 1):
// Puntaje = (Aciertos * POINTS_PER_CORRECT) + round((Aciertos / Segundos) * SCORE_TIME_FACTOR)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================

/**
 * Obtiene los puntos base asignados a cada acierto.
 * Default: 10000
 * @returns {number}
 */
export function getPointsPerCorrect() {
  if (typeof process !== 'undefined' && process.env?.POINTS_PER_CORRECT) {
    const val = parseInt(process.env.POINTS_PER_CORRECT, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_POINTS_PER_CORRECT) {
    const val = parseInt(import.meta.env.VITE_POINTS_PER_CORRECT, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 10000;
}

/**
 * Obtiene el factor multiplicador para la bonificación de velocidad.
 * Default: 1000
 * @returns {number}
 */
export function getScoreTimeFactor() {
  if (typeof process !== 'undefined' && process.env?.SCORE_TIME_FACTOR) {
    const val = parseInt(process.env.SCORE_TIME_FACTOR, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SCORE_TIME_FACTOR) {
    const val = parseInt(import.meta.env.VITE_SCORE_TIME_FACTOR, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 1000;
}

/**
 * Calcula el puntaje garantizando que los aciertos sean el ordenamiento principal:
 * Base por aciertos + bonus de velocidad acotado por tiempo
 *
 * @param {number} points - Cantidad de aciertos o puntos base obtenidos
 * @param {number} totalSeconds - Cantidad total de segundos invertidos
 * @param {number} [customBasePerCorrect] - Puntos base por acierto opcional
 * @param {number} [customTimeFactor] - Factor multiplicador de tiempo opcional
 * @returns {number} Puntaje entero redondeado
 */
export function calculateScore(points, totalSeconds, customBasePerCorrect = null, customTimeFactor = null) {
  const pts = Number(points) || 0;
  const secs = Number(totalSeconds) || 0;

  if (pts <= 0) return 0;

  const basePerCorrect = customBasePerCorrect && !isNaN(customBasePerCorrect) && customBasePerCorrect > 0
    ? customBasePerCorrect
    : getPointsPerCorrect();

  const timeFactor = customTimeFactor && !isNaN(customTimeFactor) && customTimeFactor > 0
    ? customTimeFactor
    : getScoreTimeFactor();

  const baseScore = pts * basePerCorrect;
  const speedBonus = secs > 0 ? Math.round((pts / secs) * timeFactor) : 0;

  return baseScore + speedBonus;
}

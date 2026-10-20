// ==============================================================================
// UTILIDADES DE SEGURIDAD CRIPTOGRÁFICA SERVERLESS (HMAC ZERO-TRUST)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import crypto from 'crypto';
import { getServerEnv } from './googleSheets.js';

/**
 * Genera un token sellado criptográficamente con HMAC para una pregunta entregada
 * Garantiza que:
 * 1. El cliente no pueda falsificar la hora de entrega (deliveredAt).
 * 2. El cliente no pueda alterar el id de pregunta, legajo ni la fase.
 * 3. Sea 100% stateless (no requiere memoria en RAM del servidor).
 *
 * @param {Object} params
 * @param {string|number} params.legajo
 * @param {number} params.phase
 * @param {number} params.questionId
 * @param {string} [params.tokenHash]
 * @returns {string} Token firmado en formato base64url.signature
 */
export function createQuestionToken({ legajo, phase, questionId, tokenHash = '' }) {
  const seedPhrase = getServerEnv('SEED_PHRASE') || 'DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO';
  const payloadObj = {
    legajo: String(legajo),
    phase: parseInt(phase, 10),
    questionId: parseInt(questionId, 10),
    tokenHash: String(tokenHash || '').trim().toLowerCase(),
    deliveredAt: Date.now()
  };

  const payloadJson = JSON.stringify(payloadObj);
  const signature = crypto.createHmac('sha256', seedPhrase).update(payloadJson).digest('hex');
  const encodedPayload = Buffer.from(payloadJson, 'utf8').toString('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Valida la firma criptográfica HMAC de un questionToken
 * Si la firma coincide y no fue alterado, retorna el payload decodificado.
 * Si fue alterado o es inválido, retorna null.
 *
 * @param {string} token
 * @returns {Object|null} Payload { legajo, phase, questionId, tokenHash, deliveredAt } o null
 */
export function verifyQuestionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, receivedSig] = parts;

  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const seedPhrase = getServerEnv('SEED_PHRASE') || 'DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO';
    const expectedSig = crypto.createHmac('sha256', seedPhrase).update(payloadJson).digest('hex');

    const bufReceived = Buffer.from(receivedSig);
    const bufExpected = Buffer.from(expectedSig);

    if (bufReceived.length !== bufExpected.length) return null;
    if (!crypto.timingSafeEqual(bufReceived, bufExpected)) return null;

    const data = JSON.parse(payloadJson);
    return data;
  } catch (err) {
    return null;
  }
}

// ==============================================================================
// NETLIFY FUNCTION: AUTH & USER PROGRESS (/api/auth)
// Valida el token del colaborador y obtiene su progreso usando DatabaseAdapter
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getDatabase } from './_db/index.js';
import { getServerEnv } from './utils/googleSheets.js';

// ⚡ OPTIMIZACIÓN WARM START: Instanciación fuera del handler para reutilización en memoria
const db = getDatabase();

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const token = (params.token || params.hash || params.legajo || '').trim().toLowerCase();
    const allowSessionReset = getServerEnv('ALLOW_SESSION_RESET') === 'true';

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ isValid: false, reason: 'TOKEN_MISSING' })
      };
    }

    // 1. Obtener configuración autorizada de la trivia
    const config = await db.getConfig();
    const phase = config.activePhase;

    // 2. Buscar usuario por token_hash en el adaptador activo (Warm Start reutilizable)
    const foundUser = await db.getUserByHash(token, allowSessionReset);

    if (!foundUser) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ isValid: false, reason: 'USER_NOT_FOUND' })
      };
    }

    // 3. Consultar progreso de la fase activa
    const progress = await db.getUserProgress(foundUser.legajo, phase);

    // 4. Responder con los datos autorizados
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isValid: true,
        user: {
          legajo: String(foundUser.legajo),
          nombre: String(foundUser.nombre),
          apellido: String(foundUser.apellido)
        },
        progress,
        config: {
          activePhase: config.activePhase,
          isPhaseClosed: config.isPhaseClosed,
          timePerQuestion: config.timePerQuestion,
          shuffleQuestions: config.shuffleQuestions,
          hideSummaryAnswered: config.hideSummaryAnswered,
          hideSummaryTime: config.hideSummaryTime,
          isClassificationPublished: config.isClassificationPublished
        }
      })
    };

  } catch (error) {
    console.error('Error en /api/auth:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor', details: error.message })
    };
  }
}

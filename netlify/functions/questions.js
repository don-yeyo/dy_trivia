// ==============================================================================
// NETLIFY FUNCTION: QUESTIONS (/api/questions)
// Entrega de preguntas segura con arquitectura Zero-Trust y tokens HMAC
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getDatabase } from './_db/index.js';
import { verifyAdminToken, getServerEnv } from './utils/googleSheets.js';
import { createQuestionToken } from './utils/security.js';

export async function handler(event, context) {
  const db = getDatabase();
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const token = (params.token || params.hash || '').trim().toLowerCase();
    const mode = (params.mode || '').trim().toLowerCase(); // 'single' (default para juego) | 'all' (admin)
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const isAdmin = verifyAdminToken(authHeader);
    const allowSessionReset = getServerEnv('ALLOW_SESSION_RESET') === 'true' || getServerEnv('VITE_ALLOW_SESSION_RESET') === 'true';

    // 🛡️ Seguridad: El backend decide la fase activa y si la fase está abierta o cerrada
    const config = await db.getConfig();

    if (config.isPhaseClosed && !isAdmin) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ isPhaseClosed: true, message: 'La fase activa ya ha sido cerrada.', questions: [] })
      };
    }

    const phase = params.phase ? parseInt(params.phase, 10) : config.activePhase;
    const shuffle = config.shuffleQuestions;

    // Obtener preguntas sanitizadas del motor de base de datos
    let allQuestions = await db.getQuestions(phase, true);

    // 1. Caso Administrador o Desarrollo con allowSessionReset solicitando lista completa
    if ((isAdmin || allowSessionReset) && mode === 'all') {
      if (shuffle && Array.isArray(allQuestions)) {
        for (let i = allQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
        }
      }

      // Adjuntar questionToken a cada pregunta
      const questionsWithTokens = allQuestions.map(q => ({
        ...q,
        questionToken: createQuestionToken({
          legajo: 'admin',
          phase,
          questionId: q.id,
          tokenHash: 'admin'
        })
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(questionsWithTokens)
      };
    }

    // 2. Si no hay token de colaborador ni credenciales de admin, denegar acceso a las preguntas
    const effectiveToken = token || (allowSessionReset ? 'demo' : '');
    if (!effectiveToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Acceso no autorizado. Se requiere token de participante para solicitar preguntas.',
          requireToken: true
        })
      };
    }

    // 3. Buscar participante por token_hash
    const foundUser = await db.getUserByHash(effectiveToken, allowSessionReset);
    if (!foundUser) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Participante no encontrado', isValid: false })
      };
    }

    // 4. Consultar progreso actual del participante para saber qué preguntas ya respondió
    const progress = await db.getUserProgress(foundUser.legajo, phase);
    const answeredIds = new Set((progress.answers || []).map(a => parseInt(a.questionId, 10)));
    const pendingQuestions = (allQuestions || []).filter(q => !answeredIds.has(parseInt(q.id, 10)));

    // Si ya completó todas las preguntas de la fase
    if (pendingQuestions.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isPhaseCompleted: true,
          totalQuestions: allQuestions.length,
          answeredCount: answeredIds.size,
          questions: []
        })
      };
    }

    // Mezclar las preguntas pendientes si está configurado
    if (shuffle && Array.isArray(pendingQuestions)) {
      for (let i = pendingQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pendingQuestions[i], pendingQuestions[j]] = [pendingQuestions[j], pendingQuestions[i]];
      }
    }

    // 🛡️ REGLA ZERO-TRUST: Si mode !== 'all', entregar ÚNICAMENTE la pregunta actual pendiente
    // El cliente NO recibe el texto ni las opciones de preguntas posteriores
    const nextQuestion = pendingQuestions[0];
    const questionToken = createQuestionToken({
      legajo: foundUser.legajo,
      phase,
      questionId: nextQuestion.id,
      tokenHash: effectiveToken
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isPhaseCompleted: false,
        totalQuestions: allQuestions.length,
        answeredCount: answeredIds.size,
        currentIndex: answeredIds.size,
        question: {
          id: nextQuestion.id,
          phase: nextQuestion.phase,
          question: nextQuestion.question,
          points: nextQuestion.points,
          options: nextQuestion.options
        },
        questionToken
      })
    };

  } catch (error) {
    console.error('Error en /api/questions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error obteniendo preguntas', details: error.message })
    };
  }
}


// ==============================================================================
// NETLIFY FUNCTION: SUBMIT ANSWER (/api/submit-answer)
// Evalúa en el servidor si la respuesta es correcta, calcula tiempo real (HMAC)
// y persiste atómicamente garantizando arquitectura Zero-Trust
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getDatabase } from './_db/index.js';
import { verifyQuestionToken, createQuestionToken } from './utils/security.js';
import { getServerEnv } from './utils/googleSheets.js';

export async function handler(event, context) {
  const db = getDatabase();
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    let body = {};
    if (typeof event.body === 'string') {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        body = {};
      }
    } else if (typeof event.body === 'object' && event.body !== null) {
      body = event.body;
    }

    const {
      action,
      questionToken,
      userToken = '',
      selectedOptionId = null,
      legajo: rawLegajo,
      questionId: rawQuestionId,
      timeSpent: clientDeclaredTime = 0
    } = body;

    // Si solo es un aviso de inicio de pregunta, acusar recibo
    if (action === 'START_QUESTION') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Pregunta iniciada registrada' })
      };
    }

    // 🛡️ Seguridad en Servidor: Validar contra la configuración autorizada
    const config = await db.getConfig();

    if (config.isPhaseClosed) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'La fase actual se encuentra cerrada. No se admiten nuevas respuestas.' })
      };
    }

    const allowSessionReset = getServerEnv('ALLOW_SESSION_RESET') === 'true' || getServerEnv('VITE_ALLOW_SESSION_RESET') === 'true';

    let legajo = rawLegajo;
    let phase = config.activePhase;
    let questionId = rawQuestionId;
    let effectiveTimeSpent = parseInt(clientDeclaredTime, 10) || 0;
    let isTimedOut = false;
    let tokenHash = userToken;

    // 🛡️ VALIDACIÓN CRIPTOGRÁFICA ZERO-TRUST:
    if (questionToken) {
      const tokenData = verifyQuestionToken(questionToken);
      if (!tokenData) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Firma de token de pregunta inválida o manipulada' })
        };
      }

      legajo = tokenData.legajo;
      phase = tokenData.phase;
      questionId = tokenData.questionId;
      tokenHash = tokenData.tokenHash || userToken;

      // ⏱️ CÁLCULO DE TIEMPO REAL EN EL SERVIDOR (Anti-Speedhack)
      // Se calcula la diferencia exacta entre now() y la hora en que el servidor emitió el token
      const now = Date.now();
      const serverElapsed = Math.max(1, Math.round((now - tokenData.deliveredAt) / 1000));

      // Margen de tolerancia de 4 segundos por latencia de red móvil
      const timeLimit = config.timePerQuestion || 45;
      if (timeLimit > 0 && serverElapsed > (timeLimit + 4)) {
        isTimedOut = true;
        effectiveTimeSpent = timeLimit;
      } else {
        effectiveTimeSpent = serverElapsed;
      }
    } else {
      // Si no envió questionToken (fallback legacy solo permitido en modo dev o si allowSessionReset)
      if (!allowSessionReset && process.env.NODE_ENV === 'production') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Se requiere questionToken firmado para registrar la respuesta.' })
        };
      }
    }

    if (!legajo || questionId === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan parámetros requeridos (legajo, questionId)' })
      };
    }

    // 1. Obtener preguntas de la fase activa con la respuesta correcta (en servidor)
    const questions = await db.getQuestions(phase, false);
    const question = questions.find(q => parseInt(q.id, 10) === parseInt(questionId, 10));

    if (!question) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Pregunta no encontrada', requestedId: questionId, phase })
      };
    }

    // 2. Extraer opción correcta en servidor
    const correctOptionId = question.correctOptionId || 1;

    // 3. Evaluar acierto y cálculo de puntaje en servidor
    const effectiveOptionId = isTimedOut ? null : (selectedOptionId !== null && selectedOptionId !== undefined ? parseInt(selectedOptionId, 10) : null);
    const isCorrect = !isTimedOut && effectiveOptionId !== null && effectiveOptionId === correctOptionId;
    const basePoints = parseInt(question.points || '1', 10);
    const pointsEarned = isCorrect ? basePoints : 0;
    const timestamp = new Date().toISOString();

    // 4. Inserción atómica en el motor activo (1 sola llamada REST PostgREST)
    await db.saveQuestionAnswer({
      legajo: String(legajo),
      phase: parseInt(phase, 10),
      questionId: parseInt(questionId, 10),
      selectedOptionId: effectiveOptionId,
      isCorrect,
      pointsEarned,
      timeSpent: effectiveTimeSpent,
      timestamp
    });

    // 5. Preparar la entrega inmediata de la siguiente pregunta (Zero Latency)
    const progress = await db.getUserProgress(legajo, phase);
    const answeredIds = new Set((progress.answers || []).map(a => parseInt(a.questionId, 10)));
    const pendingQuestions = questions.filter(q => !answeredIds.has(parseInt(q.id, 10)));

    let nextQuestionData = null;
    let isFinished = false;

    if (pendingQuestions.length > 0) {
      const nextQ = pendingQuestions[0];
      const nextToken = createQuestionToken({
        legajo,
        phase,
        questionId: nextQ.id,
        tokenHash
      });

      nextQuestionData = {
        id: nextQ.id,
        phase: nextQ.phase,
        question: nextQ.question,
        points: nextQ.points,
        options: nextQ.options,
        questionToken: nextToken
      };
    } else {
      isFinished = true;
    }

    // 6. Retornar el resultado evaluado al frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        questionId: parseInt(questionId, 10),
        isCorrect,
        pointsEarned,
        timeSpent: effectiveTimeSpent,
        isTimedOut,
        serverVerified: true,
        nextQuestion: nextQuestionData,
        isFinished,
        timestamp
      })
    };

  } catch (error) {
    console.error('Error en /api/submit-answer:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error procesando respuesta', details: error.message })
    };
  }
}


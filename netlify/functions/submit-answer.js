// ==============================================================================
// NETLIFY FUNCTION: SUBMIT ANSWER (/api/submit-answer)
// Evalúa en el servidor si la respuesta es correcta y la persiste atómicamente
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getDatabase } from './_db/index.js';

// ⚡ OPTIMIZACIÓN WARM START: Instanciación fuera del handler para reutilización en memoria
const db = getDatabase();

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

    const { action, legajo, questionId, selectedOptionId = null, timeSpent = 0 } = body;

    // Si solo es un aviso de inicio de pregunta, acusar recibo sin persistir fallo prematuro
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

    const phase = config.activePhase;

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
    const isCorrect = selectedOptionId !== null && selectedOptionId !== undefined && parseInt(selectedOptionId, 10) === correctOptionId;
    const basePoints = parseInt(question.points || '1', 10);

    let pointsEarned = 0;
    if (isCorrect) {
      // Cada pregunta suma el punto asignado a la pregunta (1 punto) sin speed bonus
      pointsEarned = basePoints;
    }

    const timestamp = new Date().toISOString();

    // 4. Inserción atómica en el motor activo (1 sola llamada REST PostgREST)
    await db.saveQuestionAnswer({
      legajo: String(legajo),
      phase: parseInt(phase, 10),
      questionId: parseInt(questionId, 10),
      selectedOptionId: selectedOptionId !== null ? parseInt(selectedOptionId, 10) : null,
      isCorrect,
      pointsEarned,
      timeSpent: parseInt(timeSpent, 10),
      timestamp
    });

    // 5. Retornar el resultado evaluado al frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        questionId: parseInt(questionId, 10),
        isCorrect,
        pointsEarned,
        timeSpent: parseInt(timeSpent, 10),
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

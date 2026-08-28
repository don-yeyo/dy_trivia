// ==============================================================================
// NETLIFY FUNCTION: QUESTIONS (/api/questions)
// Devuelve las preguntas de la fase activa SANITIZADAS (sin la respuesta correcta)
// ==============================================================================
import { fetchSheetValues, getServerEnv } from './utils/googleSheets.js';

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
    const phase = parseInt(params.phase || getServerEnv('ACTIVE_PHASE') || '1', 10);
    const shuffle = (params.shuffle || getServerEnv('SHUFFLE_QUESTIONS')) === 'true';

    const questionsRange = getServerEnv('GOOGLE_SHEETS_QUESTIONS_RANGE') || 'Preguntas!A1:Z100';
    const rows = await fetchSheetValues(questionsRange);

    if (!rows || rows.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }

    // Filtrar por fase y armar objetos limpios sin la columna de respuesta correcta
    const sanitizedQuestions = [];

    rows.forEach((r, idx) => {
      const qPhase = parseInt(r.fase || r.phase || '1', 10);
      if (qPhase !== phase) return;

      const qId = parseInt(r.id || r.numero || idx + 1, 10);
      const questionText = r.pregunta || r.question || '';
      const points = parseInt(r.puntos || r.points || '100', 10);

      // Extraer opciones disponibles
      const options = [];
      const optionA = r.opcion_a || r.opciona || r.a || '';
      const optionB = r.opcion_b || r.opcionb || r.b || '';
      const optionC = r.opcion_c || r.opcionc || r.c || '';
      const optionD = r.opcion_d || r.opciond || r.d || '';
      const optionE = r.opcion_e || r.opcione || r.e || '';

      if (optionA) options.push({ id: 1, text: optionA });
      if (optionB) options.push({ id: 2, text: optionB });
      if (optionC) options.push({ id: 3, text: optionC });
      if (optionD) options.push({ id: 4, text: optionD });
      if (optionE) options.push({ id: 5, text: optionE });

      if (questionText && options.length >= 2) {
        // Objeto sanitizado: NUNCA incluye correctOptionId ni pistas
        sanitizedQuestions.push({
          id: qId,
          phase: qPhase,
          question: questionText,
          points,
          options
        });
      }
    });

    // Mezclar si está configurado
    if (shuffle) {
      for (let i = sanitizedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sanitizedQuestions[i], sanitizedQuestions[j]] = [sanitizedQuestions[j], sanitizedQuestions[i]];
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(sanitizedQuestions)
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

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

    const phaseRows = rows.filter(r => {
      const qPhase = parseInt(r.fase || r.phase || '1', 10);
      return qPhase === phase;
    });

    const sanitizedQuestions = [];

    phaseRows.forEach((r, idx) => {
      const explicitId = r.id || r.numero || r.id_pregunta;
      const qId = (explicitId !== undefined && explicitId !== '') ? parseInt(explicitId, 10) : (idx + 1);
      const questionText = r.pregunta || r.question || '';
      const points = parseInt(r.puntos || r.points || '100', 10);

      // Extraer opciones (soporta opcion1..opcion5, opcion_a..opcion_e, a..e)
      const options = [];
      for (let i = 1; i <= 5; i++) {
        const letter = String.fromCharCode(96 + i); // a, b, c, d, e
        const optText = r[`opcion${i}`] || r[`opcion_${i}`] || r[`opcion${letter}`] || r[`opcion_${letter}`] || r[letter] || r[`opcion ${i}`] || '';
        if (optText && String(optText).trim() !== '') {
          options.push({
            id: i,
            text: String(optText).trim()
          });
        }
      }

      if (questionText && options.length >= 2) {
        // Objeto sanitizado: NUNCA incluye correctOptionId ni pistas
        sanitizedQuestions.push({
          id: qId,
          phase: phase,
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

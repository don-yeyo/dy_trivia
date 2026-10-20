// ==============================================================================
// NETLIFY FUNCTION: QUESTIONS (/api/questions)
// Devuelve las preguntas de la fase activa SANITIZADAS (sin la respuesta correcta)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getDatabase } from './_db/index.js';

export async function handler(event, context) {
  const db = getDatabase();
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
    // 🛡️ Seguridad: El backend decide la fase activa y si la fase está abierta o cerrada
    const config = await db.getConfig();

    if (config.isPhaseClosed) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ isPhaseClosed: true, message: 'La fase activa ya ha sido cerrada.', questions: [] })
      };
    }

    const phase = config.activePhase;
    const shuffle = config.shuffleQuestions;

    // Obtener preguntas sanitizadas del motor de base de datos
    const questions = await db.getQuestions(phase, true);

    // Mezclar si está configurado en el sistema
    if (shuffle && Array.isArray(questions)) {
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(questions || [])
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

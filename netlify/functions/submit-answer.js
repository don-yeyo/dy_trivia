// ==============================================================================
// NETLIFY FUNCTION: SUBMIT ANSWER (/api/submit-answer)
// Evalúa en el servidor si la respuesta es correcta y la persiste en Google Sheets
// ==============================================================================
import { fetchSheetValues, sendToAppsScript, getServerEnv } from './utils/googleSheets.js';

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const body = JSON.parse(event.body || '{}');
    const { legajo, phase = 1, questionId, selectedOptionId, timeSpent = 0 } = body;

    if (!legajo || questionId === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan parámetros requeridos (legajo, questionId)' })
      };
    }

    // 1. Obtener preguntas de la hoja con la columna de respuestas correctas (en servidor)
    const questionsRange = getServerEnv('GOOGLE_SHEETS_QUESTIONS_RANGE') || 'Preguntas!A1:Z100';
    const rows = await fetchSheetValues(questionsRange);

    const phaseRows = rows.filter(r => {
      const qPhase = parseInt(r.fase || r.phase || '1', 10);
      return qPhase === parseInt(phase, 10);
    });

    const questionRow = phaseRows.find((r, idx) => {
      const explicitId = r.id || r.numero || r.id_pregunta;
      if (explicitId !== undefined && explicitId !== '') {
        return parseInt(explicitId, 10) === parseInt(questionId, 10);
      }
      return (idx + 1) === parseInt(questionId, 10);
    });

    if (!questionRow) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Pregunta no encontrada', requestedId: questionId, phase })
      };
    }

    // 2. Extraer opción correcta en servidor (número 1..5 o letra A..E)
    const rawCorrect = String(
      questionRow.respuesta_correcta || 
      questionRow.respuestacorrecta || 
      questionRow.opcion_correcta || 
      questionRow.opcioncorrecta || 
      questionRow.correcta || 
      questionRow.correctoptionid || 
      '1'
    ).trim().toUpperCase();

    const correctMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
    const correctOptionId = correctMap[rawCorrect] || parseInt(rawCorrect, 10) || 1;

    // 3. Evaluar acierto y cálculo de puntaje en servidor
    const isCorrect = selectedOptionId !== null && selectedOptionId !== undefined && parseInt(selectedOptionId, 10) === correctOptionId;
    const basePoints = parseInt(questionRow.puntos || questionRow.points || '100', 10);
    const timeLimit = parseInt(getServerEnv('TIME_PER_QUESTION') || '45', 10);

    let pointsEarned = 0;
    if (isCorrect) {
      const remainingTime = Math.max(0, timeLimit - timeSpent);
      const speedBonus = timeLimit > 0 ? Math.round((remainingTime / timeLimit) * 50) : 0;
      pointsEarned = basePoints + speedBonus;
    }

    const timestamp = new Date().toISOString();

    // 4. Persistir en Google Apps Script mediante Webhook seguro de backend
    await sendToAppsScript({
      action: 'SAVE_QUESTION_ANSWER',
      legajo: String(legajo),
      fase: parseInt(phase, 10),
      fechaHoraRespuesta: timestamp,
      answer: {
        questionId: parseInt(questionId, 10),
        selectedOptionId: selectedOptionId !== null ? parseInt(selectedOptionId, 10) : null,
        isCorrect,
        pointsEarned,
        timeSpent: parseInt(timeSpent, 10),
        fechaHoraRespuesta: timestamp
      }
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

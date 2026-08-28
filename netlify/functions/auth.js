// ==============================================================================
// NETLIFY FUNCTION: AUTH & USER PROGRESS (/api/auth)
// Valida el token del colaborador y obtiene su progreso de forma segura en servidor
// ==============================================================================
import { fetchSheetValues, getServerEnv } from './utils/googleSheets.js';

export async function handler(event, context) {
  // Configurar cabeceras CORS y JSON
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
    const token = (params.token || params.hash || params.legajo || '').trim().toLowerCase();
    const phase = parseInt(params.phase || getServerEnv('ACTIVE_PHASE') || '1', 10);
    const allowSessionReset = getServerEnv('ALLOW_SESSION_RESET') === 'true';

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ isValid: false, reason: 'TOKEN_MISSING' })
      };
    }

    // Token demo en modo desarrollo
    if ((token === 'demo' || token === 'demo_token_inocuidad_2026') && allowSessionReset) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isValid: true,
          user: {
            legajo: '9999',
            nombre: 'Participante',
            apellido: 'Demo'
          },
          progress: {
            hasRecord: false,
            answers: [],
            score: 0,
            correctCount: 0,
            totalTime: 0,
            isPhaseCompleted: false
          }
        })
      };
    }

    // 1. Cargar lista de participantes desde Google Sheets en servidor
    const usersRange = getServerEnv('GOOGLE_SHEETS_USERS_RANGE') || 'Participantes!A1:Z500';
    const users = await fetchSheetValues(usersRange);

    const foundUser = users.find(u => {
      const uHash = String(u.token_hash || '').trim().toLowerCase();
      const uLegajo = String(u.legajo || '').trim().toLowerCase();
      if (uHash === token) return true;
      if (allowSessionReset && uLegajo === token) return true;
      return false;
    });

    if (!foundUser) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ isValid: false, reason: 'USER_NOT_FOUND' })
      };
    }

    // 2. Consultar progreso en pestaña Resultados de Google Sheets
    const resultsRange = getServerEnv('GOOGLE_SHEETS_RESULTS_RANGE') || 'Resultados!A1:Z1000';
    let progress = {
      hasRecord: false,
      answers: [],
      score: 0,
      correctCount: 0,
      totalTime: 0,
      isPhaseCompleted: false
    };

    try {
      const resultsRows = await fetchSheetValues(resultsRange);
      const userResult = resultsRows.find(r => {
        const rowLegajo = String(r.legajo || '').trim();
        const rowFase = parseInt(r.fase || '1', 10);
        return rowLegajo === String(foundUser.legajo).trim() && rowFase === phase;
      });

      if (userResult) {
        let answers = [];
        const rawJson = userResult['detalle respuestas (json)'] || userResult['detallerespuestas'] || '';
        if (rawJson) {
          try {
            answers = JSON.parse(rawJson);
          } catch (e) {}
        }

        progress = {
          hasRecord: true,
          answers: answers.map(a => ({
            questionId: a.questionId,
            timeSpent: a.timeSpent,
            fechaHoraRespuesta: a.fechaHoraRespuesta
          })),
          score: parseInt(userResult['puntaje obtenido'] || '0', 10),
          correctCount: parseInt(userResult['respuestas correctas'] || '0', 10),
          totalTime: parseInt(userResult['tiempo total (segundos)'] || '0', 10),
          fechaHora: userResult['fecha y hora'] || ''
        };
      }
    } catch (err) {
      console.warn('Advertencia leyendo resultados:', err);
    }

    // 3. Responder solo con los datos públicos necesarios
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
        progress
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

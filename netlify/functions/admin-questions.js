// ==============================================================================
// NETLIFY FUNCTION: ADMIN QUESTIONS API (/api/admin-questions)
// Gestión integral CRUD de preguntas por fase con explicaciones pedagógicas
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getDatabase } from './_db/index.js';
import { verifyAdminToken } from './utils/googleSheets.js';

export async function handler(event, context) {
  const db = getDatabase();
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 🛡️ Seguridad: Exclusivo para administradores autenticados
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const isAdmin = verifyAdminToken(authHeader);

  if (!isAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Acceso no autorizado. Se requiere token de administrador.' })
    };
  }

  // --------------------------------------------------------------------------
  // GET: Obtener lista completa de preguntas (filtrable por ?phase=X)
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      const phase = params.phase ? parseInt(params.phase, 10) : null;

      const questions = await db.getQuestionsAdmin(phase);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          total: questions.length,
          questions
        })
      };
    } catch (error) {
      console.error('[admin-questions] Error obteniendo preguntas:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error obteniendo preguntas', details: error.message })
      };
    }
  }

  // --------------------------------------------------------------------------
  // POST: Operaciones de administración (CREATE, UPDATE, DELETE)
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { action } = body;

      switch (action) {
        case 'CREATE': {
          const questionData = body.question || {};
          const result = await db.createQuestion(questionData);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error creando pregunta' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, question: result.data })
          };
        }

        case 'UPDATE': {
          const { fase, id, question } = body;
          if (fase === undefined || id === undefined) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Fase e ID de pregunta requeridos para actualizar' })
            };
          }
          const result = await db.updateQuestion(fase, id, question || {});
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error actualizando pregunta' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Pregunta actualizada exitosamente' })
          };
        }

        case 'DELETE': {
          const { fase, id } = body;
          if (fase === undefined || id === undefined) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Fase e ID de pregunta requeridos para eliminar' })
            };
          }
          const result = await db.deleteQuestion(fase, id);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error eliminando pregunta' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Pregunta eliminada exitosamente' })
          };
        }

        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Acción '${action}' no reconocida` })
          };
      }
    } catch (error) {
      console.error('[admin-questions] Error en POST:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error procesando solicitud de preguntas', details: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Método no permitido' })
  };
}

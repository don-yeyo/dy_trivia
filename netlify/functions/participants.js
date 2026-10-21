// ==============================================================================
// NETLIFY FUNCTION: PARTICIPANTS ADMIN API (/api/participants)
// Gestión integral CRUD de participantes, regeneración de hashes, marca de email y reset de trivia
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
  // GET: Obtener nómina completa de participantes con estadísticas
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'GET') {
    try {
      const participants = await db.getParticipantsAdmin();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          total: participants.length,
          participants
        })
      };
    } catch (error) {
      console.error('Error obteniendo participantes en /api/participants:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error obteniendo participantes', details: error.message })
      };
    }
  }

  // --------------------------------------------------------------------------
  // POST: Operaciones de administración (CRUD, Hashes, Emails, Reset)
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { action } = body;

      switch (action) {
        case 'CREATE': {
          const participantData = body.participant || {};
          const result = await db.createParticipant(participantData);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error creando participante' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, participant: result.data })
          };
        }

        case 'UPDATE': {
          const { legajo, participant } = body;
          if (!legajo) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Legajo requerido para actualizar' })
            };
          }
          const result = await db.updateParticipant(legajo, participant || {});
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error actualizando participante' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Participante actualizado exitosamente' })
          };
        }

        case 'DELETE': {
          const { legajo } = body;
          if (!legajo) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Legajo requerido para eliminar' })
            };
          }
          const result = await db.deleteParticipant(legajo);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error eliminando participante' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Participante eliminado exitosamente' })
          };
        }

        case 'GENERATE_HASH': {
          const { legajo } = body;
          if (!legajo) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Legajo requerido para generar hash' })
            };
          }
          const result = await db.generateParticipantHash(legajo);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error generando hash' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, token_hash: result.token_hash })
          };
        }

        case 'GENERATE_ALL_MISSING': {
          const result = await db.generateAllMissingHashes();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, updatedCount: result.updatedCount || 0 })
          };
        }

        case 'TOGGLE_EMAIL': {
          const { legajo, emailSent, emailTipo } = body;
          if (!legajo) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Legajo requerido' })
            };
          }
          const result = await db.toggleEmailSent(legajo, emailSent, emailTipo || 'INVITACION');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: result.success, emailSent: !!emailSent, emailTipo: emailTipo || 'INVITACION' })
          };
        }

        case 'RESET_TRIVIA': {
          const { legajo, phase } = body;
          if (!legajo) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Legajo requerido para resetear trivia' })
            };
          }
          const result = await db.resetParticipantTrivia(legajo, phase);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error reseteando trivia' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Trivia reseteada exitosamente para el participante' })
          };
        }

        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Acción desconocida: ${action}` })
          };
      }
    } catch (error) {
      console.error('Error procesando POST en /api/participants:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error procesando solicitud', details: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Método no permitido' })
  };
}

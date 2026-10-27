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
  // GET: Obtener nómina completa de participantes o detalle de respuestas
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'GET') {
    try {
      const action = event.queryStringParameters?.action;
      if (action === 'RESPONSES_DETAIL') {
        const legajo = event.queryStringParameters.legajo;
        const phase = parseInt(event.queryStringParameters.phase || '1', 10);
        if (!legajo) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Legajo requerido' })
          };
        }
        const result = await db.getParticipantResponsesDetail(legajo, phase);
        return {
          statusCode: result.success ? 200 : 400,
          headers,
          body: JSON.stringify(result)
        };
      }

      const targetPhase = event.queryStringParameters?.phase ? parseInt(event.queryStringParameters.phase, 10) : null;
      const [participants, groups] = await Promise.all([
        db.getParticipantsAdmin(targetPhase),
        db.getGroups ? db.getGroups() : Promise.resolve([])
      ]);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          total: participants.length,
          participants,
          groups: groups || []
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

        case 'RESET_TRIVIA_BATCH': {
          const { legajos, phase } = body;
          if (!Array.isArray(legajos) || legajos.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Lista de legajos requerida para reset masivo' })
            };
          }
          const result = await db.resetParticipantTriviaBatch(legajos, phase);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error reseteando trivia masivamente' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, updatedCount: result.updatedCount })
          };
        }

        case 'SET_ACTIVE': {
          const { legajo, activo } = body;
          if (!legajo) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Legajo requerido' })
            };
          }
          const result = await db.setActiveStatus(legajo, activo);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error actualizando estado activo' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, activo: result.activo })
          };
        }

        case 'SET_ACTIVE_BATCH': {
          const { legajos, activo } = body;
          if (!Array.isArray(legajos) || legajos.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Lista de legajos requerida' })
            };
          }
          const result = await db.setActiveStatusBatch(legajos, activo);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error actualizando estados masivos' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, updatedCount: result.updatedCount, activo: result.activo })
          };
        }

        case 'CLEAR_HASH': {
          const { legajo } = body;
          if (!legajo) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Legajo requerido' })
            };
          }
          const result = await db.clearParticipantHash(legajo);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error blanqueando hash' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Hash blanqueado exitosamente' })
          };
        }

        case 'CLEAR_HASH_BATCH': {
          const { legajos } = body;
          if (!Array.isArray(legajos) || legajos.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Lista de legajos requerida' })
            };
          }
          const result = await db.clearParticipantHashBatch(legajos);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error blanqueando hashes masivos' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, updatedCount: result.updatedCount })
          };
        }

        case 'GENERATE_HASH_BATCH': {
          const { legajos } = body;
          if (!Array.isArray(legajos) || legajos.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Lista de legajos requerida' })
            };
          }
          const result = await db.generateParticipantHashBatch(legajos);
          if (!result.success) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: result.error || 'Error regenerando hashes masivos' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, updatedCount: result.updatedCount })
          };
        }

        case 'TOGGLE_EMAIL_BATCH': {
          const { legajos, emailSent, emailTipo } = body;
          if (!Array.isArray(legajos) || legajos.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Lista de legajos requerida' })
            };
          }
          const result = await db.toggleEmailSentBatch(legajos, emailSent, emailTipo || 'INVITACION');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: result.success, updatedCount: result.updatedCount })
          };
        }

        case 'GET_GROUPS': {
          const groups = await db.getGroups();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, groups: groups || [] })
          };
        }

        case 'CREATE_GROUP': {
          const groupData = body.group || {};
          const result = await db.createGroup(groupData);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
          };
        }

        case 'DELETE_GROUP': {
          const { nombre } = body;
          if (!nombre) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Nombre de grupo requerido' })
            };
          }
          const result = await db.deleteGroup(nombre);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
          };
        }

        case 'ASSIGN_GROUP_BATCH': {
          const { legajos, grupo } = body;
          if (!Array.isArray(legajos) || legajos.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Lista de legajos requerida' })
            };
          }
          const result = await db.assignGroupBatch(legajos, grupo);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
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

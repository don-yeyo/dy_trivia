// ==============================================================================
// NETLIFY FUNCTION: CLASSIFICATION & PODIUM (/api/classification)
// Calcula el ranking y podio de ganadores mediante DatabaseAdapter
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getDatabase } from './db/index.js';
import { verifyAdminToken } from './utils/googleSheets.js';

// ⚡ OPTIMIZACIÓN WARM START: Instanciación fuera del handler para reutilización en memoria
const db = getDatabase();

export async function handler(event, context) {
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

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const isAdmin = verifyAdminToken(authHeader);

  // Leer la configuración autorizada desde el motor de base de datos
  const config = await db.getConfig();

  // --------------------------------------------------------------------------
  // GET: Consultar Clasificación
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const phase = isAdmin && params.phase
      ? parseInt(params.phase, 10)
      : parseInt(config.activePhase, 10);
    const topCount = isAdmin && params.topCount
      ? parseInt(params.topCount, 10)
      : parseInt(config.classificationTopCount, 10);

    const isPublished = config.isClassificationPublished;
    const publishedAt = config.classificationPublishedAt;

    // Si ya está publicada oficialmente: accesible por todo el público
    if (isPublished) {
      const data = await db.getClassification(
        phase,
        topCount,
        config.showPartialInTable,
        config.showUnansweredInTable
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isPublished: true,
          publishedAt,
          phase,
          topCount,
          data,
          isAdmin
        })
      };
    }

    // Si NO está publicada pero es el Administrador autenticado:
    if (isAdmin) {
      const previewData = await db.getClassification(
        phase,
        topCount,
        config.showPartialInTable,
        config.showUnansweredInTable
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isPublished: false,
          isAdmin: true,
          previewData,
          message: 'La clasificación aún no ha sido publicada para toda la planta.'
        })
      };
    }

    // Para el público general cuando aún no fue publicada:
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isPublished: false,
        isAdmin: false,
        message: 'La clasificación y podio de ganadores están en proceso de auditoría y se publicarán al finalizar la etapa de evaluación de toda la planta.'
      })
    };
  }

  // --------------------------------------------------------------------------
  // POST: Acciones de Administrador (Determinar o Reiniciar Clasificación)
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'POST') {
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Acceso no autorizado. Se requieren credenciales de administrador.' })
      };
    }

    try {
      const body = JSON.parse(event.body || '{}');
      const action = body.action || 'DETERMINE_CLASSIFICATION';
      const phase = parseInt(body.phase || config.activePhase, 10);
      const topCount = parseInt(body.topCount || config.classificationTopCount, 10);

      if (action === 'RESET_CLASSIFICATION') {
        await db.updateConfig({
          CLASIFICACION_PUBLICADA: 'FALSE',
          FECHA_PUBLICACION_CLASIFICACION: ''
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            isPublished: false,
            message: 'Clasificación reiniciada exitosamente.'
          })
        };
      }

      if (action === 'DETERMINE_CLASSIFICATION') {
        const data = await db.getClassification(
          phase,
          topCount,
          config.showPartialInTable,
          config.showUnansweredInTable
        );
        const publishedAt = new Date().toISOString();

        await db.updateConfig({
          CLASIFICACION_PUBLICADA: 'TRUE',
          FECHA_PUBLICACION_CLASIFICACION: publishedAt,
          CLASIFICACION_TOP_COUNT: String(topCount)
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            isPublished: true,
            publishedAt,
            phase,
            topCount,
            data
          })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Acción desconocida: ${action}` })
      };

    } catch (err) {
      console.error('Error procesando clasificación:', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error determinando clasificación', details: err.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Método no permitido' })
  };
}

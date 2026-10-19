// ==============================================================================
// NETLIFY FUNCTION: CONFIG (/api/config)
// Entrega al frontend la configuración de la trivia dictada por el motor de BD
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getDatabase } from './_db/index.js';
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

  // --------------------------------------------------------------------------
  // POST: Actualizar Configuración (Exclusivo Administrador)
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'POST') {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const isAdmin = verifyAdminToken(authHeader);

    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Acceso no autorizado. Se requieren credenciales de administrador.' })
      };
    }

    try {
      const body = JSON.parse(event.body || '{}');
      const updates = {};

      if (body.activePhase !== undefined) {
        const p = parseInt(body.activePhase, 10);
        if (!isNaN(p) && p >= 1 && p <= 3) updates['FASE_ACTIVA'] = String(p);
      }

      if (body.isPhaseClosed !== undefined) {
        updates['FASE_CERRADA'] = body.isPhaseClosed ? 'TRUE' : 'FALSE';
      }

      if (body.isClassificationPublished !== undefined) {
        const val = !!body.isClassificationPublished;
        updates['CLASIFICACION_PUBLICADA'] = val ? 'TRUE' : 'FALSE';
        if (val) {
          updates['FECHA_PUBLICACION_CLASIFICACION'] = new Date().toISOString();
        } else {
          updates['FECHA_PUBLICACION_CLASIFICACION'] = '';
        }
      }

      if (body.classificationTopCount !== undefined) {
        const c = parseInt(body.classificationTopCount, 10);
        if (!isNaN(c) && c >= 3) updates['CLASIFICACION_TOP_COUNT'] = String(c);
      }

      if (body.timePerQuestion !== undefined) {
        const t = parseInt(body.timePerQuestion, 10);
        if (!isNaN(t) && t >= 0) updates['TIEMPO_POR_PREGUNTA'] = String(t);
      }

      if (body.shuffleQuestions !== undefined) {
        updates['MEZCLAR_PREGUNTAS'] = body.shuffleQuestions ? 'TRUE' : 'FALSE';
      }

      if (body.showPartialInTable !== undefined) {
        updates['MOSTRAR_PARCIALES_EN_TABLA'] = body.showPartialInTable ? 'TRUE' : 'FALSE';
      }

      if (body.showUnansweredInTable !== undefined) {
        updates['MOSTRAR_NO_RESPONDIDOS_EN_TABLA'] = body.showUnansweredInTable ? 'TRUE' : 'FALSE';
      }

      if (body.hideSummaryAnswered !== undefined) {
        updates['OCULTAR_RESUMEN_RESPONDIDAS'] = body.hideSummaryAnswered ? 'TRUE' : 'FALSE';
      }

      if (body.hideSummaryTime !== undefined) {
        updates['OCULTAR_RESUMEN_TIEMPO'] = body.hideSummaryTime ? 'TRUE' : 'FALSE';
      }

      const synced = await db.updateConfig(updates);
      const updatedConfig = await db.getConfig();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          syncedWithDatabase: synced,
          message: 'Configuración actualizada exitosamente',
          config: updatedConfig
        })
      };
    } catch (err) {
      console.error('Error guardando configuración:', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error guardando configuración', details: err.message })
      };
    }
  }

  // --------------------------------------------------------------------------
  // GET: Obtener Configuración de la Trivia
  // --------------------------------------------------------------------------
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const config = await db.getConfig();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        activePhase: config.activePhase,
        isPhaseClosed: config.isPhaseClosed,
        isClassificationPublished: config.isClassificationPublished,
        classificationTopCount: config.classificationTopCount,
        showPartialInTable: config.showPartialInTable,
        showUnansweredInTable: config.showUnansweredInTable,
        classificationPublishedAt: config.classificationPublishedAt,
        timePerQuestion: config.timePerQuestion,
        shuffleQuestions: config.shuffleQuestions,
        hideSummaryAnswered: config.hideSummaryAnswered,
        hideSummaryTime: config.hideSummaryTime
      })
    };
  } catch (err) {
    console.error('Error obteniendo config:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error cargando configuración', details: err.message })
    };
  }
}

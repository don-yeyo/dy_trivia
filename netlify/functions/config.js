// ==============================================================================
// NETLIFY FUNCTION: CONFIG (/api/config)
// Entrega al frontend la configuración de la trivia dictada por Google Sheets
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { fetchTriviaConfig, updateTriviaConfig, verifyAdminToken } from './utils/googleSheets.js';

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
  // POST: Actualizar Configuración en Google Sheets (Exclusivo Administrador)
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
      const sheetUpdates = {};
      const frontendOverrides = {};

      if (body.activePhase !== undefined) {
        const p = parseInt(body.activePhase, 10);
        if (!isNaN(p) && p >= 1 && p <= 3) {
          sheetUpdates['FASE_ACTIVA'] = String(p);
          frontendOverrides.activePhase = p;
        }
      }

      if (body.isPhaseClosed !== undefined) {
        const val = !!body.isPhaseClosed;
        sheetUpdates['FASE_CERRADA'] = val ? 'TRUE' : 'FALSE';
        frontendOverrides.isPhaseClosed = val;
      }

      if (body.classificationTopCount !== undefined) {
        const c = parseInt(body.classificationTopCount, 10);
        if (!isNaN(c) && c >= 3) {
          sheetUpdates['CLASIFICACION_TOP_COUNT'] = String(c);
          frontendOverrides.classificationTopCount = c;
        }
      }

      if (body.timePerQuestion !== undefined) {
        const t = parseInt(body.timePerQuestion, 10);
        if (!isNaN(t) && t >= 0) {
          sheetUpdates['TIEMPO_POR_PREGUNTA'] = String(t);
          frontendOverrides.timePerQuestion = t;
        }
      }

      if (body.shuffleQuestions !== undefined) {
        const s = !!body.shuffleQuestions;
        sheetUpdates['MEZCLAR_PREGUNTAS'] = s ? 'TRUE' : 'FALSE';
        frontendOverrides.shuffleQuestions = s;
      }

      if (body.showPartialInTable !== undefined) {
        const val = !!body.showPartialInTable;
        sheetUpdates['MOSTRAR_PARCIALES_EN_TABLA'] = val ? 'TRUE' : 'FALSE';
        frontendOverrides.showPartialInTable = val;
      }

      if (body.showUnansweredInTable !== undefined) {
        const val = !!body.showUnansweredInTable;
        sheetUpdates['MOSTRAR_NO_RESPONDIDOS_EN_TABLA'] = val ? 'TRUE' : 'FALSE';
        frontendOverrides.showUnansweredInTable = val;
      }

      if (body.hideSummaryAnswered !== undefined) {
        const val = !!body.hideSummaryAnswered;
        sheetUpdates['OCULTAR_RESUMEN_RESPONDIDAS'] = val ? 'TRUE' : 'FALSE';
        frontendOverrides.hideSummaryAnswered = val;
      }

      if (body.hideSummaryTime !== undefined) {
        const val = !!body.hideSummaryTime;
        sheetUpdates['OCULTAR_RESUMEN_TIEMPO'] = val ? 'TRUE' : 'FALSE';
        frontendOverrides.hideSummaryTime = val;
      }

      await updateTriviaConfig(sheetUpdates, frontendOverrides);
      const updatedConfig = await fetchTriviaConfig();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Configuración actualizada exitosamente en Google Sheets',
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
    const config = await fetchTriviaConfig();

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

// ==============================================================================
// NETLIFY FUNCTION: CONFIG (/api/config)
// Entrega al frontend la configuración de la trivia dictada por Google Sheets
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { fetchTriviaConfig } from './utils/googleSheets.js';

export async function handler(event, context) {
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

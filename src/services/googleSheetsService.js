// ==============================================================================
// SERVICIO DE INTEGRACIÓN CON GOOGLE SHEETS API & WEB APIS
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import Papa from 'papaparse';

/**
 * Obtiene los valores de un rango o pestaña desde Google Sheets API v4
 * @param {string} spreadsheetId - ID del documento de Google Sheets
 * @param {string} range - Nombre de la pestaña o rango (ej: 'Preguntas!A1:Z100')
 * @param {string} apiKey - Clave de API de Google Cloud Console
 * @returns {Promise<Array<Object>>} Lista de filas parseadas con cabeceras como claves
 */
export async function fetchFromGoogleSheetsAPI(spreadsheetId, range, apiKey) {
  if (!spreadsheetId || !apiKey) {
    throw new Error('Faltan credenciales: VITE_GOOGLE_SHEETS_SPREADSHEET_ID o VITE_GOOGLE_SHEETS_API_KEY no están definidas.');
  }

  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error en Google Sheets API [${response.status}]: ${errorBody}`);
  }

  const data = await response.json();
  const rows = data.values || [];

  if (rows.length === 0) {
    return [];
  }

  // La primera fila contiene los encabezados de columnas
  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  const objects = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
      continue; // Saltar filas vacías
    }

    const item = {};
    headers.forEach((header, colIndex) => {
      item[header] = row[colIndex] !== undefined ? String(row[colIndex]).trim() : '';
    });
    objects.push(item);
  }

  return objects;
}

/**
 * Obtiene los datos desde una URL de Google Sheets publicada como CSV o Google Visualization API
 * @param {string} url - URL publicada de la hoja o endpoint GViz
 * @returns {Promise<Array<Object>>}
 */
export async function fetchFromPublishedCSV(url) {
  if (!url) {
    throw new Error('URL de Google Sheets no provista.');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error descargando CSV publicado [${response.status}]`);
  }

  const csvText = await response.text();
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  });

  return parsed.data;
}

/**
 * Envía datos de una sesión completada o respuesta individual al endpoint de Google Apps Script Webhook
 * @param {string} endpoint - URL del Web App de Apps Script
 * @param {Object} payload - Objeto con usuario, fase, puntaje, tiempo y respuestas
 */
export async function submitResultsToAppsScript(endpoint, payload) {
  if (!endpoint) return false;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors', // Apps Script requiere no-cors o redirección 302
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.warn('No se pudo enviar resultado a Google Apps Script:', err);
    return false;
  }
}

/**
 * Consulta la pestaña 'Resultados' de Google Sheets para obtener el progreso exacto y respuestas ya dadas por un colaborador
 * @param {string} legajo - Legajo del colaborador
 * @param {number} phase - Fase activa consultada
 * @returns {Promise<Object>} Objeto con answers (array), score, correctCount, totalTime, isCompleted
 */
export async function fetchUserProgressFromResults(legajo, phase = 1) {
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'csv';
  const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
  const resultsRange = import.meta.env.VITE_GOOGLE_SHEETS_RESULTS_RANGE || 'Resultados!A1:Z1000';

  try {
    let rows = [];

    if (dataSource === 'google_sheets_api' && spreadsheetId && apiKey) {
      rows = await fetchFromGoogleSheetsAPI(spreadsheetId, resultsRange, apiKey);
    }

    if (!rows || rows.length === 0) {
      return {
        hasRecord: false,
        answers: [],
        score: 0,
        correctCount: 0,
        totalTime: 0,
        isCompleted: false
      };
    }

    // Buscar la fila correspondiente al legajo y fase
    const targetRow = rows.find(r => {
      const rowLegajo = String(r.legajo || '').trim();
      const rowFase = parseInt(r.fase || '1', 10);
      return rowLegajo === String(legajo).trim() && rowFase === parseInt(phase, 10);
    });

    if (!targetRow) {
      return {
        hasRecord: false,
        answers: [],
        score: 0,
        correctCount: 0,
        totalTime: 0,
        isCompleted: false
      };
    }

    // Parsear el detalle de respuestas (JSON)
    let answers = [];
    const jsonField = targetRow['detalle respuestas (json)'] || targetRow['detallerespuestas'] || targetRow['respuestas'] || '';
    if (jsonField) {
      try {
        answers = JSON.parse(jsonField);
      } catch (err) {
        console.warn('Error parseando JSON de respuestas:', err);
      }
    }

    const score = parseInt(targetRow['puntaje obtenido'] || targetRow['puntaje'] || '0', 10);
    const correctCount = parseInt(targetRow['respuestas correctas'] || '0', 10);
    const totalTime = parseInt(targetRow['tiempo total (segundos)'] || targetRow['tiempo'] || '0', 10);

    return {
      hasRecord: true,
      answers,
      score,
      correctCount,
      totalTime,
      fechaHora: targetRow['fecha y hora'] || targetRow['fechahora'] || ''
    };
  } catch (error) {
    console.warn('No se pudo consultar el progreso de resultados en Google Sheets:', error);
    return {
      hasRecord: false,
      answers: [],
      score: 0,
      correctCount: 0,
      totalTime: 0,
      isCompleted: false
    };
  }
}


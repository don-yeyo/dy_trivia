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
 * Envía datos de una sesión completada al endpoint de Google Apps Script Webhook
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

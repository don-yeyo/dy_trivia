// ==============================================================================
// BACKEND UTILS - GOOGLE SHEETS API & APP SCRIPT
// Don Yeyo S.A. | Trivia Inocuidad 2026 (Serverless Backend)
// ==============================================================================
import crypto from 'crypto';

/**
 * Obtiene variables de entorno del servidor (soporta tanto formato SERVER como VITE_ en Netlify)
 */
export function getServerEnv(key) {
  return process.env[key] || process.env[`VITE_${key}`] || '';
}

/**
 * Consulta un rango de Google Sheets API v4 usando credenciales de backend
 */
export async function fetchSheetValues(range) {
  const spreadsheetId = getServerEnv('GOOGLE_SHEETS_SPREADSHEET_ID');
  const apiKey = getServerEnv('GOOGLE_SHEETS_API_KEY');

  if (!spreadsheetId || !apiKey) {
    throw new Error('Faltan credenciales de Google Sheets en las variables de entorno de Netlify (GOOGLE_SHEETS_SPREADSHEET_ID / GOOGLE_SHEETS_API_KEY).');
  }

  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;

  const appUrl = getServerEnv('URL') || getServerEnv('DEPLOY_URL') || 'https://dy-inocuidad.netlify.app';

  const response = await fetch(url, {
    headers: {
      'Referer': appUrl.endsWith('/') ? appUrl : `${appUrl}/`,
      'Origin': appUrl
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error en Google Sheets API [${response.status}]: ${errText}`);
  }

  const data = await response.json();
  const rows = data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  const objects = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
      continue;
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
 * Genera el hash de un usuario para validación
 */
export function generateUserHash(legajo, apellido, nombre) {
  const seedPhrase = getServerEnv('SEED_PHRASE') || 'DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO';
  const cleanLegajo = String(legajo || '').trim();
  const cleanApellido = String(apellido || '').trim().toUpperCase();
  const cleanNombre = String(nombre || '').trim().toUpperCase();

  const rawString = `${seedPhrase}_${cleanLegajo}_${cleanApellido}_${cleanNombre}`;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}

/**
 * Envía una respuesta o resultado al Webhook de Google Apps Script desde el backend
 */
export async function sendToAppsScript(payload) {
  const endpoint = getServerEnv('GOOGLE_APPS_SCRIPT_ENDPOINT');
  if (!endpoint) return false;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (err) {
    console.error('Error enviando a Apps Script:', err);
    return false;
  }
}

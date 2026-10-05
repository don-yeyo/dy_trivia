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

/**
 * Valores de configuración predeterminados de la trivia (Fallback Seguro)
 */
export const DEFAULT_TRIVIA_CONFIG = {
  activePhase: 1,
  isPhaseClosed: false,
  isClassificationPublished: false,
  classificationTopCount: 30,
  showPartialInTable: true,
  showUnansweredInTable: false,
  classificationPublishedAt: null,
  timePerQuestion: 45,
  shuffleQuestions: false,
  hideSummaryAnswered: true,
  hideSummaryTime: false
};

/**
 * Lee la configuración dinámica desde la pestaña 'Configuracion' de Google Sheets.
 * El backend es la única fuente de verdad: el usuario no puede manipular estos datos.
 */
export async function fetchTriviaConfig() {
  const configRange = getServerEnv('GOOGLE_SHEETS_CONFIG_RANGE') || 'Configuracion!A1:C30';

  const config = { ...DEFAULT_TRIVIA_CONFIG };

  try {
    const rows = await fetchSheetValues(configRange);
    if (!rows || rows.length === 0) {
      return config;
    }

    rows.forEach(r => {
      const rawKey = String(r.clave || r.key || r.parametro || '').trim().toUpperCase();
      const rawValue = String(r.valor || r.value || '').trim();

      if (!rawKey) return;

      switch (rawKey) {
        case 'FASE_ACTIVA':
        case 'ACTIVE_PHASE': {
          const p = parseInt(rawValue, 10);
          if (!isNaN(p) && p >= 1 && p <= 3) config.activePhase = p;
          break;
        }
        case 'FASE_CERRADA':
        case 'IS_PHASE_CLOSED': {
          config.isPhaseClosed = rawValue.toLowerCase() === 'true' || rawValue === '1' || rawValue.toLowerCase() === 'si';
          break;
        }
        case 'CLASIFICACION_PUBLICADA':
        case 'IS_CLASSIFICATION_PUBLISHED': {
          config.isClassificationPublished = rawValue.toLowerCase() === 'true' || rawValue === '1' || rawValue.toLowerCase() === 'si';
          break;
        }
        case 'CLASIFICACION_TOP_COUNT':
        case 'TOP_COUNT': {
          const c = parseInt(rawValue, 10);
          if (!isNaN(c) && c >= 3) config.classificationTopCount = c;
          break;
        }
        case 'MOSTRAR_PARCIALES_EN_TABLA': {
          config.showPartialInTable = rawValue.toLowerCase() !== 'false' && rawValue !== '0' && rawValue.toLowerCase() !== 'no';
          break;
        }
        case 'MOSTRAR_NO_RESPONDIDOS_EN_TABLA': {
          config.showUnansweredInTable = rawValue.toLowerCase() === 'true' || rawValue === '1' || rawValue.toLowerCase() === 'si';
          break;
        }
        case 'FECHA_PUBLICACION_CLASIFICACION':
        case 'PUBLISHED_AT': {
          config.classificationPublishedAt = rawValue || null;
          break;
        }
        case 'TIEMPO_POR_PREGUNTA':
        case 'TIME_PER_QUESTION': {
          const t = parseInt(rawValue, 10);
          if (!isNaN(t) && t >= 0) config.timePerQuestion = t;
          break;
        }
        case 'MEZCLAR_PREGUNTAS':
        case 'SHUFFLE_QUESTIONS': {
          config.shuffleQuestions = rawValue.toLowerCase() === 'true' || rawValue === '1';
          break;
        }
        case 'OCULTAR_RESUMEN_RESPONDIDAS':
        case 'HIDE_SUMMARY_ANSWERED': {
          config.hideSummaryAnswered = rawValue.toLowerCase() === 'true' || rawValue === '1' || rawValue.toLowerCase() === 'si';
          break;
        }
        case 'OCULTAR_RESUMEN_TIEMPO':
        case 'HIDE_SUMMARY_TIME': {
          config.hideSummaryTime = rawValue.toLowerCase() === 'true' || rawValue === '1' || rawValue.toLowerCase() === 'si';
          break;
        }
        default:
          break;
      }
    });
  } catch (err) {
    console.warn('Advertencia: No se pudo leer la pestaña Configuracion de Google Sheets. Usando defaults seguros:', err.message);
  }

  return config;
}

/**
 * Actualiza una o más claves en la pestaña 'Configuracion' de Google Sheets mediante Apps Script.
 */
export async function updateTriviaConfig(updates = {}) {
  return await sendToAppsScript({
    action: 'UPDATE_CONFIG',
    updates
  });
}

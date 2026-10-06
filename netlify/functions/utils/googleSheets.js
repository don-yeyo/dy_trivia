// ==============================================================================
// BACKEND UTILS - GOOGLE SHEETS API & APP SCRIPT
// Don Yeyo S.A. | Trivia Inocuidad 2026 (Serverless Backend)
// ==============================================================================
import crypto from 'crypto';
import fs from 'fs';

/**
 * Obtiene variables de entorno del servidor (soporta tanto formato SERVER como VITE_ en Netlify)
 */
export function getServerEnv(key) {
  return process.env[key] || process.env[`VITE_${key}`] || '';
}

/**
 * Consulta un rango de Google Sheets API v4 devolviendo las filas en bruto (values)
 */
export async function fetchRawSheetValues(range) {
  const spreadsheetId = getServerEnv('GOOGLE_SHEETS_SPREADSHEET_ID');
  const apiKey = getServerEnv('GOOGLE_SHEETS_API_KEY');

  if (!spreadsheetId || !apiKey) {
    throw new Error('Faltan credenciales de Google Sheets en variables de entorno (GOOGLE_SHEETS_SPREADSHEET_ID / GOOGLE_SHEETS_API_KEY).');
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
  return data.values || [];
}

/**
 * Consulta un rango de Google Sheets API v4 usando credenciales de backend y mapeando a objetos según headers
 */
export async function fetchSheetValues(range) {
  const rows = await fetchRawSheetValues(range);
  if (!rows || rows.length === 0) return [];

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
  if (!endpoint) {
    console.warn('[sendToAppsScript] GOOGLE_APPS_SCRIPT_ENDPOINT no está configurada.');
    return false;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`[sendToAppsScript] Error HTTP de Apps Script: ${response.status}`);
      return false;
    }

    const data = await response.json().catch(() => null);
    if (data && data.status === 'error') {
      console.error('[sendToAppsScript] Error reportado por Apps Script:', data.message);
      return false;
    }

    if (payload.action === 'UPDATE_CONFIG' && data && data.message === 'OK') {
      console.warn('[sendToAppsScript] El Webhook respondió OK pero no procesó UPDATE_CONFIG. Requiere desplegar la nueva versión en Google Apps Script.');
    }

    return true;
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
    const rawRows = await fetchRawSheetValues(configRange);
    if (!rawRows || rawRows.length === 0) {
      return config;
    }

    // Detectar inteligentemente si la primera fila es encabezado (ej. "clave", "valor")
    const firstCell = String((rawRows[0] && rawRows[0][0]) || '').toLowerCase().trim();
    const isHeader = (firstCell === 'clave' || firstCell === 'key' || firstCell === 'parametro');
    const startIdx = isHeader ? 1 : 0;

    for (let i = startIdx; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const rawKey = String(row[0] || '').trim().toUpperCase();
      const rawValue = String(row[1] !== undefined ? row[1] : '').trim();

      if (!rawKey) continue;

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
    }
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

/**
 * Valida un token de sesión de admin generado por /api/admin-auth
 */
export function verifyAdminToken(token) {
  if (!token) return false;

  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const parts = cleanToken.split('.');
    if (parts.length !== 2) return false;

    const [encodedPayload, receivedSig] = parts;
    const payload = Buffer.from(encodedPayload, 'base64').toString('utf8');
    const [username, expiresStr] = payload.split('_');

    const expiresAt = parseInt(expiresStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false; // Token expirado
    }

    const seedPhrase = getServerEnv('SEED_PHRASE') || 'DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO';
    const expectedSig = crypto.createHmac('sha256', seedPhrase).update(payload).digest('hex');

    const expectedUser = getServerEnv('ADMIN_USER') || 'admin';
    return (username === expectedUser && crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig)));
  } catch (e) {
    return false;
  }
}


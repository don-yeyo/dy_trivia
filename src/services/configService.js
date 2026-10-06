// ==============================================================================
// SERVICE: CONFIG SERVICE
// Obtiene y sincroniza la configuración de la trivia desde Google Sheets (Backend First)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { fetchRawFromGoogleSheetsAPI } from './googleSheetsService';

export const DEFAULT_CONFIG = {
  activePhase: 1,
  isPhaseClosed: false,
  isClassificationPublished: false,
  classificationTopCount: 30,
  showPartialInTable: true,
  showUnansweredInTable: false,
  timePerQuestion: 45,
  shuffleQuestions: false,
  hideSummaryAnswered: true,
  hideSummaryTime: false,
  publishedAt: null
};

/**
 * Consulta la configuración autorizada viva desde el backend (/api/config)
 * con fallback de desarrollo local a Google Sheets API v4.
 * 🛡️ REGLA: Nunca usa ni pisa con localStorage para garantizar seguridad y fidelidad con la planilla.
 */
export async function fetchAppConfig() {
  // Limpieza proactiva de cualquier residuo previo en almacenamiento local
  try {
    localStorage.removeItem('dy_trivia_app_config');
  } catch (e) {}

  try {
    // 1. Intento primario: Backend Serverless (/api/config)
    const response = await fetch('/api/config');
    const contentType = response.headers.get('content-type') || '';

    if (response.ok && contentType.includes('application/json')) {
      const data = await response.json();
      if (data && data.success) {
        return {
          activePhase: data.activePhase || 1,
          isPhaseClosed: Boolean(data.isPhaseClosed),
          isClassificationPublished: Boolean(data.isClassificationPublished),
          classificationTopCount: data.classificationTopCount || 30,
          showPartialInTable: data.showPartialInTable !== false,
          showUnansweredInTable: Boolean(data.showUnansweredInTable),
          timePerQuestion: data.timePerQuestion !== undefined ? data.timePerQuestion : 45,
          shuffleQuestions: Boolean(data.shuffleQuestions),
          hideSummaryAnswered: Boolean(data.hideSummaryAnswered),
          hideSummaryTime: Boolean(data.hideSummaryTime),
          publishedAt: data.classificationPublishedAt || null
        };
      }
    }
  } catch (err) {
    // Si no está corriendo el backend serverless (ej: Vite en dev puro), se activa el fallback
  }

  // 2. Fallback de desarrollo local: consultar Google Sheets API v4 directamente en bruto
  const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
  const configRange = import.meta.env.VITE_GOOGLE_SHEETS_CONFIG_RANGE || 'Configuracion!A1:C30';

  if (spreadsheetId && apiKey) {
    try {
      const rawRows = await fetchRawFromGoogleSheetsAPI(spreadsheetId, configRange, apiKey);
      if (rawRows && rawRows.length > 0) {
        const config = { ...DEFAULT_CONFIG };

        // Detectar si la primera fila es encabezado (ej: "clave", "valor") o ya es un dato (ej: "FASE_ACTIVA")
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
              config.publishedAt = rawValue || null;
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

        return config;
      }
    } catch (sheetErr) {
      console.warn('Fallback a defaults para configuración de trivia:', sheetErr.message);
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Guarda los parámetros de configuración en el backend (/api/config)
 * para persistirlos en la pestaña 'Configuracion' de Google Sheets.
 * 🛡️ REGLA: No utiliza localStorage para evitar desincronizaciones de datos.
 */
export async function saveAppConfig(updates = {}) {
  const token = sessionStorage.getItem('dy_trivia_admin_token') || localStorage.getItem('dy_trivia_admin_token') || '';

  // Enviar al backend serverless
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      return {
        success: true,
        syncedWithSheet: data.syncedWithSheet !== false,
        warning: data.warning || '',
        message: data.message || '',
        config: data.config || updates
      };
    }

    const errMsg = data.error || (res.status === 403 ? 'Sesión de administrador inválida o expirada. Por favor vuelva a iniciar sesión.' : `Error del servidor (${res.status})`);
    return {
      success: false,
      syncedWithSheet: false,
      error: errMsg,
      config: updates
    };
  } catch (err) {
    console.warn('Error guardando en backend /api/config:', err);
    return { success: false, syncedWithSheet: false, error: err.message, config: updates };
  }
}

// ==============================================================================
// SERVICE: CONFIG SERVICE
// Obtiene y sincroniza la configuración de la trivia desde Google Sheets (Backend First)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { fetchFromGoogleSheetsAPI } from './googleSheetsService';

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
 * Consulta la configuración autorizada desde el backend (/api/config)
 * con fallback de desarrollo local a Google Sheets API v4.
 */
export async function fetchAppConfig() {
  try {
    // 1. Intento primario: Backend Serverless (/api/config)
    const response = await fetch('/api/config');
    const contentType = response.headers.get('content-type') || '';

    if (response.ok && contentType.includes('application/json')) {
      const data = await response.json();
      if (data && data.success) {
        return {
          activePhase: data.activePhase || 1,
          isPhaseClosed: !!data.isPhaseClosed,
          isClassificationPublished: !!data.isClassificationPublished,
          classificationTopCount: data.classificationTopCount || 30,
          showPartialInTable: data.showPartialInTable !== false,
          showUnansweredInTable: !!data.showUnansweredInTable,
          timePerQuestion: data.timePerQuestion !== undefined ? data.timePerQuestion : 45,
          shuffleQuestions: !!data.shuffleQuestions,
          hideSummaryAnswered: !!data.hideSummaryAnswered,
          hideSummaryTime: !!data.hideSummaryTime,
          publishedAt: data.classificationPublishedAt || null
        };
      }
    }
  } catch (err) {
    // Si no está corriendo el backend serverless (ej: Vite puro en dev), se activa el fallback
  }

  // 2. Fallback de desarrollo local: consultar Google Sheets API v4 directamente
  const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
  const configRange = import.meta.env.VITE_GOOGLE_SHEETS_CONFIG_RANGE || 'Configuracion!A1:C30';

  if (spreadsheetId && apiKey) {
    try {
      const rows = await fetchFromGoogleSheetsAPI(spreadsheetId, configRange, apiKey);
      if (rows && rows.length > 0) {
        const config = { ...DEFAULT_CONFIG };

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
        });

        return config;
      }
    } catch (sheetErr) {
      console.warn('Fallback a defaults para configuración de trivia:', sheetErr.message);
    }
  }

  // 3. Fallback final seguro
  return DEFAULT_CONFIG;
}

import CryptoJS from 'crypto-js';
import Papa from 'papaparse';
import { fetchFromGoogleSheetsAPI, fetchFromPublishedCSV } from './googleSheetsService';

const SEED_PHRASE = import.meta.env.VITE_SEED_PHRASE || "DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO";

/**
 * Genera el Hash criptográfico SHA256 para un colaborador
 * Formula: SHA256(SEED_PHRASE + legajo + apellido + nombre)
 */
export function generateUserHash(legajo, apellido, nombre) {
  const rawString = `${SEED_PHRASE.trim()}_${String(legajo).trim()}_${String(apellido).trim().toUpperCase()}_${String(nombre).trim().toUpperCase()}`;
  return CryptoJS.SHA256(rawString).toString(CryptoJS.enc.Hex);
}

/**
 * Carga la lista de usuarios participantes desde CSV local, Google Sheets API v4 o Google Sheets CSV publicado
 */
export async function fetchUsersList() {
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'csv';
  const googleSheetUrl = import.meta.env.VITE_GOOGLE_SHEET_USERS_URL;
  const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
  const range = import.meta.env.VITE_GOOGLE_SHEETS_USERS_RANGE || 'Participantes!A1:Z500';

  try {
    let rows = [];

    // Modo 1: Google Sheets API v4 oficial (con API Key y Spreadsheet ID)
    if (dataSource === 'google_sheets_api' && spreadsheetId && apiKey) {
      rows = await fetchFromGoogleSheetsAPI(spreadsheetId, range, apiKey);
    }
    // Modo 2: Google Sheets URL publicado como CSV o GViz
    else if ((dataSource === 'google_sheets' || dataSource === 'google_sheets_csv') && googleSheetUrl) {
      rows = await fetchFromPublishedCSV(googleSheetUrl);
    }
    // Modo 3: Archivo CSV local en /public/data/usuarios_participantes.csv
    else {
      const res = await fetch('/data/usuarios_participantes.csv');
      if (res.ok) {
        const csvData = await res.text();
        const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
        rows = parsed.data;
      } else {
        return getFallbackUsers();
      }
    }

    if (!rows || rows.length === 0) {
      return getFallbackUsers();
    }

    return rows.map(user => {
      const legajo = String(user.legajo || '').trim();
      const apellido = String(user.apellido || '').trim();
      const nombre = String(user.nombre || '').trim();
      const calculatedHash = generateUserHash(legajo, apellido, nombre);

      return {
        legajo,
        apellido,
        nombre,
        token_hash: user.token_hash || calculatedHash,
        fase1: user.fase1 || '',
        fase2: user.fase2 || '',
        fase3: user.fase3 || ''
      };
    });
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    return getFallbackUsers();
  }
}

/**
 * Usuarios por defecto de respaldo si no hay conexión
 */
function getFallbackUsers() {
  return [
    { legajo: "1001", apellido: "Pérez", nombre: "Juan", token_hash: generateUserHash("1001", "Pérez", "Juan"), fase1: "", fase2: "", fase3: "" },
    { legajo: "1002", apellido: "González", nombre: "María", token_hash: generateUserHash("1002", "González", "María"), fase1: "", fase2: "", fase3: "" },
    { legajo: "1003", apellido: "Rodríguez", nombre: "Carlos", token_hash: generateUserHash("1003", "Rodríguez", "Carlos"), fase1: "", fase2: "", fase3: "" },
    { legajo: "1004", apellido: "López", nombre: "Ana", token_hash: generateUserHash("1004", "López", "Ana"), fase1: "", fase2: "", fase3: "" },
    { legajo: "1005", apellido: "Martínez", nombre: "Lucas", token_hash: generateUserHash("1005", "Martínez", "Lucas"), fase1: "", fase2: "", fase3: "" },
    { legajo: "9999", apellido: "Demo", nombre: "Participante", token_hash: "demo_token_inocuidad_2026", fase1: "", fase2: "", fase3: "" }
  ];
}

/**
 * Valida si el token recibido por URL pertenece a un usuario válido consultando el backend seguro
 */
export async function validateUserToken(token, activePhase = 1) {
  const allowSessionReset = import.meta.env.VITE_ALLOW_SESSION_RESET === 'true';
  const effectiveToken = token || (allowSessionReset ? 'demo' : '');

  if (!effectiveToken) {
    return { isValid: false, reason: 'TOKEN_MISSING' };
  }

  try {
    // 1. Consultar endpoint seguro de backend (Netlify Functions)
    const res = await fetch(`/api/auth?token=${encodeURIComponent(effectiveToken)}&phase=${activePhase}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.isValid) {
        return {
          isValid: true,
          user: data.user,
          progress: data.progress || { hasRecord: false, answers: [] }
        };
      }
    } else if (res.status === 404) {
      return { isValid: false, reason: 'USER_NOT_FOUND' };
    }
  } catch (backendError) {
    console.warn('Backend serverless no disponible, evaluando fallback:', backendError);
  }

  // 2. Fallback Offline / Desarrollo si no hay backend activo
  if (effectiveToken === 'demo' || effectiveToken === 'demo_token_inocuidad_2026') {
    if (allowSessionReset) {
      return {
        isValid: true,
        user: { legajo: "9999", apellido: "Demo", nombre: "Participante" },
        progress: { hasRecord: false, answers: [] }
      };
    }
  }

  const users = await fetchUsersList();
  const cleanToken = String(effectiveToken).trim().toLowerCase();
  
  const foundUser = users.find(u => {
    const userHash = String(u.token_hash || '').trim().toLowerCase();
    const userLegajo = String(u.legajo || '').trim().toLowerCase();
    if (userHash === cleanToken) return true;
    if (allowSessionReset && userLegajo === cleanToken) return true;
    return false;
  });

  if (!foundUser) {
    return { isValid: false, reason: 'USER_NOT_FOUND' };
  }

  return {
    isValid: true,
    user: {
      legajo: String(foundUser.legajo),
      nombre: String(foundUser.nombre),
      apellido: String(foundUser.apellido)
    },
    progress: { hasRecord: false, answers: [] }
  };
}

/**
 * Registra en tiempo real cada respuesta individual en el backend seguro
 * El backend se encarga de validar la corrección y persistir en Google Sheets
 */
export async function recordPhaseQuestionAnswer(legajo, activePhase, answerData) {
  try {
    const res = await fetch('/api/submit-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legajo: String(legajo),
        phase: parseInt(activePhase, 10),
        questionId: answerData.questionId,
        selectedOptionId: answerData.selectedOptionId,
        timeSpent: answerData.timeSpent || 0
      })
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Error enviando respuesta a /api/submit-answer:', err);
  }

  return {
    success: false,
    pointsEarned: 0,
    isCorrect: false
  };
}

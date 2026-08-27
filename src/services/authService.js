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
 * Valida si el token recibido por URL pertenece a un usuario válido y el estado de la fase activa
 */
export async function validateUserToken(token, activePhase = 1) {
  if (!token) {
    return { isValid: false, reason: 'TOKEN_MISSING' };
  }

  // Token demo para testing rápido
  if (token === 'demo' || token === 'demo_token_inocuidad_2026') {
    const demoUser = {
      legajo: "9999",
      apellido: "Demo",
      nombre: "Participante",
      token_hash: "demo_token_inocuidad_2026",
      fase1: localStorage.getItem('dy_trivia_access_9999_fase1') || '',
      fase2: localStorage.getItem('dy_trivia_access_9999_fase2') || '',
      fase3: localStorage.getItem('dy_trivia_access_9999_fase3') || ''
    };

    const phaseKey = `fase${activePhase}`;
    const alreadyPlayed = Boolean(demoUser[phaseKey]);

    return {
      isValid: true,
      user: demoUser,
      alreadyPlayed,
      playedDate: demoUser[phaseKey] || null
    };
  }

  const users = await fetchUsersList();
  const foundUser = users.find(u => u.token_hash === token || u.legajo === token);

  if (!foundUser) {
    return { isValid: false, reason: 'USER_NOT_FOUND' };
  }

  // Verificar si ya accedió/jugó esta fase (revisamos tanto el origen de datos como el localStorage local)
  const phaseKey = `fase${activePhase}`;
  const localAccessKey = `dy_trivia_access_${foundUser.legajo}_fase${activePhase}`;
  const accessTimestamp = foundUser[phaseKey] || localStorage.getItem(localAccessKey);

  return {
    isValid: true,
    user: foundUser,
    alreadyPlayed: Boolean(accessTimestamp),
    playedDate: accessTimestamp || null
  };
}

/**
 * Registra el acceso y fecha/hora de juego de la fase
 */
export async function recordPhaseAccess(legajo, activePhase, scoreData = {}) {
  const timestamp = new Date().toISOString();
  const localAccessKey = `dy_trivia_access_${legajo}_fase${activePhase}`;
  localStorage.setItem(localAccessKey, timestamp);

  // Si existe webhook de Google Apps Script configurado, enviar la información
  const appsScriptEndpoint = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_ENDPOINT;
  if (appsScriptEndpoint) {
    try {
      await fetch(appsScriptEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'RECORD_PHASE_ACCESS',
          legajo,
          fase: activePhase,
          fechaHora: timestamp,
          puntaje: scoreData.score || 0,
          respuestasCorrectas: scoreData.correctCount || 0,
          tiempoSegundos: scoreData.totalTime || 0,
          detalleRespuestas: scoreData.answers || []
        })
      });
    } catch (e) {
      console.warn('No se pudo sincronizar con Google Apps Script:', e);
    }
  }

  return timestamp;
}

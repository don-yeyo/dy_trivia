// ==============================================================================
// SERVICIO DE AUTENTICACIÓN Y VALIDACIÓN DE ENLACES ÚNICOS
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import CryptoJS from 'crypto-js';
import Papa from 'papaparse';

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
 * Carga la lista de usuarios participantes desde CSV local o Google Sheets
 */
export async function fetchUsersList() {
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'csv';
  const googleSheetUrl = import.meta.env.VITE_GOOGLE_SHEET_USERS_URL;

  try {
    let csvData = "";
    if (dataSource === 'google_sheets' && googleSheetUrl) {
      const res = await fetch(googleSheetUrl);
      csvData = await res.text();
    } else {
      // Leer CSV local desde /data o fallback hardcoded
      const res = await fetch('/data/usuarios_participantes.csv');
      if (res.ok) {
        csvData = await res.text();
      } else {
        // Fallback default
        return [
          { legajo: "1001", apellido: "Pérez", nombre: "Juan", token_hash: generateUserHash("1001", "Pérez", "Juan"), fase1: "", fase2: "", fase3: "" },
          { legajo: "1002", apellido: "González", nombre: "María", token_hash: generateUserHash("1002", "González", "María"), fase1: "", fase2: "", fase3: "" },
          { legajo: "1003", apellido: "Rodríguez", nombre: "Carlos", token_hash: generateUserHash("1003", "Rodríguez", "Carlos"), fase1: "", fase2: "", fase3: "" },
          { legajo: "9999", apellido: "Demo", nombre: "Participante", token_hash: "demo_token_inocuidad_2026", fase1: "", fase2: "", fase3: "" }
        ];
      }
    }

    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    return parsed.data.map(user => {
      // Si el CSV no tenía hash calculado, se calcula automáticamente
      const calculatedHash = generateUserHash(user.legajo, user.apellido, user.nombre);
      return {
        legajo: String(user.legajo || '').trim(),
        apellido: String(user.apellido || '').trim(),
        nombre: String(user.nombre || '').trim(),
        token_hash: user.token_hash || calculatedHash,
        fase1: user.fase1 || '',
        fase2: user.fase2 || '',
        fase3: user.fase3 || ''
      };
    });
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    return [
      { legajo: "9999", apellido: "Demo", nombre: "Participante", token_hash: "demo_token_inocuidad_2026", fase1: "", fase2: "", fase3: "" }
    ];
  }
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

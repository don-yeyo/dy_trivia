// ==============================================================================
// SERVICIO DE ADMINISTRACIÓN Y CLASIFICACIÓN GAMER
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { fetchUsersList } from './authService';
import { fetchUserProgressFromResults, fetchRawResultsList } from './googleSheetsService';

const ADMIN_TOKEN_KEY = 'dy_trivia_admin_token';
const ADMIN_USER_KEY = 'dy_trivia_admin_user';
const LOCAL_PUBLISHED_KEY = 'dy_trivia_classification_published_local';

/**
 * Retorna el token de admin si la sesión sigue activa
 */
export function getStoredAdminToken() {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function getStoredAdminUsername() {
  try {
    return sessionStorage.getItem(ADMIN_USER_KEY) || 'admin';
  } catch (e) {
    return 'admin';
  }
}

export function saveAdminSession(token, username) {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(ADMIN_USER_KEY, username || 'admin');
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, username || 'admin');
  } catch (e) {}
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  } catch (e) {}
}

/**
 * Autentica al Administrador contra el endpoint seguro de Netlify Functions
 */
export async function loginAdmin(username, password) {
  try {
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const contentType = res.headers.get('content-type') || '';

    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.success && data.token) {
        saveAdminSession(data.token, data.username);
        return { success: true, token: data.token, username: data.username };
      }
    }

    if (res.status === 401) {
      return { success: false, error: 'Usuario o contraseña incorrectos' };
    }
  } catch (backendError) {
    // Si no está corriendo el backend serverless, se evalúa el fallback dev
  }

  // Fallback para modo desarrollo local si no está corriendo netlify dev:
  // Permite validar contra las variables de entorno configuradas en .env o defaults de desarrollo
  if (import.meta.env.DEV) {
    const devUser = (typeof __DEV_ADMIN_USER__ !== 'undefined' && __DEV_ADMIN_USER__) || 'admin';
    const devPass = (typeof __DEV_ADMIN_PASS__ !== 'undefined' && __DEV_ADMIN_PASS__) || 'admin';

    const isValid =
      (username === devUser && password === devPass) ||
      (username === 'admin' && (password === 'admin' || password === 'dev'));

    if (isValid) {
      const mockToken = `mock_token_${Date.now()}`;
      saveAdminSession(mockToken, username);
      return { success: true, token: mockToken, username };
    }
    return { success: false, error: 'Usuario o contraseña incorrectos' };
  }

  return { success: false, error: 'No se pudo conectar con el servidor de autenticación' };
}

import { fetchAppConfig } from './configService';

/**
 * Consulta el estado y los datos de clasificación (público o admin)
 */
export async function fetchClassification(phase, topCount) {
  const token = getStoredAdminToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Si no se pasaron parámetros explícitos, consultar la configuración autorizada de Google Sheets
  let effectivePhase = phase;
  let effectiveTop = topCount;
  if (!effectivePhase || !effectiveTop) {
    try {
      const cfg = await fetchAppConfig();
      if (!effectivePhase) effectivePhase = cfg?.activePhase || 1;
      if (!effectiveTop) effectiveTop = cfg?.classificationTopCount || 30;
    } catch (e) {
      if (!effectivePhase) effectivePhase = 1;
      if (!effectiveTop) effectiveTop = 30;
    }
  }

  try {
    const url = token
      ? `/api/classification?phase=${effectivePhase}&topCount=${effectiveTop}`
      : `/api/classification`; // Público: el backend dicta fase y cupo desde Google Sheets sin riesgo de manipulación

    const res = await fetch(url, { headers });
    const contentType = res.headers.get('content-type') || '';

    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    }
  } catch (backendErr) {
    // Fallback silencioso si no hay backend activo
  }

  // Fallback offline / desarrollo
  return computeFallbackClassification(effectivePhase, effectiveTop, !!token);
}

/**
 * Determina y publica oficialmente la clasificación (exclusivo admin)
 */
export async function determineClassification(phase = 1, topCount = 30) {
  const token = getStoredAdminToken();
  if (!token) {
    return { success: false, error: 'Se requiere iniciar sesión como administrador' };
  }

  try {
    const res = await fetch('/api/classification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'DETERMINE_CLASSIFICATION',
        phase: parseInt(phase, 10),
        topCount: parseInt(topCount, 10)
      })
    });
    const contentType = res.headers.get('content-type') || '';

    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      try {
        localStorage.setItem(LOCAL_PUBLISHED_KEY, JSON.stringify(data));
      } catch (e) {}
      return data;
    }
  } catch (err) {
    console.warn('Error al disparar clasificación en servidor, ejecutando fallback:', err);
  }

  // Fallback si no está el backend activo
  const fallbackData = await computeFallbackClassification(phase, topCount, true);
  const result = {
    success: true,
    isPublished: true,
    publishedAt: new Date().toISOString(),
    phase,
    topCount,
    data: fallbackData.data || fallbackData.previewData
  };

  try {
    localStorage.setItem(LOCAL_PUBLISHED_KEY, JSON.stringify(result));
  } catch (e) {}

  return result;
}

/**
 * Reinicia el estado de publicación de la clasificación
 */
export async function resetClassification(phase = 1) {
  const token = getStoredAdminToken();
  if (!token) return { success: false };

  try {
    const res = await fetch('/api/classification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action: 'RESET_CLASSIFICATION', phase })
    });
    const contentType = res.headers.get('content-type') || '';

    if (res.ok && contentType.includes('application/json')) {
      try {
        localStorage.removeItem(LOCAL_PUBLISHED_KEY);
      } catch (e) {}
      return await res.json();
    }
  } catch (e) {}

  try {
    localStorage.removeItem(LOCAL_PUBLISHED_KEY);
  } catch (e) {}

  return { success: true, isPublished: false };
}

/**
 * Generador de clasificación para desarrollo / offline utilizando
 * las respuestas reales de la pestaña 'Resultados' de Google Sheets.
 */
async function computeFallbackClassification(phase, topCount, isAdmin) {
  // 1. Obtener los resultados reales de la planilla de Google Sheets
  let rawResults = [];
  try {
    rawResults = await fetchRawResultsList();
  } catch (err) {
    console.warn('Error obteniendo resultados de Google Sheets en fallback:', err);
  }

  // 2. Obtener la nómina de colaboradores
  let users = [];
  try {
    users = await fetchUsersList();
  } catch (err) {
    console.warn('Error obteniendo lista de usuarios en fallback:', err);
  }

  // 3. Filtrar resultados por fase consultada
  const targetPhase = parseInt(phase || 1, 10);
  const phaseResults = rawResults.filter(r => {
    const rowPhase = parseInt(r.fase || r.phase || '1', 10);
    return rowPhase === targetPhase;
  });

  // 4. Mapear resultados por legajo (conservando el mejor puntaje o menor tiempo si hay duplicados)
  const resultsByLegajo = new Map();
  phaseResults.forEach(r => {
    const legajo = String(r.legajo || '').trim();
    if (!legajo) return;

    const score = parseInt(r['puntaje obtenido'] || r.puntaje || '0', 10);
    const totalTime = parseInt(r['tiempo total (segundos)'] || r.tiempo || '0', 10);
    const correctCount = parseInt(r['respuestas correctas'] || r.correctas || '0', 10);
    const fechaHora = r['fecha y hora'] || r.fechahora || '';

    if (!resultsByLegajo.has(legajo)) {
      resultsByLegajo.set(legajo, { score, totalTime, correctCount, fechaHora, hasPlayed: true });
    } else {
      const prev = resultsByLegajo.get(legajo);
      if (score > prev.score || (score === prev.score && totalTime < prev.totalTime)) {
        resultsByLegajo.set(legajo, { score, totalTime, correctCount, fechaHora, hasPlayed: true });
      }
    }
  });

  // 5. Unificar con datos de colaboradores
  const participantsList = users.length > 0
    ? users
    : Array.from(resultsByLegajo.keys()).map(l => ({ legajo: l, nombre: 'Participante', apellido: l }));

  let merged = participantsList.map(u => {
    const legajo = String(u.legajo || '').trim();
    const nombre = String(u.nombre || '').trim();
    const apellido = String(u.apellido || '').trim();
    const res = resultsByLegajo.get(legajo) || { score: 0, totalTime: 0, correctCount: 0, fechaHora: '', hasPlayed: false };

    return {
      legajo,
      nombre,
      apellido,
      score: res.score,
      totalTime: res.totalTime,
      correctCount: res.correctCount,
      fechaHora: res.fechaHora,
      hasPlayed: res.hasPlayed
    };
  });

  // 🛡️ REGLA CRÍTICA: Solo clasificar y listar a colaboradores que efectivamente hayan jugado
  merged = merged.filter(p => p.hasPlayed);

  // Ordenamiento gamer oficial de posiciones:
  // 1° Mayor puntaje
  // 2° Menor tiempo total (desempate de velocidad)
  // 3° Mayor cantidad de respuestas correctas
  // 4° Fecha/hora de envío anterior
  merged.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return String(a.fechaHora).localeCompare(String(b.fechaHora));
  });

  const topLimit = parseInt(topCount || 30, 10);
  const ranked = merged.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    isPodium: idx < 3,
    isQualified: idx < topLimit
  }));

  const data = {
    phase: targetPhase,
    topCount: topLimit,
    totalInscriptos: users.length,
    totalJugados: ranked.length,
    podio: ranked.slice(0, 3),
    clasificados: ranked.slice(3, topLimit),
    noClasificados: ranked.slice(topLimit),
    allParticipants: ranked
  };

  if (isAdmin) {
    return {
      isPublished: false,
      isAdmin: true,
      previewData: data,
      message: 'Modo Administrador (Vista previa basada en Google Sheets)'
    };
  }

  return {
    isPublished: false,
    isAdmin: false,
    message: 'La clasificación y podio están en auditoría y se publicarán pronto.'
  };
}

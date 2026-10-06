// ==============================================================================
// SERVICIO DE ADMINISTRACIÓN Y CLASIFICACIÓN GAMER
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { fetchUsersList } from './authService';
import { fetchUserProgressFromResults } from './googleSheetsService';

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
  } catch (e) {}
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
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

/**
 * Consulta el estado y los datos de clasificación (público o admin)
 */
export async function fetchClassification(phase = 1, topCount = 30) {
  const token = getStoredAdminToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`/api/classification?phase=${phase}&topCount=${topCount}`, {
      headers
    });
    const contentType = res.headers.get('content-type') || '';

    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    }
  } catch (backendErr) {
    // Fallback silencioso si no hay backend activo
  }

  // Fallback offline / desarrollo
  return computeFallbackClassification(phase, topCount, !!token);
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
 * Generador de clasificación simulada para desarrollo / offline
 */
async function computeFallbackClassification(phase, topCount, isAdmin) {
  // Verificar si hay estado local publicado
  try {
    const cached = localStorage.getItem(LOCAL_PUBLISHED_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.isPublished) {
        return { ...parsed, isAdmin };
      }
    }
  } catch (e) {}

  const users = await fetchUsersList();

  // Lista con puntajes de demostración para armar una clasificación realista y dinámica
  const demoScores = [
    { legajo: "1002", score: 1850, totalTime: 68, correctCount: 10, fechaHora: "2026-10-05T09:12:00Z" },
    { legajo: "1004", score: 1720, totalTime: 75, correctCount: 9, fechaHora: "2026-10-05T09:30:00Z" },
    { legajo: "1001", score: 1640, totalTime: 82, correctCount: 9, fechaHora: "2026-10-05T09:45:00Z" },
    { legajo: "1005", score: 1450, totalTime: 95, correctCount: 8, fechaHora: "2026-10-05T10:05:00Z" },
    { legajo: "1003", score: 1310, totalTime: 110, correctCount: 7, fechaHora: "2026-10-05T10:14:00Z" },
    { legajo: "9999", score: 1200, totalTime: 120, correctCount: 6, fechaHora: "2026-10-05T10:20:00Z" }
  ];

  const scoreMap = new Map();
  demoScores.forEach(s => scoreMap.set(s.legajo, s));

  const list = users.map((u, i) => {
    const s = scoreMap.get(u.legajo) || {
      score: Math.max(0, 1000 - (i * 120)),
      totalTime: 80 + (i * 15),
      correctCount: Math.max(2, 10 - i),
      fechaHora: new Date().toISOString()
    };
    return {
      legajo: u.legajo,
      nombre: u.nombre,
      apellido: u.apellido,
      score: s.score,
      totalTime: s.totalTime,
      correctCount: s.correctCount,
      fechaHora: s.fechaHora,
      hasPlayed: true
    };
  });

  list.sort((a, b) => b.score - a.score || a.totalTime - b.totalTime);

  const ranked = list.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    isPodium: idx < 3,
    isQualified: idx < topCount
  }));

  const data = {
    phase,
    topCount,
    totalInscriptos: ranked.length,
    totalJugados: ranked.length,
    podio: ranked.slice(0, 3),
    clasificados: ranked.slice(3, topCount),
    noClasificados: ranked.slice(topCount),
    allParticipants: ranked
  };

  if (isAdmin) {
    return {
      isPublished: false,
      isAdmin: true,
      previewData: data,
      message: 'Modo Administrador (Vista previa antes de publicar)'
    };
  }

  return {
    isPublished: false,
    isAdmin: false,
    message: 'La clasificación y podio están en auditoría y se publicarán pronto.'
  };
}

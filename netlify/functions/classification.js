// ==============================================================================
// NETLIFY FUNCTION: CLASSIFICATION & PODIUM (/api/classification)
// Calcula el ranking y podio de ganadores, y gestiona la publicación oficial
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fetchSheetValues, getServerEnv, sendToAppsScript, fetchTriviaConfig, updateTriviaConfig } from './utils/googleSheets.js';

// Cache en memoria para mantener el estado publicado entre invocaciones
let memoryClassificationState = {
  isPublished: false,
  publishedAt: null,
  phase: 1,
  topCount: 30,
  data: null
};

const STATE_FILE_PATH = '/tmp/dy_classification_state.json';

/**
 * Carga el estado persistido si existe
 */
function loadPersistedState() {
  if (memoryClassificationState.isPublished && memoryClassificationState.data) {
    return memoryClassificationState;
  }

  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const content = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.isPublished === 'boolean') {
        memoryClassificationState = parsed;
        return memoryClassificationState;
      }
    }
  } catch (err) {
    // Silencioso en entornos sin acceso a disco
  }

  return memoryClassificationState;
}

/**
 * Guarda el estado en memoria y archivo temporal
 */
function savePersistedState(state) {
  memoryClassificationState = { ...state };
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state), 'utf8');
  } catch (err) {
    // Silencioso
  }
}

/**
 * Valida un token de sesión de admin generado por /api/admin-auth
 */
function verifyAdminToken(token) {
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

/**
 * Calcula la clasificación a partir de las listas de participantes y resultados
 */
async function computeClassificationData(phase = 1, topCount = 30, showPartial = true, showUnanswered = false) {
  const usersRange = getServerEnv('GOOGLE_SHEETS_USERS_RANGE') || 'Participantes!A1:Z500';
  const resultsRange = getServerEnv('GOOGLE_SHEETS_RESULTS_RANGE') || 'Resultados!A1:Z1000';

  let rawUsers = [];
  let rawResults = [];

  try {
    rawUsers = await fetchSheetValues(usersRange);
  } catch (err) {
    console.warn('Error leyendo participantes de Sheets:', err.message);
  }

  try {
    rawResults = await fetchSheetValues(resultsRange);
  } catch (err) {
    console.warn('Error leyendo resultados de Sheets:', err.message);
  }

  // Filtrar resultados por fase activa
  const phaseResults = rawResults.filter(r => {
    const rowPhase = parseInt(r.fase || r.phase || '1', 10);
    return rowPhase === parseInt(phase, 10);
  });

  // Mapear resultados por legajo
  const resultsByLegajo = new Map();
  phaseResults.forEach(r => {
    const legajo = String(r.legajo || '').trim();
    if (!legajo) return;

    const score = parseInt(r['puntaje obtenido'] || r.puntaje || '0', 10);
    const totalTime = parseInt(r['tiempo total (segundos)'] || r.tiempo || '0', 10);
    const correctCount = parseInt(r['respuestas correctas'] || r.correctas || '0', 10);
    const fechaHora = r['fecha y hora'] || r.fechahora || '';

    // Si hay registros duplicados, conservar el de mayor puntaje o menor tiempo
    if (!resultsByLegajo.has(legajo)) {
      resultsByLegajo.set(legajo, { score, totalTime, correctCount, fechaHora, hasPlayed: true });
    } else {
      const prev = resultsByLegajo.get(legajo);
      if (score > prev.score || (score === prev.score && totalTime < prev.totalTime)) {
        resultsByLegajo.set(legajo, { score, totalTime, correctCount, fechaHora, hasPlayed: true });
      }
    }
  });

  // Si no hay participantes de Sheets, crear lista a partir de resultados
  const participantsList = rawUsers.length > 0 ? rawUsers : Array.from(resultsByLegajo.keys()).map(l => ({ legajo: l, nombre: 'Participante', apellido: l }));

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

  // Filtros dinámicos según configuración de Google Sheets
  if (!showUnanswered) {
    // Solo incluir a quienes hayan jugado al menos una pregunta
    merged = merged.filter(p => p.hasPlayed);
  }

  // Ordenamiento gamer de clasificación:
  // 1. Quienes jugaron primero
  // 2. Mayor puntaje
  // 3. Menor tiempo total (desempate de velocidad)
  // 4. Mayor cantidad de respuestas correctas
  // 5. Fecha/hora anterior
  merged.sort((a, b) => {
    if (a.hasPlayed !== b.hasPlayed) {
      return a.hasPlayed ? -1 : 1;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.totalTime !== b.totalTime) {
      return a.totalTime - b.totalTime;
    }
    if (b.correctCount !== a.correctCount) {
      return b.correctCount - a.correctCount;
    }
    return String(a.fechaHora).localeCompare(String(b.fechaHora));
  });

  // Asignar puestos oficiales
  const ranked = merged.map((item, index) => ({
    ...item,
    rank: index + 1,
    isPodium: index < 3,
    isQualified: index < topCount && item.hasPlayed
  }));

  const podio = ranked.slice(0, 3);
  const clasificados = ranked.slice(3, topCount);
  const noClasificados = ranked.slice(topCount);
  const totalJugados = ranked.filter(r => r.hasPlayed).length;

  return {
    phase: parseInt(phase, 10),
    topCount: parseInt(topCount, 10),
    totalInscriptos: ranked.length,
    totalJugados,
    podio,
    clasificados,
    noClasificados,
    allParticipants: ranked
  };
}

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const isAdmin = verifyAdminToken(authHeader);

  // Leer la configuración autorizada desde la pestaña 'Configuracion' de Google Sheets
  const config = await fetchTriviaConfig();

  // --------------------------------------------------------------------------
  // GET: Consultar Clasificación
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    // La fase y el cupo son dictados por la configuración del backend/Google Sheets
    const phase = parseInt(params.phase || config.activePhase, 10);
    const topCount = parseInt(params.topCount || config.classificationTopCount, 10);

    const isPublished = config.isClassificationPublished;
    const publishedAt = config.classificationPublishedAt;

    // Si ya está publicada oficialmente: accesible por todo el público
    if (isPublished) {
      const data = await computeClassificationData(
        phase,
        topCount,
        config.showPartialInTable,
        config.showUnansweredInTable
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isPublished: true,
          publishedAt,
          phase,
          topCount,
          data,
          isAdmin
        })
      };
    }

    // Si NO está publicada pero es el Administrador autenticado:
    // Permitir previsualizar los datos actuales de la planilla
    if (isAdmin) {
      const previewData = await computeClassificationData(
        phase,
        topCount,
        config.showPartialInTable,
        config.showUnansweredInTable
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isPublished: false,
          isAdmin: true,
          previewData,
          message: 'La clasificación aún no ha sido publicada para toda la planta.'
        })
      };
    }

    // Para el público general cuando aún no fue publicada:
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isPublished: false,
        isAdmin: false,
        message: 'La clasificación y podio de ganadores están en proceso de auditoría y se publicarán al finalizar la etapa de evaluación de toda la planta.'
      })
    };
  }

  // --------------------------------------------------------------------------
  // POST: Acciones de Administrador (Determinar o Reiniciar Clasificación)
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'POST') {
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Acceso no autorizado. Se requieren credenciales de administrador.' })
      };
    }

    try {
      const body = JSON.parse(event.body || '{}');
      const action = body.action || 'DETERMINE_CLASSIFICATION';
      const phase = parseInt(body.phase || config.activePhase, 10);
      const topCount = parseInt(body.topCount || config.classificationTopCount, 10);

      if (action === 'RESET_CLASSIFICATION') {
        const resetState = {
          isPublished: false,
          publishedAt: null,
          phase,
          topCount,
          data: null
        };
        savePersistedState(resetState);

        // Persistir en pestaña 'Configuracion' de Google Sheets
        await updateTriviaConfig({
          CLASIFICACION_PUBLICADA: 'FALSE',
          FECHA_PUBLICACION_CLASIFICACION: ''
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            isPublished: false,
            message: 'Clasificación reiniciada exitosamente.'
          })
        };
      }

      if (action === 'DETERMINE_CLASSIFICATION') {
        const data = await computeClassificationData(
          phase,
          topCount,
          config.showPartialInTable,
          config.showUnansweredInTable
        );
        const publishedAt = new Date().toISOString();

        const newState = {
          isPublished: true,
          publishedAt,
          phase,
          topCount,
          data
        };

        savePersistedState(newState);

        // 🛡️ Persistir en la pestaña 'Configuracion' de Google Sheets (Durabilidad 100%)
        await updateTriviaConfig({
          CLASIFICACION_PUBLICADA: 'TRUE',
          FECHA_PUBLICACION_CLASIFICACION: publishedAt,
          CLASIFICACION_TOP_COUNT: String(topCount)
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            isPublished: true,
            publishedAt,
            phase,
            topCount,
            data
          })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Acción desconocida: ${action}` })
      };

    } catch (err) {
      console.error('Error procesando clasificación:', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error determinando clasificación', details: err.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Método no permitido' })
  };
}

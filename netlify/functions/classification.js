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
  const questionsRange = getServerEnv('GOOGLE_SHEETS_QUESTIONS_RANGE') || 'Preguntas!A1:Z100';

  let rawUsers = [];
  let rawResults = [];
  let rawQuestions = [];

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

  try {
    rawQuestions = await fetchSheetValues(questionsRange);
  } catch (err) {
    console.warn('Error leyendo preguntas de Sheets:', err.message);
  }

  // 1. Determinar la cantidad total de preguntas de la fase
  const targetPhase = parseInt(phase, 10);
  const phaseQuestions = (rawQuestions || []).filter(q => {
    const qPhase = parseInt(q.fase || q.phase || '1', 10);
    return qPhase === targetPhase;
  });
  let totalPhaseQuestions = phaseQuestions.length > 0 ? phaseQuestions.length : 10;

  // 2. Filtrar resultados por fase activa
  const phaseResults = rawResults.filter(r => {
    const rowPhase = parseInt(r.fase || r.phase || '1', 10);
    return rowPhase === targetPhase;
  });

  // Función auxiliar para parsear el detalle de respuestas (JSON)
  const parseAnswersDetail = (row) => {
    const jsonField = row['detalle respuestas (json)'] || row['detallerespuestas'] || row['respuestas'] || row.detallerespuestas || '';
    if (jsonField) {
      try {
        const parsed = typeof jsonField === 'string' ? JSON.parse(jsonField) : jsonField;
        if (Array.isArray(parsed)) {
          return { answersCount: parsed.length, hasExplicitJson: true };
        }
      } catch (e) {}
    }
    return { answersCount: 0, hasExplicitJson: false };
  };

  // Ajustar total de preguntas si en los resultados se observa una cantidad mayor
  let maxAnswersObserved = 0;
  phaseResults.forEach(r => {
    const { answersCount } = parseAnswersDetail(r);
    if (answersCount > maxAnswersObserved) maxAnswersObserved = answersCount;
  });
  if (maxAnswersObserved > totalPhaseQuestions) {
    totalPhaseQuestions = maxAnswersObserved;
  }

  // 3. Mapear resultados por legajo (conservando el mejor puntaje o menor tiempo)
  const resultsByLegajo = new Map();
  phaseResults.forEach(r => {
    const legajo = String(r.legajo || '').trim();
    if (!legajo) return;

    const score = parseInt(r['puntaje obtenido'] || r.puntaje || '0', 10);
    const totalTime = parseInt(r['tiempo total (segundos)'] || r.tiempo || '0', 10);
    const correctCount = parseInt(r['respuestas correctas'] || r.correctas || '0', 10);
    const fechaHora = r['fecha y hora'] || r.fechahora || '';
    const { answersCount, hasExplicitJson } = parseAnswersDetail(r);

    const isPartial = hasExplicitJson
      ? (answersCount > 0 && answersCount < totalPhaseQuestions)
      : false;
    const isCompleted = !isPartial;

    const candidate = {
      score,
      totalTime,
      correctCount,
      fechaHora,
      answersCount,
      hasExplicitJson,
      isPartial,
      isCompleted,
      hasPlayed: true
    };

    if (!resultsByLegajo.has(legajo)) {
      resultsByLegajo.set(legajo, candidate);
    } else {
      const prev = resultsByLegajo.get(legajo);
      if (score > prev.score || (score === prev.score && totalTime < prev.totalTime)) {
        resultsByLegajo.set(legajo, candidate);
      }
    }
  });

  // 4. Si no hay participantes de Sheets, armar lista a partir de resultados
  const participantsList = rawUsers.length > 0
    ? rawUsers
    : Array.from(resultsByLegajo.keys()).map(l => ({ legajo: l, nombre: 'Participante', apellido: l, sector: '' }));

  let merged = participantsList.map(u => {
    const legajo = String(u.legajo || '').trim();
    const nombre = String(u.nombre || '').trim();
    const apellido = String(u.apellido || '').trim();
    const sector = String(u.sector || u.area || '').trim();
    const res = resultsByLegajo.get(legajo) || {
      score: 0,
      totalTime: 0,
      correctCount: 0,
      fechaHora: '',
      answersCount: 0,
      hasExplicitJson: false,
      isPartial: false,
      isCompleted: false,
      hasPlayed: false
    };

    return {
      legajo,
      nombre,
      apellido,
      sector,
      score: res.score,
      totalTime: res.totalTime,
      correctCount: res.correctCount,
      fechaHora: res.fechaHora,
      answersCount: res.answersCount,
      totalQuestions: totalPhaseQuestions,
      isPartial: res.isPartial,
      isCompleted: res.isCompleted,
      hasPlayed: res.hasPlayed
    };
  });

  // 5. 🛡️ FILTRADO DINÁMICO SEGÚN CONFIGURACIÓN DE GOOGLE SHEETS:
  // - MOSTRAR_NO_RESPONDIDOS_EN_TABLA: si es true, incluye a colaboradores inscriptos que aún no participaron de la fase.
  // - MOSTRAR_PARCIALES_EN_TABLA: si es true, incluye a quienes respondieron parcialmente pero no terminaron todas las preguntas.
  // - Quienes completaron todas las preguntas siempre se incluyen.
  const filtered = merged.filter(p => {
    // 1. Caso: Colaborador inscripto que aún no participó
    if (!p.hasPlayed) {
      return Boolean(showUnanswered);
    }
    // 2. Caso: Participó parcialmente (no respondió el 100% de las preguntas)
    if (p.isPartial) {
      return Boolean(showPartial);
    }
    // 3. Caso: Completó la totalidad de las preguntas
    return true;
  });

  // 6. Ordenamiento gamer de clasificación:
  // 1° Quienes jugaron primero que quienes no jugaron
  // 2° Mayor puntaje
  // 3° Menor tiempo total (desempate de velocidad)
  // 4° Mayor cantidad de respuestas correctas
  // 5° Fecha/hora de envío anterior
  filtered.sort((a, b) => {
    if (a.hasPlayed !== b.hasPlayed) {
      return a.hasPlayed ? -1 : 1;
    }
    if (!a.hasPlayed && !b.hasPlayed) {
      const nameA = `${a.apellido || ''} ${a.nombre || ''}`.trim();
      const nameB = `${b.apellido || ''} ${b.nombre || ''}`.trim();
      return nameA.localeCompare(nameB);
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

  // 7. Asignar puestos oficiales
  const ranked = filtered.map((item, index) => ({
    ...item,
    rank: index + 1,
    isPodium: index < 3 && item.hasPlayed,
    isQualified: index < topCount && item.hasPlayed
  }));

  const podio = ranked.filter(r => r.rank <= 3 && r.hasPlayed);
  const clasificados = ranked.filter(r => r.rank > 3 && r.rank <= topCount && r.hasPlayed);
  const noClasificados = ranked.filter(r => r.rank > topCount || !r.hasPlayed);

  const totalInscriptos = participantsList.length;
  const totalJugados = merged.filter(r => r.hasPlayed).length;
  const totalCompletados = merged.filter(r => r.isCompleted).length;
  const totalParciales = merged.filter(r => r.isPartial).length;
  const totalNoJugados = merged.filter(r => !r.hasPlayed).length;

  return {
    phase: targetPhase,
    topCount: parseInt(topCount, 10),
    showPartial: Boolean(showPartial),
    showUnanswered: Boolean(showUnanswered),
    totalInscriptos,
    totalJugados,
    totalCompletados,
    totalParciales,
    totalNoJugados,
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
    // La fase y el cupo oficial provienen estrictamente de Google Sheets
    // Un participante no debe poder alterar topCount ni phase manipulando query params
    const phase = isAdmin && params.phase
      ? parseInt(params.phase, 10)
      : parseInt(config.activePhase, 10);
    const topCount = isAdmin && params.topCount
      ? parseInt(params.topCount, 10)
      : parseInt(config.classificationTopCount, 10);

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

// ==============================================================================
// SUPABASE ADAPTER (POSTGRESQL REST - ALTA CONCURRENCIA PARA CAPA GRATUITA)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
// 1. Acceso 100% REST vía PostgREST (cero conexiones directas TCP/pg).
// 2. Cliente cacheado en ámbito de módulo para Warm Starts en Netlify Functions.
// 3. Cero WebSockets / Realtime (mantiene el límite del plan gratuito).
// 4. Inserciones atómicas de respuestas (una sola llamada .upsert sin lecturas previas).
// ==============================================================================
import { DatabaseAdapter } from './DatabaseAdapter.js';
import { getSupabaseClient } from './supabaseClient.js';
import { checkOrInitSchema } from './schema.js';
import { DEFAULT_TRIVIA_CONFIG, fetchSheetValues, getServerEnv } from '../utils/googleSheets.js';
import { calculateScore } from '../utils/scoreCalculator.js';

export class SupabaseAdapter extends DatabaseAdapter {
  constructor() {
    super('SupabaseAdapter');
  }

  /**
   * Obtiene el cliente singleton REST cacheado en ámbito de módulo.
   */
  getClient() {
    return getSupabaseClient();
  }

  async init() {
    return await checkOrInitSchema();
  }

  async getConfig() {
    const supabase = this.getClient();
    const config = { ...DEFAULT_TRIVIA_CONFIG };

    try {
      const { data, error } = await supabase.from('config').select('clave, valor');
      if (error) {
        console.warn('[SupabaseAdapter] Advertencia consultando config:', error.message);
        return config;
      }

      if (!data || data.length === 0) {
        const defaultRows = Object.entries({
          FASE_ACTIVA: String(config.activePhase),
          FASE_CERRADA: config.isPhaseClosed ? 'TRUE' : 'FALSE',
          CLASIFICACION_PUBLICADA: config.isClassificationPublished ? 'TRUE' : 'FALSE',
          CLASIFICACION_TOP_COUNT: String(config.classificationTopCount),
          MOSTRAR_PARCIALES_EN_TABLA: config.showPartialInTable ? 'TRUE' : 'FALSE',
          MOSTRAR_NO_RESPONDIDOS_EN_TABLA: config.showUnansweredInTable ? 'TRUE' : 'FALSE',
          FECHA_PUBLICACION_CLASIFICACION: config.classificationPublishedAt || '',
          TIEMPO_POR_PREGUNTA: String(config.timePerQuestion),
          MEZCLAR_PREGUNTAS: config.shuffleQuestions ? 'TRUE' : 'FALSE',
          OCULTAR_RESUMEN_RESPONDIDAS: config.hideSummaryAnswered ? 'TRUE' : 'FALSE',
          OCULTAR_RESUMEN_TIEMPO: config.hideSummaryTime ? 'TRUE' : 'FALSE'
        }).map(([clave, valor]) => ({ clave, valor, descripcion: 'Valor por defecto del sistema' }));

        await supabase.from('config').upsert(defaultRows, { onConflict: 'clave' });
        return config;
      }

      data.forEach(row => {
        const key = String(row.clave || '').trim().toUpperCase();
        const rawValue = String(row.valor || '').trim();

        switch (key) {
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
      });
    } catch (err) {
      console.warn('[SupabaseAdapter] Excepción en getConfig:', err.message);
    }

    return config;
  }

  async updateConfig(updates = {}) {
    const supabase = this.getClient();
    const rows = Object.entries(updates).map(([clave, valor]) => ({
      clave,
      valor: String(valor !== undefined && valor !== null ? valor : ''),
      updated_at: new Date().toISOString()
    }));

    if (rows.length === 0) return true;

    const { error } = await supabase.from('config').upsert(rows, { onConflict: 'clave' });
    if (error) {
      console.error('[SupabaseAdapter] Error en updateConfig:', error.message);
      return false;
    }
    return true;
  }

  async getUserByHash(token, allowSessionReset = false) {
    if (!token) return null;
    const cleanToken = String(token).trim().toLowerCase();

    // Token demo en modo desarrollo
    if ((cleanToken === 'demo' || cleanToken === 'demo_token_inocuidad_2026') && allowSessionReset) {
      return {
        id: 9999,
        legajo: '9999',
        token_hash: cleanToken,
        nombre: 'Participante',
        apellido: 'Demo',
        sector: 'Calidad'
      };
    }

    const supabase = this.getClient();

    // Consulta ultrarrápida indexada por token_hash en < 5ms
    const { data: userByHash, error: hashErr } = await supabase
      .from('participants')
      .select('id, legajo, token_hash, apellido, nombre, documento, sector, telefono, email')
      .eq('token_hash', cleanToken)
      .maybeSingle();

    if (hashErr) {
      console.warn('[SupabaseAdapter] Error buscando participante por hash:', hashErr.message);
    }

    if (userByHash) {
      return userByHash;
    }

    // Fallback opcional por legajo si allowSessionReset es true
    if (allowSessionReset) {
      const { data: userByLegajo } = await supabase
        .from('participants')
        .select('id, legajo, token_hash, apellido, nombre, documento, sector, telefono, email')
        .eq('legajo', cleanToken)
        .maybeSingle();

      if (userByLegajo) return userByLegajo;
    }

    return null;
  }

  async getUserProgress(legajo, phase) {
    const cleanLegajo = String(legajo || '').trim();
    const targetPhase = parseInt(phase, 10);
    const supabase = this.getClient();

    const defaultProgress = {
      hasRecord: false,
      answers: [],
      score: 0,
      correctCount: 0,
      totalTime: 0,
      fechaHora: '',
      isPhaseCompleted: false
    };

    try {
      const { data: responses, error } = await supabase
        .from('responses')
        .select('pregunta_id, tiempo_tardado, es_correcta, puntos_obtenidos, fecha_hora_respuesta')
        .eq('legajo', cleanLegajo)
        .eq('fase', targetPhase)
        .order('pregunta_id', { ascending: true });

      if (error) {
        console.warn('[SupabaseAdapter] Error en getUserProgress:', error.message);
        return defaultProgress;
      }

      if (!responses || responses.length === 0) {
        return defaultProgress;
      }

      let rawPoints = 0;
      let correctCount = 0;
      let totalTime = 0;
      let lastTimestamp = '';

      const answers = responses.map(r => {
        const pts = parseInt(r.puntos_obtenidos || 0, 10);
        const t = parseInt(r.tiempo_tardado || 0, 10);
        const isCorr = !!r.es_correcta;

        rawPoints += pts;
        totalTime += t;
        if (isCorr) correctCount++;
        if (r.fecha_hora_respuesta) lastTimestamp = r.fecha_hora_respuesta;

        return {
          questionId: parseInt(r.pregunta_id, 10),
          timeSpent: t,
          isCorrect: isCorr,
          pointsEarned: pts,
          fechaHoraRespuesta: r.fecha_hora_respuesta
        };
      });

      const score = calculateScore(rawPoints, totalTime);

      return {
        hasRecord: true,
        answers,
        rawPoints,
        score,
        correctCount,
        totalTime,
        fechaHora: lastTimestamp,
        isPhaseCompleted: true
      };
    } catch (err) {
      console.error('[SupabaseAdapter] Excepción en getUserProgress:', err);
      return defaultProgress;
    }
  }

  async getQuestions(phase, sanitized = true) {
    const targetPhase = parseInt(phase, 10);
    const supabase = this.getClient();

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('fase', targetPhase)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(q => {
          const item = {
            id: q.id,
            phase: q.fase,
            question: q.pregunta,
            points: q.puntos,
            options: Array.isArray(q.opciones) ? q.opciones : JSON.parse(q.opciones || '[]')
          };
          if (!sanitized) {
            item.correctOptionId = q.respuesta_correcta;
          }
          return item;
        });
      }
    } catch (e) {
      console.warn('[SupabaseAdapter] Preguntas no disponibles en Supabase, recurriendo a Sheets:', e.message);
    }

    // Fallback inteligente a Google Sheets
    const questionsRange = getServerEnv('GOOGLE_SHEETS_QUESTIONS_RANGE') || 'Preguntas!A1:Z100';
    try {
      const rows = await fetchSheetValues(questionsRange);
      const phaseRows = (rows || []).filter(r => parseInt(r.fase || r.phase || '1', 10) === targetPhase);
      const result = [];

      phaseRows.forEach((r, idx) => {
        const explicitId = r.id || r.numero || r.id_pregunta;
        const qId = (explicitId !== undefined && explicitId !== '') ? parseInt(explicitId, 10) : (idx + 1);
        const questionText = r.pregunta || r.question || '';
        const points = parseInt(r.puntos || r.points || '100', 10);

        const options = [];
        for (let i = 1; i <= 5; i++) {
          const letter = String.fromCharCode(96 + i);
          const optText = r[`opcion${i}`] || r[`opcion_${i}`] || r[`opcion${letter}`] || r[`opcion_${letter}`] || r[letter] || r[`opcion ${i}`] || '';
          if (optText && String(optText).trim() !== '') {
            options.push({ id: i, text: String(optText).trim() });
          }
        }

        const rawCorrect = String(
          r.respuesta_correcta || r.respuestacorrecta || r.opcion_correcta || r.opcioncorrecta || r.correcta || '1'
        ).trim().toUpperCase();
        const correctMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
        const correctOptionId = correctMap[rawCorrect] || parseInt(rawCorrect, 10) || 1;

        if (questionText && options.length >= 2) {
          const qObj = { id: qId, phase: targetPhase, question: questionText, points, options };
          if (!sanitized) qObj.correctOptionId = correctOptionId;
          result.push(qObj);
        }
      });
      return result;
    } catch (err) {
      console.error('[SupabaseAdapter] Error en fallback de preguntas:', err);
      return [];
    }
  }

  /**
   * 🛡️ REGLA CRÍTICA: INSERCIÓN ATÓMICA DE RESPUESTA
   * Realiza un único .upsert() directo en la tabla 'responses' de Supabase
   * basándose en la restricción UNIQUE(legajo, fase, pregunta_id).
   * CERO consultas previas de lectura y CERO bloqueos concurrentes.
   */
  async saveQuestionAnswer(params) {
    const { legajo, phase, questionId, selectedOptionId, isCorrect, pointsEarned, timeSpent, timestamp } = params;
    const cleanLegajo = String(legajo).trim();
    const targetPhase = parseInt(phase, 10);
    const qId = parseInt(questionId, 10);
    const nowIso = timestamp || new Date().toISOString();
    const supabase = this.getClient();

    // Inserción atómica en 1 sola llamada REST PostgREST
    const { data, error } = await supabase
      .from('responses')
      .upsert({
        legajo: cleanLegajo,
        fase: targetPhase,
        pregunta_id: qId,
        respuesta_seleccionada: selectedOptionId !== null && selectedOptionId !== undefined ? parseInt(selectedOptionId, 10) : null,
        es_correcta: !!isCorrect,
        puntos_obtenidos: parseInt(pointsEarned, 10) || 0,
        tiempo_tardado: parseInt(timeSpent, 10) || 0,
        fecha_hora_respuesta: nowIso
      }, {
        onConflict: 'legajo,fase,pregunta_id'
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[SupabaseAdapter] Error atómico en saveQuestionAnswer:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  }

  async getClassification(phase, topCount = 30, showPartial = true, showUnanswered = false) {
    const targetPhase = parseInt(phase, 10);
    const supabase = this.getClient();

    // 1. Obtener lista de participantes por REST (con paginación segura)
    let participants = [];
    let pFrom = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: page = [], error: pErr } = await supabase
        .from('participants')
        .select('id, legajo, nombre, apellido, sector')
        .order('apellido', { ascending: true })
        .range(pFrom, pFrom + PAGE_SIZE - 1);

      if (pErr) {
        console.warn('[SupabaseAdapter] Error obteniendo participantes:', pErr.message);
        break;
      }
      participants.push(...page);
      if (page.length < PAGE_SIZE) break;
      pFrom += PAGE_SIZE;
    }

    // 2. Obtener todas las respuestas de la fase (paginación segura para superar el límite de 1000 filas de PostgREST)
    let responses = [];
    let rFrom = 0;
    while (true) {
      const { data: page = [], error: rErr } = await supabase
        .from('responses')
        .select('legajo, pregunta_id, es_correcta, puntos_obtenidos, tiempo_tardado, fecha_hora_respuesta')
        .eq('fase', targetPhase)
        .range(rFrom, rFrom + PAGE_SIZE - 1);

      if (rErr) {
        console.warn('[SupabaseAdapter] Error obteniendo respuestas:', rErr.message);
        break;
      }
      responses.push(...page);
      if (page.length < PAGE_SIZE) break;
      rFrom += PAGE_SIZE;
    }

    // 3. Determinar total de preguntas y puntos de cada pregunta de la fase
    let totalQuestions = 10;
    const questionPointsMap = new Map();
    const { data: qList } = await supabase
      .from('questions')
      .select('id, puntos')
      .eq('fase', targetPhase);

    if (qList && qList.length > 0) {
      qList.forEach(q => {
        questionPointsMap.set(parseInt(q.id, 10), parseInt(q.puntos, 10) || 1);
      });
      totalQuestions = qList.length;
    }

    // 4. Agrupar respuestas por legajo en memoria de la Lambda
    const resultsByLegajo = new Map();
    (responses || []).forEach(r => {
      const leg = String(r.legajo || '').trim();
      if (!leg) return;

      if (!resultsByLegajo.has(leg)) {
        resultsByLegajo.set(leg, {
          rawPoints: 0,
          score: 0,
          totalTime: 0,
          correctCount: 0,
          answersCount: 0,
          fechaHora: r.fecha_hora_respuesta || '',
          hasPlayed: true
        });
      }

      const item = resultsByLegajo.get(leg);
      item.totalTime += (r.tiempo_tardado || 0);
      item.answersCount++;
      if (r.es_correcta) {
        item.correctCount++;
        // Puntos = suma de aciertos ponderados por el punto asignado a cada pregunta (por defecto 1 punto)
        const qPoints = questionPointsMap.get(parseInt(r.pregunta_id, 10)) ?? 1;
        item.rawPoints = (item.rawPoints || 0) + qPoints;
      }
      if (r.fecha_hora_respuesta && (!item.fechaHora || r.fecha_hora_respuesta > item.fechaHora)) {
        item.fechaHora = r.fecha_hora_respuesta;
      }
    });

    if (responses) {
      responses.forEach(r => {
        const item = resultsByLegajo.get(String(r.legajo));
        if (item && item.answersCount > totalQuestions) {
          totalQuestions = item.answersCount;
        }
      });
    }

    // 5. Merge con participantes
    const participantsList = (participants && participants.length > 0)
      ? participants
      : Array.from(resultsByLegajo.keys()).map(l => ({ legajo: l, nombre: 'Participante', apellido: l, sector: '' }));

    const merged = participantsList.map(u => {
      const legajo = String(u.legajo || '').trim();
      const res = resultsByLegajo.get(legajo) || {
        score: 0,
        totalTime: 0,
        correctCount: 0,
        answersCount: 0,
        fechaHora: '',
        hasPlayed: false
      };

      const isPartial = res.hasPlayed && res.answersCount < totalQuestions;
      const isCompleted = res.hasPlayed && res.answersCount >= totalQuestions;
      const finalScore = calculateScore(res.rawPoints || 0, res.totalTime || 0);

      return {
        legajo,
        nombre: String(u.nombre || '').trim(),
        apellido: String(u.apellido || '').trim(),
        sector: String(u.sector || '').trim(),
        score: finalScore,
        rawPoints: res.rawPoints || 0,
        totalTime: res.totalTime,
        correctCount: res.correctCount,
        fechaHora: res.fechaHora,
        answersCount: res.answersCount,
        totalQuestions,
        isPartial,
        isCompleted,
        hasPlayed: res.hasPlayed
      };
    });

    // 6. Filtrar según configuración
    const filtered = merged.filter(p => {
      if (!p.hasPlayed) return Boolean(showUnanswered);
      if (p.isPartial) return Boolean(showPartial);
      return true;
    });

    // 7. Ordenamiento gamer
    filtered.sort((a, b) => {
      if (a.hasPlayed !== b.hasPlayed) return a.hasPlayed ? -1 : 1;
      if (!a.hasPlayed && !b.hasPlayed) {
        const nameA = `${a.apellido || ''} ${a.nombre || ''}`.trim();
        const nameB = `${b.apellido || ''} ${b.nombre || ''}`.trim();
        return nameA.localeCompare(nameB);
      }
      if (b.score !== a.score) return b.score - a.score;
      if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      return String(a.fechaHora).localeCompare(String(b.fechaHora));
    });

    const ranked = filtered.map((item, index) => ({
      ...item,
      rank: index + 1,
      isPodium: index < 3 && item.hasPlayed,
      isQualified: index < topCount && item.hasPlayed
    }));

    return {
      phase: targetPhase,
      topCount: parseInt(topCount, 10),
      showPartial: Boolean(showPartial),
      showUnanswered: Boolean(showUnanswered),
      totalInscriptos: participantsList.length,
      totalJugados: merged.filter(r => r.hasPlayed).length,
      totalCompletados: merged.filter(r => r.isCompleted).length,
      totalParciales: merged.filter(r => r.isPartial).length,
      totalNoJugados: merged.filter(r => !r.hasPlayed).length,
      podio: ranked.filter(r => r.rank <= 3 && r.hasPlayed),
      clasificados: ranked.filter(r => r.rank > 3 && r.rank <= topCount && r.hasPlayed),
      noClasificados: ranked.filter(r => r.rank > topCount || !r.hasPlayed),
      allParticipants: ranked
    };
  }

  async importParticipants(participants = [], mode = 'REPLACE') {
    if (!participants || participants.length === 0) {
      return { success: true, totalImportados: 0, duplicadosOmitidos: 0 };
    }

    const supabase = this.getClient();
    let totalImported = 0;
    const BATCH_SIZE = 150;

    for (let i = 0; i < participants.length; i += BATCH_SIZE) {
      const batch = participants.slice(i, i + BATCH_SIZE).map(p => ({
        legajo: String(p.legajo || '').trim(),
        token_hash: String(p.token_hash || '').trim(),
        apellido: String(p.apellido || '').trim(),
        nombre: String(p.nombre || '').trim(),
        documento: String(p.documento || '').trim(),
        sector: String(p.sector || '').trim(),
        telefono: String(p.telefono || '').trim(),
        email: String(p.email || '').trim(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('participants')
        .upsert(batch, { onConflict: 'token_hash' });

      if (error) {
        console.error(`[SupabaseAdapter] Error insertando lote ${i}:`, error.message);
      } else {
        totalImported += batch.length;
      }
    }

    return {
      success: totalImported > 0,
      totalImportados: totalImported,
      duplicadosOmitidos: 0
    };
  }
}

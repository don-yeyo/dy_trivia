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
import { DEFAULT_TRIVIA_CONFIG, fetchSheetValues, getServerEnv, generateUserHash } from '../utils/googleSheets.js';
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
      return [];
    } catch (e) {
      console.error('[SupabaseAdapter] Error obteniendo preguntas de Supabase:', e.message);
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

  /**
   * Obtiene la nómina completa de participantes con su estado de juego y email enviado
   */
  async getParticipantsAdmin() {
    const supabase = this.getClient();

    // 1. Obtener participantes paginados
    let participants = [];
    let pFrom = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: page = [], error: pErr } = await supabase
        .from('participants')
        .select('*')
        .order('apellido', { ascending: true })
        .range(pFrom, pFrom + PAGE_SIZE - 1);

      if (pErr) {
        console.error('[SupabaseAdapter] Error obteniendo participantes admin:', pErr.message);
        break;
      }
      participants.push(...page);
      if (page.length < PAGE_SIZE) break;
      pFrom += PAGE_SIZE;
    }

    // 2. Obtener mapa de emails enviados desde config
    let emailSentMap = {};
    try {
      const { data: emailConfig } = await supabase
        .from('config')
        .select('valor')
        .eq('clave', 'EMAILS_ENVIADOS')
        .maybeSingle();

      if (emailConfig && emailConfig.valor) {
        emailSentMap = JSON.parse(emailConfig.valor);
      }
    } catch (e) {
      emailSentMap = {};
    }

    // 3. Obtener resumen de respuestas por participante
    let responses = [];
    let rFrom = 0;
    while (true) {
      const { data: page = [], error: rErr } = await supabase
        .from('responses')
        .select('legajo, fase, es_correcta, puntos_obtenidos, tiempo_tardado')
        .range(rFrom, rFrom + PAGE_SIZE - 1);

      if (rErr) break;
      responses.push(...page);
      if (page.length < PAGE_SIZE) break;
      rFrom += PAGE_SIZE;
    }

    const statsByLegajo = new Map();
    responses.forEach(r => {
      const leg = String(r.legajo || '').trim();
      if (!statsByLegajo.has(leg)) {
        statsByLegajo.set(leg, {
          answersCount: 0,
          correctCount: 0,
          rawPoints: 0,
          totalTime: 0,
          phasesPlayed: new Set()
        });
      }
      const st = statsByLegajo.get(leg);
      st.answersCount++;
      if (r.es_correcta) st.correctCount++;
      st.rawPoints += (parseInt(r.puntos_obtenidos, 10) || 0);
      st.totalTime += (parseInt(r.tiempo_tardado, 10) || 0);
      if (r.fase) st.phasesPlayed.add(parseInt(r.fase, 10));
    });

    // 4. Mapear y combinar
    return participants.map(p => {
      const leg = String(p.legajo || '').trim();
      const st = statsByLegajo.get(leg);
      const isEmailSent = p.email_enviado !== undefined && p.email_enviado !== null
        ? Boolean(p.email_enviado)
        : Boolean(emailSentMap[leg]);

      return {
        id: p.id,
        legajo: leg,
        token_hash: p.token_hash || '',
        apellido: p.apellido || '',
        nombre: p.nombre || '',
        documento: p.documento || '',
        sector: p.sector || '',
        telefono: p.telefono || '',
        email: p.email || '',
        email_enviado: isEmailSent,
        hasPlayed: st ? st.answersCount > 0 : false,
        answersCount: st ? st.answersCount : 0,
        correctCount: st ? st.correctCount : 0,
        totalTime: st ? st.totalTime : 0,
        phasesPlayed: st ? Array.from(st.phasesPlayed) : [],
        created_at: p.created_at,
        updated_at: p.updated_at
      };
    });
  }

  /**
   * Crea un participante en Supabase
   */
  async createParticipant(data = {}) {
    const supabase = this.getClient();
    const legajo = String(data.legajo || '').trim();
    if (!legajo) {
      return { success: false, error: 'El número de legajo es obligatorio' };
    }

    const apellido = String(data.apellido || '').trim();
    const nombre = String(data.nombre || '').trim();
    let token_hash = String(data.token_hash || '').trim();

    if (!token_hash) {
      token_hash = generateUserHash(legajo, apellido, nombre);
    }

    const payload = {
      legajo,
      token_hash,
      apellido,
      nombre,
      documento: String(data.documento || '').trim(),
      sector: String(data.sector || '').trim(),
      telefono: String(data.telefono || '').trim(),
      email: String(data.email || '').trim(),
      updated_at: new Date().toISOString()
    };

    const { data: created, error } = await supabase
      .from('participants')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseAdapter] Error creando participante:', error.message);
      return { success: false, error: error.message };
    }

    if (data.email_enviado !== undefined) {
      await this.toggleEmailSent(legajo, data.email_enviado);
    }

    return { success: true, data: created };
  }

  /**
   * Actualiza los datos de un participante existente
   */
  async updateParticipant(legajo, data = {}) {
    const supabase = this.getClient();
    const cleanLegajo = String(legajo || '').trim();
    if (!cleanLegajo) {
      return { success: false, error: 'Legajo requerido para actualizar' };
    }

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (data.nombre !== undefined) updatePayload.nombre = String(data.nombre).trim();
    if (data.apellido !== undefined) updatePayload.apellido = String(data.apellido).trim();
    if (data.documento !== undefined) updatePayload.documento = String(data.documento).trim();
    if (data.sector !== undefined) updatePayload.sector = String(data.sector).trim();
    if (data.telefono !== undefined) updatePayload.telefono = String(data.telefono).trim();
    if (data.email !== undefined) updatePayload.email = String(data.email).trim();
    if (data.token_hash !== undefined && data.token_hash !== '') {
      updatePayload.token_hash = String(data.token_hash).trim();
    }

    const { error } = await supabase
      .from('participants')
      .update(updatePayload)
      .eq('legajo', cleanLegajo);

    if (error) {
      console.error('[SupabaseAdapter] Error actualizando participante:', error.message);
      return { success: false, error: error.message };
    }

    if (data.email_enviado !== undefined) {
      await this.toggleEmailSent(cleanLegajo, data.email_enviado);
    }

    return { success: true };
  }

  /**
   * Elimina un participante y sus respuestas
   */
  async deleteParticipant(legajo) {
    const supabase = this.getClient();
    const cleanLegajo = String(legajo || '').trim();
    if (!cleanLegajo) {
      return { success: false, error: 'Legajo requerido para eliminar' };
    }

    // 1. Eliminar respuestas primero (evitar restricción de clave foránea)
    await supabase.from('responses').delete().eq('legajo', cleanLegajo);

    // 2. Eliminar participante
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('legajo', cleanLegajo);

    if (error) {
      console.error('[SupabaseAdapter] Error eliminando participante:', error.message);
      return { success: false, error: error.message };
    }

    // 3. Limpiar de emails enviados
    await this.toggleEmailSent(cleanLegajo, false);

    return { success: true };
  }

  /**
   * Regenera el token_hash oficial de un participante
   */
  async generateParticipantHash(legajo) {
    const supabase = this.getClient();
    const cleanLegajo = String(legajo || '').trim();

    const { data: user, error: findErr } = await supabase
      .from('participants')
      .select('*')
      .eq('legajo', cleanLegajo)
      .maybeSingle();

    if (findErr || !user) {
      return { success: false, error: 'Participante no encontrado' };
    }

    const newHash = generateUserHash(user.legajo, user.apellido, user.nombre);

    const { error: updErr } = await supabase
      .from('participants')
      .update({
        token_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .eq('legajo', cleanLegajo);

    if (updErr) {
      return { success: false, error: updErr.message };
    }

    return { success: true, token_hash: newHash };
  }

  /**
   * Genera hashes para todos los participantes que no posean token_hash
   */
  async generateAllMissingHashes() {
    const supabase = this.getClient();

    const { data: users, error } = await supabase
      .from('participants')
      .select('legajo, apellido, nombre, token_hash');

    if (error || !users) {
      return { success: false, error: error?.message || 'Error consultando participantes' };
    }

    let count = 0;
    for (const u of users) {
      if (!u.token_hash || String(u.token_hash).trim() === '') {
        const newHash = generateUserHash(u.legajo, u.apellido, u.nombre);
        await supabase
          .from('participants')
          .update({ token_hash: newHash, updated_at: new Date().toISOString() })
          .eq('legajo', u.legajo);
        count++;
      }
    }

    return { success: true, updatedCount: count };
  }

  /**
   * Marca o desmarca si el email fue enviado en la configuración persistente
   */
  async toggleEmailSent(legajo, emailSent) {
    const supabase = this.getClient();
    const cleanLegajo = String(legajo || '').trim();

    try {
      const { data: currentConfig } = await supabase
        .from('config')
        .select('valor')
        .eq('clave', 'EMAILS_ENVIADOS')
        .maybeSingle();

      let map = {};
      if (currentConfig && currentConfig.valor) {
        try { map = JSON.parse(currentConfig.valor); } catch (e) { map = {}; }
      }

      if (emailSent) {
        map[cleanLegajo] = true;
      } else {
        delete map[cleanLegajo];
      }

      await supabase.from('config').upsert({
        clave: 'EMAILS_ENVIADOS',
        valor: JSON.stringify(map),
        descripcion: 'Mapa JSON de legajos a los que se les envió el email de invitación',
        updated_at: new Date().toISOString()
      }, { onConflict: 'clave' });

      return { success: true };
    } catch (e) {
      console.warn('[SupabaseAdapter] Advertencia en toggleEmailSent:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Resetea el progreso y respuestas de un participante en una fase o en todas
   */
  async resetParticipantTrivia(legajo, phase = null) {
    const supabase = this.getClient();
    const cleanLegajo = String(legajo || '').trim();
    if (!cleanLegajo) {
      return { success: false, error: 'Legajo requerido para resetear trivia' };
    }

    let query = supabase.from('responses').delete().eq('legajo', cleanLegajo);
    if (phase !== null && phase !== undefined && phase !== '') {
      query = query.eq('fase', parseInt(phase, 10));
    }

    const { error } = await query;
    if (error) {
      console.error('[SupabaseAdapter] Error reseteando trivia:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  }
}

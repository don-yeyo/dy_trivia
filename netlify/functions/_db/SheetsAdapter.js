// ==============================================================================
// SHEETS ADAPTER (GOOGLE SHEETS API & APPS SCRIPT WEBHOOK)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { DatabaseAdapter } from './DatabaseAdapter.js';
import {
  fetchSheetValues,
  fetchTriviaConfig,
  updateTriviaConfig,
  sendToAppsScript,
  getServerEnv,
  DEFAULT_TRIVIA_CONFIG
} from '../utils/googleSheets.js';

export class SheetsAdapter extends DatabaseAdapter {
  constructor() {
    super('SheetsAdapter');
  }

  async init() {
    return true;
  }

  async getConfig() {
    return await fetchTriviaConfig();
  }

  async updateConfig(updates) {
    return await updateTriviaConfig(updates);
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

    const usersRange = getServerEnv('GOOGLE_SHEETS_USERS_RANGE') || 'Participantes!A1:Z500';
    const users = await fetchSheetValues(usersRange);

    const found = users.find(u => {
      const uHash = String(u.token_hash || '').trim().toLowerCase();
      const uLegajo = String(u.legajo || '').trim().toLowerCase();
      if (uHash === cleanToken) return true;
      if (allowSessionReset && uLegajo === cleanToken) return true;
      return false;
    });

    if (!found) return null;

    return {
      id: found.legajo,
      legajo: String(found.legajo || '').trim(),
      token_hash: String(found.token_hash || '').trim(),
      nombre: String(found.nombre || '').trim(),
      apellido: String(found.apellido || '').trim(),
      documento: String(found.documento || found.dni || '').trim(),
      sector: String(found.sector || '').trim(),
      telefono: String(found.telefono || '').trim(),
      email: String(found.email || found.correo || '').trim()
    };
  }

  async getUserProgress(legajo, phase) {
    const cleanLegajo = String(legajo || '').trim();
    const targetPhase = parseInt(phase, 10);
    const resultsRange = getServerEnv('GOOGLE_SHEETS_RESULTS_RANGE') || 'Resultados!A1:Z1000';

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
      const resultsRows = await fetchSheetValues(resultsRange);
      const userResult = resultsRows.find(r => {
        const rowLegajo = String(r.legajo || '').trim();
        const rowFase = parseInt(r.fase || '1', 10);
        return rowLegajo === cleanLegajo && rowFase === targetPhase;
      });

      if (!userResult) return defaultProgress;

      let answers = [];
      const rawJson = userResult['detalle respuestas (json)'] || userResult['detallerespuestas'] || userResult['respuestas'] || '';
      if (rawJson) {
        try {
          answers = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        } catch (e) {}
      }

      return {
        hasRecord: true,
        answers: Array.isArray(answers) ? answers.map(a => ({
          questionId: parseInt(a.questionId || a.id || 0, 10),
          timeSpent: parseInt(a.timeSpent || 0, 10),
          fechaHoraRespuesta: a.fechaHoraRespuesta || '',
          isCorrect: !!a.isCorrect,
          pointsEarned: parseInt(a.pointsEarned || 0, 10)
        })) : [],
        score: parseInt(userResult['puntaje obtenido'] || userResult.puntaje || '0', 10),
        correctCount: parseInt(userResult['respuestas correctas'] || userResult.correctas || '0', 10),
        totalTime: parseInt(userResult['tiempo total (segundos)'] || userResult.tiempo || '0', 10),
        fechaHora: userResult['fecha y hora'] || userResult.fechahora || '',
        isPhaseCompleted: true
      };
    } catch (err) {
      console.warn('[SheetsAdapter] Error obteniendo progreso:', err.message);
      return defaultProgress;
    }
  }

  async getQuestions(phase, sanitized = true) {
    const targetPhase = parseInt(phase, 10);
    const questionsRange = getServerEnv('GOOGLE_SHEETS_QUESTIONS_RANGE') || 'Preguntas!A1:Z100';
    const rows = await fetchSheetValues(questionsRange);

    const phaseRows = (rows || []).filter(r => {
      const qPhase = parseInt(r.fase || r.phase || '1', 10);
      return qPhase === targetPhase;
    });

    const parsedQuestions = [];

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
          options.push({
            id: i,
            text: String(optText).trim()
          });
        }
      }

      const rawCorrect = String(
        r.respuesta_correcta ||
        r.respuestacorrecta ||
        r.opcion_correcta ||
        r.opcioncorrecta ||
        r.correcta ||
        r.correctoptionid ||
        '1'
      ).trim().toUpperCase();

      const correctMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
      const correctOptionId = correctMap[rawCorrect] || parseInt(rawCorrect, 10) || 1;

      if (questionText && options.length >= 2) {
        const qObj = {
          id: qId,
          phase: targetPhase,
          question: questionText,
          points,
          options
        };

        if (!sanitized) {
          qObj.correctOptionId = correctOptionId;
        }

        parsedQuestions.push(qObj);
      }
    });

    return parsedQuestions;
  }

  async saveQuestionAnswer(params) {
    const { legajo, phase, questionId, selectedOptionId, isCorrect, pointsEarned, timeSpent, timestamp } = params;

    const ok = await sendToAppsScript({
      action: 'SAVE_QUESTION_ANSWER',
      legajo: String(legajo),
      fase: parseInt(phase, 10),
      fechaHoraRespuesta: timestamp || new Date().toISOString(),
      answer: {
        questionId: parseInt(questionId, 10),
        selectedOptionId: selectedOptionId !== null && selectedOptionId !== undefined ? parseInt(selectedOptionId, 10) : null,
        isCorrect: !!isCorrect,
        pointsEarned: parseInt(pointsEarned, 10) || 0,
        timeSpent: parseInt(timeSpent, 10) || 0,
        fechaHoraRespuesta: timestamp || new Date().toISOString()
      }
    });

    return { success: ok };
  }

  async getClassification(phase, topCount = 30, showPartial = true, showUnanswered = false) {
    const usersRange = getServerEnv('GOOGLE_SHEETS_USERS_RANGE') || 'Participantes!A1:Z500';
    const resultsRange = getServerEnv('GOOGLE_SHEETS_RESULTS_RANGE') || 'Resultados!A1:Z1000';
    const questionsRange = getServerEnv('GOOGLE_SHEETS_QUESTIONS_RANGE') || 'Preguntas!A1:Z100';

    let rawUsers = [];
    let rawResults = [];
    let rawQuestions = [];

    try { rawUsers = await fetchSheetValues(usersRange); } catch (e) {}
    try { rawResults = await fetchSheetValues(resultsRange); } catch (e) {}
    try { rawQuestions = await fetchSheetValues(questionsRange); } catch (e) {}

    const targetPhase = parseInt(phase, 10);
    const phaseQuestions = (rawQuestions || []).filter(q => parseInt(q.fase || q.phase || '1', 10) === targetPhase);
    let totalPhaseQuestions = phaseQuestions.length > 0 ? phaseQuestions.length : 10;

    const phaseResults = (rawResults || []).filter(r => parseInt(r.fase || r.phase || '1', 10) === targetPhase);

    const parseAnswersDetail = (row) => {
      const jsonField = row['detalle respuestas (json)'] || row['detallerespuestas'] || row['respuestas'] || '';
      if (jsonField) {
        try {
          const parsed = typeof jsonField === 'string' ? JSON.parse(jsonField) : jsonField;
          if (Array.isArray(parsed)) return { answersCount: parsed.length, hasExplicitJson: true };
        } catch (e) {}
      }
      return { answersCount: 0, hasExplicitJson: false };
    };

    let maxAnswersObserved = 0;
    phaseResults.forEach(r => {
      const { answersCount } = parseAnswersDetail(r);
      if (answersCount > maxAnswersObserved) maxAnswersObserved = answersCount;
    });
    if (maxAnswersObserved > totalPhaseQuestions) totalPhaseQuestions = maxAnswersObserved;

    const resultsByLegajo = new Map();
    phaseResults.forEach(r => {
      const legajo = String(r.legajo || '').trim();
      if (!legajo) return;

      const totalTime = parseInt(r['tiempo total (segundos)'] || r.tiempo || '0', 10);
      const correctCount = parseInt(r['respuestas correctas'] || r.correctas || '0', 10);
      const rawScore = parseInt(r['puntaje obtenido'] || r.puntaje || '0', 10);
      // Puntos = suma de aciertos (1 punto por pregunta según requerimiento oficial)
      const score = (r['respuestas correctas'] !== undefined || r.correctas !== undefined) ? correctCount : rawScore;
      const fechaHora = r['fecha y hora'] || r.fechahora || '';
      const { answersCount, hasExplicitJson } = parseAnswersDetail(r);

      const isPartial = hasExplicitJson ? (answersCount > 0 && answersCount < totalPhaseQuestions) : false;
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

    const participantsList = rawUsers.length > 0
      ? rawUsers
      : Array.from(resultsByLegajo.keys()).map(l => ({ legajo: l, nombre: 'Participante', apellido: l, sector: '' }));

    const merged = participantsList.map(u => {
      const legajo = String(u.legajo || '').trim();
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
        nombre: String(u.nombre || '').trim(),
        apellido: String(u.apellido || '').trim(),
        sector: String(u.sector || u.area || '').trim(),
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

    const filtered = merged.filter(p => {
      if (!p.hasPlayed) return Boolean(showUnanswered);
      if (p.isPartial) return Boolean(showPartial);
      return true;
    });

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

  async importParticipants(participants, mode = 'REPLACE') {
    const ok = await sendToAppsScript({
      action: 'IMPORT_PARTICIPANTES',
      participantes: participants,
      modo: mode
    });

    return {
      success: ok,
      totalImportados: participants.length,
      duplicadosOmitidos: 0
    };
  }
}

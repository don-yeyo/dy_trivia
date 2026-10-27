import * as XLSX from 'xlsx';

/**
 * Formatea segundos a minutos y segundos (ej. 1m 24s)
 */
function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Exporta la clasificación de la fase cerrada a un archivo Excel (.xlsx) nativo
 * Don Yeyo S.A. | Trivia Inocuidad 2026
 */
export function exportClassificationToExcel({
  phase = 1,
  topCount = 30,
  classificationData = null,
  publishedAt = null,
  adminUsername = 'admin'
}) {
  if (!classificationData) {
    throw new Error('No hay datos de clasificación disponibles para exportar.');
  }

  const allParticipants = classificationData.allParticipants || classificationData.clasificados || [];
  if (allParticipants.length === 0) {
    throw new Error('La lista de participantes clasificados está vacía.');
  }

  const fechaDescarga = new Date().toLocaleString('es-AR');
  const fechaCorte = publishedAt
    ? new Date(publishedAt).toLocaleString('es-AR')
    : fechaDescarga;

  // ---------------------------------------------------------------------------
  // HOJA 1: CLASIFICACIÓN GENERAL COMPLETA
  // ---------------------------------------------------------------------------
  const generalRows = [
    ['DON YEYO S.A. - DESAFÍO DE INOCUIDAD 2026'],
    [`CLASIFICACIÓN GENERAL OFICIAL - FASE ${phase}`],
    [`Fecha de Corte / Publicación: ${fechaCorte}`, ``, `Exportado por: @${adminUsername}`, `Fecha Exportación: ${fechaDescarga}`],
    [`Cupo Oficial Clasificados: Top ${topCount}`, `Total Evaluados: ${classificationData.totalJugados || allParticipants.length}`, `Total Inscriptos: ${classificationData.totalInscriptos || allParticipants.length}`],
    [], // Fila en blanco
    // Encabezados de tabla
    [
      'Posición',
      'Estado',
      'Legajo',
      'Apellido',
      'Nombre',
      'Sector / Área',
      'Grupo',
      'Puntaje',
      'Aciertos',
      'Tiempo (Segundos)',
      'Tiempo Total',
      'Fecha y Hora de Juego'
    ]
  ];

  allParticipants.forEach(p => {
    const isTop = p.rank <= topCount && p.hasPlayed;
    let estadoText = isTop ? `CLASIFICADO (TOP ${topCount})` : 'NO CLASIFICADO';
    if (!p.hasPlayed) {
      estadoText = 'NO PARTICIPÓ';
    } else if (p.isPartial) {
      estadoText = isTop ? `CLASIFICADO (PARCIAL)` : 'NO CLASIFICADO (PARCIAL)';
    }

    generalRows.push([
      p.rank,
      estadoText,
      p.legajo || '',
      p.apellido || '',
      p.nombre || '',
      p.sector || 'Planta',
      p.grupo || '-',
      p.hasPlayed ? (p.score || 0) : '-',
      p.hasPlayed ? (p.correctCount || 0) : '-',
      p.hasPlayed ? (p.totalTime || 0) : '-',
      p.hasPlayed ? formatTime(p.totalTime) : '-',
      p.fechaHora || ''
    ]);
  });

  const wsGeneral = XLSX.utils.aoa_to_sheet(generalRows);

  // Definir anchos de columna para Hoja 1
  wsGeneral['!cols'] = [
    { wch: 10 }, // Posición
    { wch: 24 }, // Estado
    { wch: 12 }, // Legajo
    { wch: 20 }, // Apellido
    { wch: 20 }, // Nombre
    { wch: 22 }, // Sector
    { wch: 18 }, // Grupo
    { wch: 12 }, // Puntaje
    { wch: 12 }, // Aciertos
    { wch: 18 }, // Tiempo (Seg)
    { wch: 16 }, // Tiempo Total
    { wch: 24 }  // Fecha
  ];

  // ---------------------------------------------------------------------------
  // HOJA 2: TOP CLASIFICADOS OFICIALES (Corte de cupo)
  // ---------------------------------------------------------------------------
  const qualifiedList = allParticipants.filter(p => p.rank <= topCount);
  const qualifiedRows = [
    ['DON YEYO S.A. - DESAFÍO DE INOCUIDAD 2026'],
    [`NÓMINA DE PARTICIPANTES CLASIFICADOS - FASE ${phase} (TOP ${topCount})`],
    [`Pasan oficialmente a la siguiente instancia de la Trivia de Inocuidad`],
    [],
    [
      'Puesto',
      'Legajo',
      'Participante',
      'Sector',
      'Grupo',
      'Puntaje',
      'Aciertos',
      'Tiempo Empleado'
    ]
  ];

  qualifiedList.forEach(p => {
    qualifiedRows.push([
      p.rank === 1 ? '1° (ORO)' : p.rank === 2 ? '2° (PLATA)' : p.rank === 3 ? '3° (BRONCE)' : `${p.rank}°`,
      p.legajo || '',
      `${p.apellido || ''}, ${p.nombre || ''}`.trim(),
      p.sector || 'Planta',
      p.grupo || '-',
      p.score || 0,
      p.correctCount || 0,
      formatTime(p.totalTime)
    ]);
  });

  const wsQualified = XLSX.utils.aoa_to_sheet(qualifiedRows);
  wsQualified['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 32 },
    { wch: 24 },
    { wch: 18 }, // Grupo
    { wch: 14 },
    { wch: 14 },
    { wch: 18 }
  ];

  // ---------------------------------------------------------------------------
  // HOJA 3: PODIO DE HONOR (Puestos 1°, 2° y 3°)
  // ---------------------------------------------------------------------------
  const podio = classificationData.podio || allParticipants.slice(0, 3);
  const podioRows = [
    ['DON YEYO S.A. - DESAFÍO DE INOCUIDAD 2026'],
    [`PODIO DE HONOR - FASE ${phase}`],
    [],
    ['Medalla', 'Puesto', 'Legajo', 'Participante', 'Sector', 'Grupo', 'Puntaje', 'Aciertos', 'Tiempo Total']
  ];

  const medallas = ['ORO (1° Campeón)', 'PLATA (2° Puesto)', 'BRONCE (3° Puesto)'];
  podio.forEach((p, idx) => {
    podioRows.push([
      medallas[idx] || `${idx + 1}°`,
      idx + 1,
      p.legajo || '',
      `${p.apellido || ''}, ${p.nombre || ''}`.trim(),
      p.sector || 'Planta',
      p.grupo || '-',
      p.score || 0,
      p.correctCount || 0,
      formatTime(p.totalTime)
    ]);
  });

  const wsPodio = XLSX.utils.aoa_to_sheet(podioRows);
  wsPodio['!cols'] = [
    { wch: 22 },
    { wch: 10 },
    { wch: 12 },
    { wch: 32 },
    { wch: 24 },
    { wch: 18 }, // Grupo
    { wch: 14 },
    { wch: 14 },
    { wch: 18 }
  ];

  // ---------------------------------------------------------------------------
  // CREACIÓN DEL LIBRO EXCEL (.XLSX) Y DESCARGA
  // ---------------------------------------------------------------------------
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsGeneral, `Clasificación Fase ${phase}`);
  XLSX.utils.book_append_sheet(wb, wsQualified, `Top ${topCount} Clasificados`);
  XLSX.utils.book_append_sheet(wb, wsPodio, `Podio Fase ${phase}`);

  // Nombre de archivo descriptivo
  const safeDate = new Date().toISOString().slice(0, 10);
  const fileName = `DonYeyo_Clasificacion_Fase_${phase}_Top${topCount}_${safeDate}.xlsx`;

  XLSX.writeFile(wb, fileName);
  return { success: true, fileName };
}

/**
 * Exporta una selección específica de participantes a un archivo Excel (.xlsx) nativo
 * Don Yeyo S.A. | Trivia Inocuidad 2026
 */
export function exportSelectedParticipantsToExcel({
  participants = [],
  activePhase = 1,
  adminUsername = 'admin'
}) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error('No hay participantes seleccionados para exportar.');
  }

  const fechaDescarga = new Date().toLocaleString('es-AR');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dy-inocuidad.netlify.app';

  const rows = [
    ['DON YEYO S.A. - DESAFÍO DE INOCUIDAD 2026'],
    [`NÓMINA DE PARTICIPANTES SELECCIONADOS (FASE ${activePhase})`],
    [`Exportado por: @${adminUsername}`, ``, `Fecha: ${fechaDescarga}`, `Total Seleccionados: ${participants.length}`],
    [], // Fila vacía
    [
      'Legajo',
      'Apellido',
      'Nombre',
      'Sector',
      'Grupo',
      'Email',
      'Teléfono',
      'Estado',
      'Clasificado',
      'Puesto (Ranking)',
      'Puntaje',
      'Resp. Correctas',
      'Tiempo (seg)',
      'Tiempo Total',
      'Estado Trivia',
      'Email Invitación',
      'Email Resultados',
      'Token Hash',
      'Link de Participación'
    ]
  ];

  participants.forEach(p => {
    const isActivo = p.activo !== false;
    let clasificadoText = 'SIN JUGAR';
    if (p.hasPlayed) {
      clasificadoText = p.isQualified ? 'SÍ (CLASIFICADO)' : 'NO CLASIFICADO';
    }

    let triviaText = 'Sin jugar';
    const count = Number(p.answersCount ?? 0);
    if (count >= 15) triviaText = 'Completado (15/15)';
    else if (count > 0) triviaText = `Parcial (${count}/15)`;

    const participationUrl = p.token_hash
      ? `${origin}/?token=${encodeURIComponent(p.token_hash)}`
      : 'Sin hash generado';

    rows.push([
      p.legajo || '',
      p.apellido || '',
      p.nombre || '',
      p.sector || 'Planta',
      p.grupo || '-',
      p.email || '',
      p.telefono || '',
      isActivo ? 'ACTIVO' : 'INACTIVO',
      clasificadoText,
      p.rank ? `#${p.rank}` : '-',
      p.hasPlayed ? (p.score || 0) : '-',
      p.hasPlayed ? (p.correctCount || 0) : '-',
      p.hasPlayed ? (p.totalTime || 0) : '-',
      p.hasPlayed ? formatTime(p.totalTime) : '-',
      triviaText,
      p.email_enviado ? 'SÍ' : 'NO',
      p.email_resultado_enviado ? 'SÍ' : 'NO',
      p.token_hash || '',
      participationUrl
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 12 }, // Legajo
    { wch: 20 }, // Apellido
    { wch: 20 }, // Nombre
    { wch: 22 }, // Sector
    { wch: 18 }, // Grupo
    { wch: 28 }, // Email
    { wch: 16 }, // Teléfono
    { wch: 12 }, // Estado (Activo/Inactivo)
    { wch: 20 }, // Clasificado
    { wch: 16 }, // Puesto
    { wch: 12 }, // Puntaje
    { wch: 15 }, // Resp. Correctas
    { wch: 14 }, // Tiempo (seg)
    { wch: 16 }, // Tiempo Total
    { wch: 20 }, // Estado Trivia
    { wch: 16 }, // Email Invitación
    { wch: 16 }, // Email Resultados
    { wch: 32 }, // Token Hash
    { wch: 55 }  // Link de Participación
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Participantes Seleccionados');

  const safeDate = new Date().toISOString().slice(0, 10);
  const fileName = `DonYeyo_Participantes_Seleccion_${participants.length}_${safeDate}.xlsx`;

  XLSX.writeFile(wb, fileName);
  return { success: true, fileName, count: participants.length };
}

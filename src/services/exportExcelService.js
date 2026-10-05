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
    ['DON YEYO S.A. - SEMANA DE LA INOCUIDAD 2026'],
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
      'Puntaje',
      'Aciertos',
      'Tiempo (Segundos)',
      'Tiempo Total',
      'Fecha y Hora de Juego'
    ]
  ];

  allParticipants.forEach(p => {
    const isTop = p.rank <= topCount;
    generalRows.push([
      p.rank,
      isTop ? `CLASIFICADO (TOP ${topCount})` : 'NO CLASIFICADO',
      p.legajo || '',
      p.apellido || '',
      p.nombre || '',
      p.sector || 'Planta',
      p.score || 0,
      p.correctCount || 0,
      p.totalTime || 0,
      formatTime(p.totalTime),
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
    ['DON YEYO S.A. - SEMANA DE LA INOCUIDAD 2026'],
    [`NÓMINA DE COLABORADORES CLASIFICADOS - FASE ${phase} (TOP ${topCount})`],
    [`Pasan oficialmente a la siguiente instancia de la Trivia de Inocuidad`],
    [],
    [
      'Puesto',
      'Legajo',
      'Colaborador',
      'Sector',
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
    { wch: 14 },
    { wch: 14 },
    { wch: 18 }
  ];

  // ---------------------------------------------------------------------------
  // HOJA 3: PODIO DE HONOR (Puestos 1°, 2° y 3°)
  // ---------------------------------------------------------------------------
  const podio = classificationData.podio || allParticipants.slice(0, 3);
  const podioRows = [
    ['DON YEYO S.A. - SEMANA DE LA INOCUIDAD 2026'],
    [`PODIO DE HONOR - FASE ${phase}`],
    [],
    ['Medalla', 'Puesto', 'Legajo', 'Colaborador', 'Sector', 'Puntaje', 'Aciertos', 'Tiempo Total']
  ];

  const medallas = ['ORO (1° Campeón)', 'PLATA (2° Puesto)', 'BRONCE (3° Puesto)'];
  podio.forEach((p, idx) => {
    podioRows.push([
      medallas[idx] || `${idx + 1}°`,
      idx + 1,
      p.legajo || '',
      `${p.apellido || ''}, ${p.nombre || ''}`.trim(),
      p.sector || 'Planta',
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

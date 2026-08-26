// ==============================================================================
// SERVICIO DE CARGA Y GESTIÓN DE PREGUNTAS DE TRIVIA
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import Papa from 'papaparse';

/**
 * Carga las preguntas desde CSV o Google Sheets y las filtra según la fase activa
 */
export async function loadTriviaQuestions(phase = 1, shuffle = false) {
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'csv';
  const googleSheetUrl = import.meta.env.VITE_GOOGLE_SHEET_QUESTIONS_URL;

  try {
    let csvData = "";
    if (dataSource === 'google_sheets' && googleSheetUrl) {
      const res = await fetch(googleSheetUrl);
      csvData = await res.text();
    } else {
      const res = await fetch('/data/preguntas_inocuidad.csv');
      if (res.ok) {
        csvData = await res.text();
      } else {
        return getFallbackQuestions(phase);
      }
    }

    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    
    // Filtrar por fase activa
    const filtered = parsed.data.filter(item => {
      const itemPhase = parseInt(item.fase || '1', 10);
      return itemPhase === parseInt(phase, 10);
    });

    if (filtered.length === 0) {
      console.warn(`No se encontraron preguntas para la fase ${phase}. Usando fallback.`);
      return getFallbackQuestions(phase);
    }

    // Normalizar formato de preguntas y opciones dinámicas (de 2 a 5 opciones)
    const formattedQuestions = filtered.map((row, index) => {
      const options = [];
      for (let i = 1; i <= 5; i++) {
        const optText = row[`opcion${i}`];
        if (optText && String(optText).trim() !== '') {
          options.push({
            id: i,
            text: String(optText).trim()
          });
        }
      }

      return {
        id: index + 1,
        question: row.pregunta || `Pregunta ${index + 1}`,
        options: options,
        correctOptionId: parseInt(row.respuesta_correcta || '1', 10),
        points: parseInt(row.puntos || '100', 10),
        explanation: row.explicacion || '',
        phase: parseInt(row.fase || '1', 10)
      };
    });

    // Aleatorizar si la variable de entorno lo solicita
    if (shuffle) {
      return shuffleArray(formattedQuestions);
    }

    return formattedQuestions;
  } catch (error) {
    console.error('Error al cargar preguntas de la trivia:', error);
    return getFallbackQuestions(phase);
  }
}

/**
 * Función auxiliar para mezclar array
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Preguntas de respaldo embebidas en caso de error de red
 */
function getFallbackQuestions(phase = 1) {
  const allFallback = [
    {
      id: 1,
      question: "¿Cuál es el tiempo mínimo recomendado para el lavado y desinfección de manos en la línea de producción?",
      options: [
        { id: 1, text: "10 segundos" },
        { id: 2, text: "20 segundos con jabón bactericida y fricción" },
        { id: 3, text: "5 segundos con agua solamente" },
        { id: 4, text: "1 minuto completo" }
      ],
      correctOptionId: 2,
      points: 100,
      explanation: "Según BPM y normas de inocuidad, el lavado efectivo requiere al menos 20 segundos de fricción con jabón desinfectante.",
      phase: 1
    },
    {
      id: 2,
      question: "¿Qué tipo de contaminación ocurre si un operario usa guantes sucios para manipular producto terminado?",
      options: [
        { id: 1, text: "Contaminación Física" },
        { id: 2, text: "Contaminación Cruzada / Biológica" },
        { id: 3, text: "Contaminación Radiológica" },
        { id: 4, text: "Contaminación Atmosférica" }
      ],
      correctOptionId: 2,
      points: 100,
      explanation: "La transferencia de microorganismos de una superficie sucia al alimento listo para consumo es contaminación cruzada.",
      phase: 1
    },
    {
      id: 3,
      question: "Ante la detección de un objeto extraño metálico en la tolva de amasado, ¿cuál es la acción inmediata?",
      options: [
        { id: 1, text: "Ignorarlo y continuar" },
        { id: 2, text: "Detener la línea inmediatamente y dar aviso a Calidad / Supervisor" },
        { id: 3, text: "Retirarlo al final del turno" }
      ],
      correctOptionId: 2,
      points: 150,
      explanation: "Cualquier peligro físico detectado exige la detención inmediata y notificación al área de Calidad para trazabilidad.",
      phase: 1
    },
    {
      id: 4,
      question: "¿Qué indumentaria está prohibida en zona de elaboración según el estándar Don Yeyo?",
      options: [
        { id: 1, text: "Cofia cubriendo todo el cabello" },
        { id: 2, text: "Barbijos o cubrebarba si corresponde" },
        { id: 3, text: "Anillos, aros, relojes y cadenas" },
        { id: 4, text: "Calzado de seguridad exclusivo de planta" }
      ],
      correctOptionId: 3,
      points: 100,
      explanation: "Todo tipo de joyería y accesorios personales representan un peligro físico y fuente de contaminación en planta.",
      phase: 1
    }
  ];

  return allFallback.filter(q => q.phase === phase);
}

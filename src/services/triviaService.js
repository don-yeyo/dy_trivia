// ==============================================================================
// SERVICIO DE CARGA Y GESTIÓN DE PREGUNTAS DE TRIVIA
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import Papa from 'papaparse';
import { fetchFromGoogleSheetsAPI, fetchFromPublishedCSV } from './googleSheetsService';

/**
 * Carga las preguntas de la fase activa desde el backend seguro (/api/questions)
 * evitando exponer respuestas correctas o credenciales en el cliente.
 */
export async function loadTriviaQuestions(phase = 1, shuffle = false) {
  try {
    // 1. Intentar llamar al backend serverless seguro
    const res = await fetch(`/api/questions?phase=${phase}&shuffle=${shuffle}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (backendError) {
    console.warn('Backend serverless no disponible, evaluando fallback:', backendError);
  }

  // 2. Modo Offline / Desarrollo con CSV local
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'csv';
  if (dataSource === 'csv') {
    try {
      const res = await fetch('/data/preguntas_inocuidad.csv');
      if (res.ok) {
        const csvData = await res.text();
        const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
        const rows = parsed.data || [];
        
        const filtered = rows.filter(item => {
          const itemPhase = parseInt(item.fase || '1', 10);
          return itemPhase === parseInt(phase, 10);
        });

        if (filtered.length > 0) {
          const formattedQuestions = filtered.map((row, index) => {
            const options = [];
            for (let i = 1; i <= 5; i++) {
              const optText = row[`opcion${i}`] || row[`opcion_${i}`];
              if (optText && String(optText).trim() !== '') {
                options.push({ id: i, text: String(optText).trim() });
              }
            }
            return {
              id: parseInt(row.id || index + 1, 10),
              phase: parseInt(row.fase || phase, 10),
              question: row.pregunta || '',
              points: parseInt(row.puntos || '100', 10),
              options
            };
          });

          return formattedQuestions;
        }
      }
    } catch (e) {
      console.warn('Error leyendo CSV local:', e);
    }
  }

  return getFallbackQuestions(phase);
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

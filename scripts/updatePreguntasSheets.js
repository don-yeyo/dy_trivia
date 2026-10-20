import { getDatabase } from '../netlify/functions/_db/index.js';

async function updateSheets() {
  console.log('Enviando correcciones tipográficas a Google Sheets vía Webhook...');
  const endpoint = process.env.GOOGLE_APPS_SCRIPT_ENDPOINT;
  if (!endpoint) {
    console.error('❌ Falta GOOGLE_APPS_SCRIPT_ENDPOINT en variables de entorno.');
    process.exit(1);
  }

  const updates = [
    {
      id: 4,
      pregunta: '¿Qué es un alimento inocuo?'
    },
    {
      id: 6,
      pregunta: '¿Los alérgenos qué tipo de peligros son?'
    },
    {
      id: 12,
      pregunta: '¿Cuál es la importancia del etiquetado en productos alimenticios?',
      opcion3: 'El etiquetado no requiere la declaración de alérgenos ya que el consumidor reconoce cuáles productos no debe consumir.'
    },
    {
      id: 13,
      pregunta: 'No registrar el lote de la materia prima utilizada en la elaboración de los alimentos, se considera un incumplimiento que afecta directamente a:'
    },
    {
      id: 15,
      opcion3: 'Si el técnico asegura no haber perdido ninguna pieza y tener todas las herramientas no es necesaria la liberación de calidad.'
    },
    {
      id: 16,
      pregunta: 'Frente a la rotura de un elemento frágil (vidrio, acrílico, cerámica) en una zona de proceso, ¿cuál es el procedimiento correcto?',
      opcion2: 'No detener la línea y continuar la producción; solo dejar registro de lo sucedido.'
    },
    {
      id: 20,
      opcion3: 'No implica peligro si hay un buen enjuague.'
    },
    {
      id: 22,
      opcion2: 'Al no identificarse como riesgo químico ya que es apto para uso alimenticio, se debe limpiar al finalizar el turno.'
    },
    {
      id: 24,
      opcion3: 'Retener la materia prima y activar el protocolo de control de plagas.'
    },
    {
      id: 25,
      opcion2: 'Retener la materia prima hasta que el proveedor responda la no conformidad y evaluar la situación de uso o rechazo.'
    }
  ];

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE_PREGUNTAS',
        updates
      }),
      redirect: 'follow'
    });

    const data = await res.json();
    console.log('Respuesta de Google Apps Script:', data);
    if (data.status === 'success' && data.updatedCount) {
      console.log(`✅ ¡Éxito! Se actualizaron ${data.updatedCount} preguntas en Google Sheets.`);
    } else {
      console.warn('⚠️ Nota: Apps Script devolvió:', data.message || data);
      console.warn('👉 Recuerda que para que Apps Script reconozca la nueva acción UPDATE_PREGUNTAS debes desplegar la "Nueva versión" en Google Sheets.');
    }
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  }
}

updateSheets();

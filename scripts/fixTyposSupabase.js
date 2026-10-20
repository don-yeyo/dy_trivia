import { getDatabase } from '../netlify/functions/_db/index.js';

async function fixTypos() {
  console.log('Iniciando corrección de errores ortográficos y tipográficos en Supabase...');
  const db = getDatabase();
  const client = db.getClient();

  const updates = [
    // 1. P4 (Fase 1, ID 4)
    {
      fase: 1,
      id: 4,
      modify: (q) => {
        q.pregunta = q.pregunta.replace('¿Qués es', '¿Qué es');
      }
    },
    // 2. P6 (Fase 1, ID 6)
    {
      fase: 1,
      id: 6,
      modify: (q) => {
        q.pregunta = q.pregunta.replace('que tipo', 'qué tipo');
      }
    },
    // 3. P12 (Fase 1, ID 12)
    {
      fase: 1,
      id: 12,
      modify: (q) => {
        q.pregunta = q.pregunta.replace('alimneticios', 'alimenticios');
        q.opciones = q.opciones.map(opt => {
          if (opt.id === 3) {
            let t = opt.text;
            t = t.replace('requeire', 'requiere');
            t = t.replace('cuales', 'cuáles');
            return { ...opt, text: t };
          }
          return opt;
        });
      }
    },
    // 4. P13 (Fase 1, ID 13)
    {
      fase: 1,
      id: 13,
      modify: (q) => {
        q.pregunta = q.pregunta.replace('afceta', 'afecta');
      }
    },
    // 5. P15 (Fase 1, ID 15)
    {
      fase: 1,
      id: 15,
      modify: (q) => {
        q.opciones = q.opciones.map(opt => {
          if (opt.id === 3) {
            let t = opt.text;
            t = t.replace('pérdido', 'perdido');
            t = t.replace('no es necesario la liberación', 'no es necesaria la liberación');
            return { ...opt, text: t };
          }
          return opt;
        });
      }
    },
    // 6. P16 (Fase 2, ID 16)
    {
      fase: 2,
      id: 16,
      modify: (q) => {
        q.pregunta = q.pregunta.replace('¿qual es', '¿cuál es');
        q.opciones = q.opciones.map(opt => {
          if (opt.id === 2) {
            let t = opt.text;
            t = t.replace('de los sucedido', 'de lo sucedido');
            return { ...opt, text: t };
          }
          return opt;
        });
      }
    },
    // 7. P20 (Fase 2, ID 20)
    {
      fase: 2,
      id: 20,
      modify: (q) => {
        q.opciones = q.opciones.map(opt => {
          if (opt.id === 3) {
            let t = opt.text.replace('enguaje', 'enjuague');
            return { ...opt, text: t };
          }
          return opt;
        });
      }
    },
    // 8. P22 (Fase 2, ID 22)
    {
      fase: 2,
      id: 22,
      modify: (q) => {
        q.opciones = q.opciones.map(opt => {
          if (opt.id === 2) {
            let t = opt.text.replace(' s debe limpiar', ', se debe limpiar');
            return { ...opt, text: t };
          }
          return opt;
        });
      }
    },
    // 9. P24 (Fase 2, ID 24)
    {
      fase: 2,
      id: 24,
      modify: (q) => {
        q.opciones = q.opciones.map(opt => {
          if (opt.id === 3) {
            let t = opt.text.replace('le protocolo', 'el protocolo');
            return { ...opt, text: t };
          }
          return opt;
        });
      }
    },
    // 10. P25 (Fase 2, ID 25)
    {
      fase: 2,
      id: 25,
      modify: (q) => {
        q.opciones = q.opciones.map(opt => {
          if (opt.id === 2) {
            let t = opt.text.replace('le proveedor', 'el proveedor');
            return { ...opt, text: t };
          }
          return opt;
        });
      }
    }
  ];

  let successCount = 0;

  for (const item of updates) {
    const { data: current, error: fetchErr } = await client
      .from('questions')
      .select('*')
      .eq('fase', item.fase)
      .eq('id', item.id)
      .single();

    if (fetchErr || !current) {
      console.error(`❌ No se encontró la pregunta Fase ${item.fase} ID ${item.id}:`, fetchErr?.message);
      continue;
    }

    const modified = { ...current };
    item.modify(modified);

    const { error: updateErr } = await client
      .from('questions')
      .update({
        pregunta: modified.pregunta,
        opciones: modified.opciones
      })
      .eq('fase', item.fase)
      .eq('id', item.id);

    if (updateErr) {
      console.error(`❌ Error actualizando Pregunta Fase ${item.fase} ID ${item.id}:`, updateErr.message);
    } else {
      console.log(`✅ [Fase ${item.fase} - Pregunta ID ${item.id}] Corregida exitosamente.`);
      successCount++;
    }
  }

  console.log(`\n🎉 Finalizado: ${successCount}/${updates.length} preguntas corregidas en Supabase.`);
  process.exit(0);
}

fixTypos().catch(err => {
  console.error('💥 Error inesperado:', err);
  process.exit(1);
});

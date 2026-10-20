import * as XLSX from 'xlsx';
import { getDatabase } from '../netlify/functions/_db/index.js';

async function main() {
  console.log('========================================================================');
  console.log('📧 ACTUALIZACIÓN DE EMAILS DESDE data/correcciones_emails.xlsx');
  console.log('========================================================================\n');

  // 1. Leer Excel
  const reader = XLSX.readFile || XLSX.default?.readFile;
  const wb = reader('data/correcciones_emails.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = (XLSX.utils || XLSX.default?.utils).sheet_to_json(sheet, { defval: '' });

  console.log(`📊 Total de filas en el archivo Excel: ${rows.length}`);

  const toUpdate = [];
  const skippedVacio = [];
  const skippedIguales = [];

  for (const r of rows) {
    const legajo = String(r['Legajo'] || '').trim();
    const nombre = String(r['Apellido y Nombre'] || '').trim();
    const emailCorrecto = String(r['Email Correcto'] || '').trim();
    const emailActual = String(r['Email Actual'] || '').trim();

    const isVacio = emailCorrecto.toLowerCase() === '(vacío)' ||
                    emailCorrecto.toLowerCase() === '(vacio)' ||
                    emailCorrecto === '';

    if (isVacio) {
      skippedVacio.push({ legajo, nombre, emailActual });
      continue;
    }

    if (emailCorrecto.toLowerCase() === emailActual.toLowerCase()) {
      skippedIguales.push({ legajo, nombre, emailActual });
      continue;
    }

    toUpdate.push({
      legajo,
      nombre,
      emailActual,
      emailCorrecto
    });
  }

  console.log(`📋 Registros a actualizar: ${toUpdate.length}`);
  console.log(`⏭️  Registros omitidos por "(Vacío)": ${skippedVacio.length}`);
  console.log(`⏭️  Registros omitidos por ser idénticos: ${skippedIguales.length}\n`);

  if (toUpdate.length === 0) {
    console.log('✨ No hay registros pendientes para actualizar.');
    process.exit(0);
  }

  // 2. Actualizar en Supabase
  console.log('🚀 [1/2] Actualizando participantes en Supabase (PostgreSQL)...');
  const db = getDatabase();
  const supabase = db.getClient();

  let supabaseSuccess = 0;
  let supabaseNotFound = 0;
  let supabaseErrors = 0;

  for (const item of toUpdate) {
    const { data, error } = await supabase
      .from('participants')
      .update({
        email: item.emailCorrecto,
        updated_at: new Date().toISOString()
      })
      .eq('legajo', item.legajo)
      .select('legajo, nombre, apellido, email');

    if (error) {
      console.error(`❌ Error en Supabase para Legajo ${item.legajo}: ${error.message}`);
      supabaseErrors++;
    } else if (!data || data.length === 0) {
      console.warn(`⚠️ Legajo ${item.legajo} (${item.nombre}) no encontrado en Supabase.`);
      supabaseNotFound++;
    } else {
      supabaseSuccess++;
    }
  }

  console.log(`✅ Supabase: ${supabaseSuccess} actualizados con éxito. (${supabaseNotFound} no encontrados, ${supabaseErrors} errores)\n`);

  // 3. Actualizar en Google Sheets vía Webhook
  console.log('🚀 [2/2] Actualizando en Google Sheets (pestaña Participantes y blanqueo de "Email Link de Trivia")...');
  const endpoint = process.env.GOOGLE_APPS_SCRIPT_ENDPOINT;

  if (!endpoint) {
    console.warn('⚠️ No se encontró GOOGLE_APPS_SCRIPT_ENDPOINT en variables de entorno.');
    process.exit(0);
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE_PARTICIPANTES_EMAILS',
        updates: toUpdate
      }),
      redirect: 'follow'
    });

    const data = await res.json().catch(() => null);
    if (data && data.status === 'success' && data.updatedCount !== undefined) {
      console.log(`✅ Google Sheets: ${data.updatedCount} filas actualizadas y marcas blanqueadas exitosamente.`);
    } else {
      console.warn(`⚠️ Google Apps Script respondió:`, data?.message || data || res.status);
      console.warn(`👉 Recuerda actualizar Código.gs con la "Nueva versión" en Google Apps Script para habilitar esta acción si aún no fue desplegada.`);
    }
  } catch (err) {
    console.error(`❌ Error conectando con Google Apps Script: ${err.message}`);
  }

  console.log('\n========================================================================');
  console.log('🏁 PROCESO FINALIZADO');
  console.log('========================================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('💥 Error no controlado:', err);
  process.exit(1);
});

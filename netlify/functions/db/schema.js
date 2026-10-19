// ==============================================================================
// VERIFICACIÓN DE ESQUEMA EN SUPABASE (REST EXCLUSIVO - SIN PG NI CONEXIONES DIRECTAS)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getSupabaseClient } from './supabaseClient.js';

let schemaVerified = false;

/**
 * Verifica si las tablas necesarias existen en Supabase utilizando exclusivamente
 * peticiones REST (PostgREST), sin abrir conexiones directas TCP ni usar librerías de Postgres.
 * 
 * @returns {Promise<boolean>} true si las tablas existen y responden por REST
 */
export async function checkOrInitSchema() {
  if (schemaVerified) return true;

  try {
    const supabase = getSupabaseClient();

    // Verificación 100% REST vía PostgREST
    const { error: partErr } = await supabase.from('participants').select('id', { head: true, count: 'exact' });
    const { error: confErr } = await supabase.from('config').select('clave', { head: true, count: 'exact' });
    const { error: respErr } = await supabase.from('responses').select('id', { head: true, count: 'exact' });

    const isMissing = (err) => err && (
      err.code === '42P01' ||
      err.code === 'PGRST204' ||
      err.code === 'PGRST200' ||
      String(err.message || '').includes('does not exist') ||
      String(err.message || '').includes('not found')
    );

    const needsCreation = isMissing(partErr) || isMissing(confErr) || isMissing(respErr);

    if (!needsCreation) {
      schemaVerified = true;
      return true;
    }

    console.warn(`
⚠️ [Supabase REST] ATENCIÓN: Las tablas de la trivia aún no fueron creadas en Supabase.
Para crearlas sin consumir conexiones directas:
  1. Abrí tu panel de Supabase > SQL Editor
  2. Pegá y ejecutá el contenido del archivo 'supabase/schema.sql'
    `);

    return false;
  } catch (err) {
    console.error('[Supabase REST] Error verificando tablas por REST:', err.message);
    return false;
  }
}

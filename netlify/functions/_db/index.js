// ==============================================================================
// FACTORY PATTERN: DATABASE ENGINE SELECTOR (FEATURE FLAG)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { SheetsAdapter } from './SheetsAdapter.js';
import { SupabaseAdapter } from './SupabaseAdapter.js';
import { getServerEnv } from '../utils/googleSheets.js';

let activeAdapter = null;

/**
 * Obtiene el nombre del motor configurado por variable de entorno.
 * Valores válidos: 'supabase' | 'sheets'
 * Default: 'sheets' (para retrocompatibilidad segura)
 * @returns {'supabase'|'sheets'}
 */
export function getDatabaseEngine() {
  const engine = (
    getServerEnv('DB_ENGINE') ||
    getServerEnv('DATABASE_ENGINE') ||
    'sheets'
  ).toLowerCase().trim();

  return engine === 'supabase' ? 'supabase' : 'sheets';
}

/**
 * Obtiene la instancia singleton del adaptador de base de datos activo según DB_ENGINE.
 * @returns {import('./DatabaseAdapter.js').DatabaseAdapter}
 */
export function getDatabase() {
  const currentEngine = getDatabaseEngine();

  if (activeAdapter && activeAdapter.engineName === currentEngine) {
    return activeAdapter;
  }

  if (currentEngine === 'supabase') {
    activeAdapter = new SupabaseAdapter();
  } else {
    activeAdapter = new SheetsAdapter();
  }

  activeAdapter.engineName = currentEngine;
  return activeAdapter;
}

export { SheetsAdapter, SupabaseAdapter };

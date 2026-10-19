// ==============================================================================
// CLIENTE OFICIAL SUPABASE - SINGLETON REST PARA BACKEND SERVERLESS
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
// 1. Uso exclusivo de REST vía PostgREST (cero conexiones directas TCP/pg).
// 2. Instanciación en ámbito de módulo (Module Scope) para Warm Starts en Netlify.
// 3. Prohibición de WebSockets / Realtime (mantiene el límite del plan gratuito).
// ==============================================================================
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '../utils/googleSheets.js';

let cachedClient = null;

/**
 * Retorna la instancia singleton del cliente Supabase optimizada para Lambdas Serverless.
 * Al estar cacheada en ámbito de módulo, se reutiliza durante los 'warm starts' de Netlify
 * sin re-crear conexiones ni headers en cada petición de los 470 usuarios simultáneos.
 * 
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = getServerEnv('SUPABASE_URL');
  const supabaseKey = getServerEnv('SUPABASE_SERVICE_ROLE_KEY') || getServerEnv('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Faltan variables de entorno para Supabase. Asegúrese de definir SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY) en Netlify / .env'
    );
  }

  // Creación exclusiva de cliente REST stateless
  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    // 🛡️ REGLA CRÍTICA: Deshabilitar completamente WebSockets / Realtime
    // Evita saturar el cupo de 200 conexiones concurrentes de la capa gratuita
    realtime: {
      params: {
        eventsPerSecond: 0
      }
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'dy-trivia-backend-rest'
      }
    }
  });

  return cachedClient;
}

// ==============================================================================
// NETLIFY FUNCTION: ADMIN AUTH (/api/admin-auth)
// Valida las credenciales de administrador de forma segura exclusivamente en servidor
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import crypto from 'crypto';
import { getServerEnv } from './utils/googleSheets.js';

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    // Obtener credenciales estrictamente desde las variables de entorno del servidor
    // NUNCA expuestas al frontend (sin prefijo VITE_)
    const envUser = getServerEnv('ADMIN_USER');
    const envPass = getServerEnv('ADMIN_PASSWORD');
    const seedPhrase = getServerEnv('SEED_PHRASE') || 'DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO';

    if (!envUser || !envPass) {
      console.error('[admin-auth] ADMIN_USER o ADMIN_PASSWORD no están configurados en el servidor.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuración de credenciales de administrador no disponible en el servidor' })
      };
    }

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Usuario y contraseña requeridos' })
      };
    }

    if (username !== envUser || password !== envPass) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Credenciales inválidas' })
      };
    }

    // Generar un token de sesión seguro con timestamp y firma HMAC
    const expiresAt = Date.now() + (12 * 60 * 60 * 1000); // 12 horas
    const payload = `${username}_${expiresAt}`;
    const signature = crypto.createHmac('sha256', seedPhrase).update(payload).digest('hex');
    const token = `${Buffer.from(payload).toString('base64')}.${signature}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token,
        username,
        expiresAt
      })
    };
  } catch (error) {
    console.error('Error en /api/admin-auth:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno en autenticación', details: error.message })
    };
  }
}

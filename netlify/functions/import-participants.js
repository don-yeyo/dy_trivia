// ==============================================================================
// NETLIFY FUNCTION: IMPORT PARTICIPANTS (/api/import-participants)
// Importa la nómina de colaboradores hacia el motor de BD activo (Supabase o Sheets)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import crypto from 'crypto';
import Papa from 'papaparse';
import { getDatabase } from './_db/index.js';
import { getServerEnv, verifyAdminToken } from './utils/googleSheets.js';

export async function handler(event, context) {
  const db = getDatabase();
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
      body: JSON.stringify({ error: 'Método no permitido. Utilizar POST.' })
    };
  }

  // 1. Verificar credenciales del Administrador
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const isAdmin = verifyAdminToken(authHeader);

  if (!isAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Acceso no autorizado. Se requieren credenciales de administrador.' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const seedPhrase = getServerEnv('SEED_PHRASE') || 'DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO';

    let rawRows = [];

    if (body.csvText) {
      const firstLine = body.csvText.split('\n')[0] || '';
      const delimiter = firstLine.includes(';') ? ';' : ',';
      const parsed = Papa.parse(body.csvText, {
        header: true,
        delimiter,
        skipEmptyLines: true
      });
      rawRows = parsed.data || [];
    } else if (Array.isArray(body.participantes)) {
      rawRows = body.participantes;
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No se recibieron datos para importar (esperado csvText o participantes).' })
      };
    }

    if (rawRows.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El archivo o texto CSV no contiene registros válidos.' })
      };
    }

    // 2. Mapear e insertar datos según las reglas del concurso
    const participants = [];
    const seenLegajos = new Set();
    let duplicatesCount = 0;

    rawRows.forEach((row) => {
      const rawLegajo = row['Leg'] || row['legajo'] || row['LEGAJO'] || '';
      const legajo = String(rawLegajo).trim();
      if (!legajo) return;

      if (seenLegajos.has(legajo)) {
        duplicatesCount++;
        return;
      }
      seenLegajos.add(legajo);

      // Separación de Apellido y Nombre
      const fullNombre = String(row['Apellido y Nombre'] || row['apellido_y_nombre'] || '').trim();
      let apellido = '';
      let nombre = '';

      if (fullNombre.includes(',')) {
        const parts = fullNombre.split(',');
        apellido = parts[0].trim();
        nombre = parts.slice(1).join(',').trim();
      } else {
        apellido = String(row['apellido'] || fullNombre).trim();
        nombre = String(row['nombre'] || '').trim();
      }

      // Hash único con la semilla oficial
      const rawString = `${seedPhrase}_${legajo}_${apellido.toUpperCase()}_${nombre.toUpperCase()}`;
      const token_hash = crypto.createHash('sha256').update(rawString).digest('hex');

      const documento = String(row['Nro. de Documento'] || row['documento'] || row['DNI'] || '').trim();
      const sector = String(row['Sector'] || row['sector'] || '').trim();
      const telefono = String(row['Telefono'] || row['telefono'] || '').trim();
      const email = String(row['E-mail'] || row['email'] || row['EMAIL'] || '').trim();

      participants.push({
        legajo,
        apellido,
        nombre,
        token_hash,
        documento,
        sector,
        telefono,
        email
      });
    });

    // 3. Enviar al motor de persistencia activo
    const result = await db.importParticipants(participants, body.modo || 'REPLACE');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: result.success,
        engine: db.engineName,
        message: `Se procesaron ${participants.length} participantes (${duplicatesCount} duplicados en origen omitidos).`,
        totalImportados: result.totalImportados || participants.length,
        duplicadosOmitidos: duplicatesCount,
        sample: participants.slice(0, 5)
      })
    };

  } catch (err) {
    console.error('Error en /api/import-participants:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Error procesando importación: ${err.message}` })
    };
  }
}

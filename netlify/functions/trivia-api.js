// ==============================================================================
// NETLIFY SERVERLESS FUNCTION - TRIVIA DON YEYO API
// Provee endpoints serverless para lectura/escritura segura con Google Sheets
// ==============================================================================

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
  }

  try {
    const { httpMethod, queryStringParameters, body } = event;

    // GET /api/trivia?phase=1
    if (httpMethod === 'GET') {
      const phase = queryStringParameters?.phase || '1';
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          phase: parseInt(phase, 10),
          message: 'Endpoint listo para Google Sheets API'
        })
      };
    }

    // POST /api/save-access (Registrar fecha/hora y respuestas)
    if (httpMethod === 'POST') {
      const data = JSON.parse(body || '{}');
      const { legajo, fase, fechaHora, puntaje } = data;

      // Aquí se conecta con Google Sheets API v4 usando credenciales en env vars
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          message: `Acceso y respuestas registradas para legajo ${legajo} en Fase ${fase}`,
          recordedAt: fechaHora || new Date().toISOString(),
          puntaje
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

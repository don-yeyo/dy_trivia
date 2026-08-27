// ==============================================================================
// SCRIPT NODE.JS PARA POBLAR GOOGLE SHEETS DESDE ARCHIVOS CSV LOCALES
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer archivo .env manualmente
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/VITE_GOOGLE_APPS_SCRIPT_ENDPOINT\s*=\s*["']?([^"'\r\n]+)["']?/);
const APPS_SCRIPT_URL = match ? match[1] : '';

async function run() {
  console.log('🚀 Iniciando script de población de Google Sheets...');
  
  if (!APPS_SCRIPT_URL) {
    console.error('❌ Error: VITE_GOOGLE_APPS_SCRIPT_ENDPOINT no está configurada en .env');
    process.exit(1);
  }

  // Leer CSV de Preguntas
  const preguntasCsvPath = path.join(__dirname, '../public/data/preguntas_inocuidad.csv');
  const preguntasCsvText = fs.readFileSync(preguntasCsvPath, 'utf8');
  const parsedPreguntas = Papa.parse(preguntasCsvText, { header: true, skipEmptyLines: true });

  // Leer CSV de Participantes
  const usuariosCsvPath = path.join(__dirname, '../public/data/usuarios_participantes.csv');
  const usuariosCsvText = fs.readFileSync(usuariosCsvPath, 'utf8');
  const parsedUsuarios = Papa.parse(usuariosCsvText, { header: true, skipEmptyLines: true });

  console.log(`📦 Preguntas encontradas: ${parsedPreguntas.data.length}`);
  console.log(`👥 Participantes encontrados: ${parsedUsuarios.data.length}`);

  const payload = {
    action: 'POBLAR_DEMO',
    preguntas: parsedPreguntas.data,
    participantes: parsedUsuarios.data
  };

  try {
    console.log(`📡 Enviando datos al Webhook: ${APPS_SCRIPT_URL}`);
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    console.log('✅ Respuesta del servidor:', result);
    console.log('🎉 ¡Google Sheet poblada exitosamente con datos de Don Yeyo!');
  } catch (error) {
    console.error('❌ Error al enviar datos:', error);
  }
}

run();

// ==============================================================================
// SCRIPT DE IMPORTACIÓN DE LEGAJOS A GOOGLE SHEETS
// Don Yeyo S.A. | Trivia Inocuidad 2026
// Lee data/legajos.csv, mapea campos, genera token_hash único y sincroniza
// ==============================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer .env
const envPath = path.join(__dirname, '../.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

function getEnvVar(name, fallback = '') {
  const match = envContent.match(new RegExp(`${name}\\s*=\\s*["']?([^"'\\r\\n]+)["']?`));
  return match ? match[1].trim() : fallback;
}

const SEED_PHRASE = getEnvVar('SEED_PHRASE', 'DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO');
const APPS_SCRIPT_URL = getEnvVar('GOOGLE_APPS_SCRIPT_ENDPOINT', getEnvVar('VITE_GOOGLE_APPS_SCRIPT_ENDPOINT'));

export function generateUserHash(legajo, apellido, nombre) {
  const cleanLegajo = String(legajo || '').trim();
  const cleanApellido = String(apellido || '').trim().toUpperCase();
  const cleanNombre = String(nombre || '').trim().toUpperCase();
  const rawString = `${SEED_PHRASE}_${cleanLegajo}_${cleanApellido}_${cleanNombre}`;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}

export function parseAndMapLegajos(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true
  });

  const participants = [];
  const seenLegajos = new Set();
  let duplicatesCount = 0;

  parsed.data.forEach((row, index) => {
    const rawLegajo = row['Leg'] || row['legajo'] || row['LEGAJO'] || '';
    const legajo = String(rawLegajo).trim();
    if (!legajo) return;

    if (seenLegajos.has(legajo)) {
      duplicatesCount++;
      return;
    }
    seenLegajos.add(legajo);

    const fullNombre = String(row['Apellido y Nombre'] || row['apellido_y_nombre'] || '').trim();
    let apellido = '';
    let nombre = '';

    if (fullNombre.includes(',')) {
      const parts = fullNombre.split(',');
      apellido = parts[0].trim();
      nombre = parts.slice(1).join(',').trim();
    } else {
      apellido = fullNombre;
      nombre = '';
    }

    const documento = String(row['Nro. de Documento'] || row['documento'] || row['DNI'] || '').trim();
    const sector = String(row['Sector'] || row['sector'] || '').trim();
    const telefono = String(row['Telefono'] || row['telefono'] || '').trim();
    const email = String(row['E-mail'] || row['email'] || row['EMAIL'] || '').trim();
    const token_hash = generateUserHash(legajo, apellido, nombre);

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

  return { participants, duplicatesCount, totalRows: parsed.data.length };
}

async function run() {
  console.log('================================================================');
  console.log('🚀 INICIANDO IMPORTACIÓN DE LEGAJOS - DON YEYO S.A.');
  console.log('================================================================');

  const csvPath = path.join(__dirname, '../data/legajos.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: No se encontró el archivo ${csvPath}`);
    process.exit(1);
  }

  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const { participants, duplicatesCount, totalRows } = parseAndMapLegajos(rawCsv);

  console.log(`📄 Filas leídas del archivo CSV: ${totalRows}`);
  console.log(`⚠️  Duplicados omitidos por clave legajo: ${duplicatesCount}`);
  console.log(`✅ Participantes listos para importar: ${participants.length}`);

  // Mostrar primeros 3 participantes de muestra
  console.log('\n🔍 Muestra de primeros 3 registros mapeados:');
  participants.slice(0, 3).forEach((p, i) => {
    console.log(`  [${i + 1}] Legajo: ${p.legajo} | ${p.apellido}, ${p.nombre} | Doc: ${p.documento} | Sector: ${p.sector} | Email: ${p.email}`);
    console.log(`      Hash único: ${p.token_hash}`);
  });

  // Guardar copia local en public/data/usuarios_participantes.csv para fallback offline
  try {
    const publicCsvPath = path.join(__dirname, '../public/data/usuarios_participantes.csv');
    const csvContent = Papa.unparse(participants, { header: true });
    fs.writeFileSync(publicCsvPath, csvContent, 'utf8');
    console.log(`\n💾 Copia local sincronizada en: ${publicCsvPath}`);
  } catch (e) {
    console.warn('Advertencia al escribir copia local:', e.message);
  }

  // Enviar a Google Sheets vía Webhook de Apps Script
  if (!APPS_SCRIPT_URL) {
    console.error('\n❌ Error: No se encontró GOOGLE_APPS_SCRIPT_ENDPOINT en el archivo .env');
    process.exit(1);
  }

  console.log(`\n📡 Enviando ${participants.length} colaboradores a Google Sheets...`);
  console.log(`   Endpoint: ${APPS_SCRIPT_URL}`);

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'IMPORT_PARTICIPANTES',
        participantes: participants,
        modo: 'REPLACE'
      })
    });

    const result = await res.json();
    console.log('\n📬 Respuesta de Google Apps Script:');
    console.log(JSON.stringify(result, null, 2));

    if (result.status === 'success') {
      console.log('\n🎉 ¡IMPORTACIÓN COMPLETADA CON ÉXITO EN GOOGLE SHEETS!');
      console.log(`   Pestaña "Participantes" actualizada con ${result.totalImportados || participants.length} colaboradores.`);
    } else {
      console.log('\n⚠️ Google Apps Script respondió:', result.message || 'Verificar script');
    }
  } catch (err) {
    console.error('\n❌ Error al comunicarse con Google Apps Script:', err.message);
  }
}

// Si se ejecuta directamente desde node
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}

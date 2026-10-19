#!/usr/bin/env node
// ==============================================================================
// SCRIPT DE MIGRACIÓN: GOOGLE SHEETS -> SUPABASE (POSTGRESQL)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
// - Lee Configuración, Participantes y Preguntas desde Google Sheets API v4
// - Realiza Bulk Insert / Upsert idempotente en Supabase (ON CONFLICT DO UPDATE)
// - Puede ejecutarse múltiples veces sin duplicar registros ni romper la base
// ==============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Cargar variables de entorno de .env y .env_mailn
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const envMailn = path.join(ROOT_DIR, '.env_mailn');
if (fs.existsSync(envMailn)) {
  const cfg = dotenv.parse(fs.readFileSync(envMailn));
  for (const k in cfg) if (!process.env[k]) process.env[k] = cfg[k];
}

function getEnv(key, fallback = '') {
  return process.env[key] || process.env[`VITE_${key}`] || fallback;
}

// 1. Validar Credenciales de Supabase
const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR FATAL: Faltan variables de entorno para Supabase.');
  console.error('Configure SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el archivo .env\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// 2. Conectar a Google Sheets API v4
async function fetchSheetRows(range) {
  const spreadsheetId = getEnv('GOOGLE_SHEETS_SPREADSHEET_ID');
  const apiKey = getEnv('GOOGLE_SHEETS_API_KEY');

  if (!spreadsheetId || !apiKey) {
    throw new Error('Faltan GOOGLE_SHEETS_SPREADSHEET_ID o GOOGLE_SHEETS_API_KEY en .env');
  }

  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;
  const appUrl = getEnv('APP_BASE_URL', 'https://dy-inocuidad.netlify.app');

  const res = await fetch(url, {
    headers: {
      'Referer': appUrl.endsWith('/') ? appUrl : `${appUrl}/`,
      'Origin': appUrl
    }
  });

  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status} leyendo rango ${range}: ${await res.text()}`);
  }

  const data = await res.json();
  const rows = data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : '';
    });
    return obj;
  });
}

function calculateHash(legajo, apellido, nombre) {
  const seed = getEnv('SEED_PHRASE', 'DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO');
  const cleanLegajo = String(legajo || '').trim();
  const cleanApellido = String(apellido || '').trim().toUpperCase();
  const cleanNombre = String(nombre || '').trim().toUpperCase();
  return crypto.createHash('sha256').update(`${seed}_${cleanLegajo}_${cleanApellido}_${cleanNombre}`).digest('hex');
}

// ------------------------------------------------------------------------------
// FUNCIÓN PRINCIPAL DE MIGRACIÓN
// ------------------------------------------------------------------------------
async function runMigration() {
  console.log(`\n========================================================================`);
  console.log(`🚀 MIGRACIÓN DE DATOS: GOOGLE SHEETS -> SUPABASE (POSTGRESQL)`);
  console.log(`   Don Yeyo S.A. | Trivia Inocuidad 2026`);
  console.log(`========================================================================\n`);

  console.log(`📡 Destino Supabase: ${supabaseUrl}`);

  // Paso 0: Verificar tablas en Supabase
  console.log(`\n🔍 [1/4] Verificando tablas en Supabase...`);
  const { error: testErr } = await supabase.from('config').select('clave', { head: true, count: 'exact' });
  if (testErr) {
    console.error(`\n❌ ERROR: No se pudo conectar a la tabla 'config' en Supabase.`);
    console.error(`Detalle: ${testErr.message} (Código: ${testErr.code})`);
    console.error(`\n👉 Asegúrese de haber ejecutado el archivo 'supabase/schema.sql' en el SQL Editor de Supabase.\n`);
    process.exit(1);
  }
  console.log(`✅ Conexión con Supabase verificada.`);

  // Paso 1: Migrar Configuración
  console.log(`\n📋 [2/4] Migrando Configuración desde Google Sheets...`);
  try {
    const configRows = await fetchSheetRows(getEnv('GOOGLE_SHEETS_CONFIG_RANGE', 'Configuracion!A1:C30'));
    const configPayload = [];

    configRows.forEach(r => {
      const clave = String(r.clave || r.key || r.parametro || '').trim().toUpperCase();
      const valor = String(r.valor || r.value || '').trim();
      const descripcion = String(r.descripcion || '').trim();
      if (clave) {
        configPayload.push({
          clave,
          valor,
          descripcion,
          updated_at: new Date().toISOString()
        });
      }
    });

    if (configPayload.length > 0) {
      const { error: confErr } = await supabase.from('config').upsert(configPayload, { onConflict: 'clave' });
      if (confErr) throw confErr;
      console.log(`✅ Configuración sincronizada exitosamente: ${configPayload.length} parámetros.`);
    } else {
      console.log(`ℹ️ No se encontraron filas en la pestaña Configuracion. Se conservan los valores por defecto.`);
    }
  } catch (err) {
    console.warn(`⚠️ Advertencia migrando Configuración: ${err.message}`);
  }

  // Paso 2: Migrar Participantes
  console.log(`\n👥 [3/4] Migrando Participantes desde Google Sheets...`);
  let totalParticipants = 0;
  try {
    const userRows = await fetchSheetRows(getEnv('GOOGLE_SHEETS_USERS_RANGE', 'Participantes!A1:Z500'));
    console.log(`   Se leyeron ${userRows.length} filas en la hoja de Participantes.`);

    const participantsPayload = [];
    userRows.forEach(u => {
      const legajo = String(u.legajo || u.leg || '').trim();
      if (!legajo) return;

      const apellido = String(u.apellido || '').trim();
      const nombre = String(u.nombre || '').trim();
      let token_hash = String(u.token_hash || u.hash || '').trim();
      if (!token_hash) {
        token_hash = calculateHash(legajo, apellido, nombre);
      }

      participantsPayload.push({
        legajo,
        token_hash,
        apellido,
        nombre,
        documento: String(u.documento || u.dni || '').trim(),
        sector: String(u.sector || u.area || '').trim(),
        telefono: String(u.telefono || '').trim(),
        email: String(u.email || u.correo || '').trim(),
        updated_at: new Date().toISOString()
      });
    });

    // Inserción en lotes de 100 para alta eficiencia
    const BATCH_SIZE = 100;
    for (let i = 0; i < participantsPayload.length; i += BATCH_SIZE) {
      const batch = participantsPayload.slice(i, i + BATCH_SIZE);
      const { error: partErr } = await supabase
        .from('participants')
        .upsert(batch, { onConflict: 'token_hash' });

      if (partErr) throw partErr;
      totalParticipants += batch.length;
      console.log(`   - Insertados/actualizados ${totalParticipants} de ${participantsPayload.length} participantes...`);
    }

    console.log(`✅ Participantes migrados exitosamente: ${totalParticipants} colaboradores.`);
  } catch (err) {
    console.error(`❌ Error migrando Participantes: ${err.message}`);
  }

  // Paso 3: Migrar Preguntas
  console.log(`\n❓ [4/4] Migrando Preguntas desde Google Sheets...`);
  let totalQuestions = 0;
  try {
    const questionRows = await fetchSheetRows(getEnv('GOOGLE_SHEETS_QUESTIONS_RANGE', 'Preguntas!A1:Z100'));
    const questionsPayload = [];

    questionRows.forEach((r, idx) => {
      const explicitId = r.id || r.numero || r.id_pregunta;
      const qId = (explicitId !== undefined && explicitId !== '') ? parseInt(explicitId, 10) : (idx + 1);
      const fase = parseInt(r.fase || r.phase || '1', 10);
      const pregunta = r.pregunta || r.question || '';
      const puntos = parseInt(r.puntos || r.points || '100', 10);

      const opciones = [];
      for (let i = 1; i <= 5; i++) {
        const letter = String.fromCharCode(96 + i);
        const optText = r[`opcion${i}`] || r[`opcion_${i}`] || r[`opcion${letter}`] || r[`opcion_${letter}`] || r[letter] || r[`opcion ${i}`] || '';
        if (optText && String(optText).trim() !== '') {
          opciones.push({ id: i, text: String(optText).trim() });
        }
      }

      const rawCorrect = String(
        r.respuesta_correcta || r.respuestacorrecta || r.opcion_correcta || r.opcioncorrecta || r.correcta || '1'
      ).trim().toUpperCase();
      const correctMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
      const respuesta_correcta = correctMap[rawCorrect] || parseInt(rawCorrect, 10) || 1;

      if (pregunta && opciones.length >= 2) {
        questionsPayload.push({
          id: qId,
          fase,
          pregunta,
          opciones,
          respuesta_correcta,
          puntos
        });
      }
    });

    if (questionsPayload.length > 0) {
      const { error: qErr } = await supabase
        .from('questions')
        .upsert(questionsPayload, { onConflict: 'fase,id' });

      if (qErr) throw qErr;
      totalQuestions = questionsPayload.length;
      console.log(`✅ Preguntas migradas exitosamente: ${totalQuestions} preguntas.`);
    } else {
      console.log(`ℹ️ No se detectaron preguntas en Google Sheets.`);
    }
  } catch (err) {
    console.warn(`⚠️ Advertencia migrando Preguntas: ${err.message}`);
  }

  console.log(`\n========================================================================`);
  console.log(`🎉 ¡MIGRACIÓN A SUPABASE COMPLETADA CON ÉXITO!`);
  console.log(`   - Participantes procesados: ${totalParticipants}`);
  console.log(`   - Preguntas migradas:       ${totalQuestions}`);
  console.log(`\n👉 Para activar Supabase como motor principal, establecé:`);
  console.log(`   DB_ENGINE="supabase"`);
  console.log(`   en tus variables de entorno (.env o Netlify Environment Variables).`);
  console.log(`========================================================================\n`);
}

runMigration().catch(err => {
  console.error('\n💥 Error fatal en migración:', err);
  process.exit(1);
});

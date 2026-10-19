#!/usr/bin/env node
// ==============================================================================
// BOT DE ENVÍO MASIVO DE EMAILS (MAILING TRIVIA INOCUIDAD 2026 - DON YEYO S.A.)
// ==============================================================================
// - Lee participantes desde Google Sheets (pestaña 'Participantes')
// - Valida la columna de campaña configurada en NEWSLETER_ACTUAL
// - Si la columna no existe: emite error fatal y frena el proceso
// - Envía correos con la plantilla mailing.html y comodines {{campo}} / %VAR%
// - Modo prueba (--test correo@ejemplo.com) para verificar sin modificar la hoja
// - Registra marca temporal (fecha y hora) en Google Sheets tras envío exitoso
// ==============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ------------------------------------------------------------------------------
// 1. CARGA DE VARIABLES DE ENTORNO
// ------------------------------------------------------------------------------
// Cargar primero .env base como fallback y luego .env_mailn (máxima prioridad)
const envBasePath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envBasePath)) {
  dotenv.config({ path: envBasePath });
}

const envMailnPath = path.join(ROOT_DIR, '.env_mailn');
if (fs.existsSync(envMailnPath)) {
  const mailnConfig = dotenv.parse(fs.readFileSync(envMailnPath));
  for (const k in mailnConfig) {
    process.env[k] = mailnConfig[k];
  }
} else {
  console.warn('⚠️ Advertencia: No se encontró el archivo .env_mailn en la raíz. Usando variables de .env o entorno actual.');
}

function getEnv(key, fallback = '') {
  return process.env[key] !== undefined && process.env[key] !== ''
    ? process.env[key]
    : fallback;
}

// ------------------------------------------------------------------------------
// 2. PARSEO DE ARGUMENTOS DE LÍNEA DE COMANDOS
// ------------------------------------------------------------------------------
const args = process.argv.slice(2);

const isHelp = args.includes('--help') || args.includes('-h');
const isDryRun = args.includes('--dry-run');
const isMassSend = args.includes('--send') || args.includes('--masivo') || args.includes('-s');

// Detectar argumento --test [email]
let isTestMode = false;
let testEmailArg = '';

const testIndex = args.findIndex(a => a === '--test' || a === '-t');
if (testIndex !== -1) {
  isTestMode = true;
  const nextArg = args[testIndex + 1];
  if (nextArg && !nextArg.startsWith('-')) {
    testEmailArg = nextArg;
  }
}

// Parámetro para sobreescribir la columna de newsletter desde terminal si se desea
let customColumna = '';
const colIndex = args.findIndex(a => a === '--columna' || a === '--campaign');
if (colIndex !== -1 && args[colIndex + 1]) {
  customColumna = args[colIndex + 1];
}

// Límite de envíos
let limitArg = 0;
const limitIndex = args.findIndex(a => a === '--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  limitArg = parseInt(args[limitIndex + 1], 10) || 0;
}

function exitClean(code = 0) {
  process.exitCode = code;
  // Permitir que libuv limpie sockets en Windows antes de terminar
  setTimeout(() => {
    process.exit(code);
  }, 30);
}

if (isHelp) {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║     BOT DE ENVÍO DE MAILING - TRIVIA INOCUIDAD 2026 (DON YEYO S.A.)        ║
╚════════════════════════════════════════════════════════════════════════════╝

USO:
  node scripts/enviarMailing.js [opciones]
  npm run mailing:test [-- destinatario@empresa.com]
  npm run mailing:send

OPCIONES:
  --test, -t [email]       Envía un único correo de prueba a la casilla indicada
                           (o a TEST_EMAIL de .env_mailn) sin tocar la planilla.
  --send, --masivo, -s     Ejecuta el envío masivo real a todas las casillas
                           que no tengan marca temporal en la columna configurada.
  --columna "Nombre"       Sobreescribe la variable NEWSLETER_ACTUAL para esta ejecución.
  --limit <número>         Limita el número máximo de correos a enviar en esta tanda.
  --dry-run                Simula el proceso completo sin realizar envíos SMTP ni escribir celdas.
  --help, -h               Muestra este menú de ayuda.

CONFIGURACIÓN:
  Se lee del archivo .env_mailn en la raíz del proyecto.
  - NEWSLETER_ACTUAL: Nombre exacto de la columna en la pestaña 'Participantes'.
  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM: Configuración SMTP.
  - TEST_EMAIL: Correo por defecto para pruebas.
`);
  exitClean(0);
}

// ------------------------------------------------------------------------------
// 3. GENERACIÓN DE HASH / ENLACE DE TRIVIA
// ------------------------------------------------------------------------------
function calculateUserHash(legajo, apellido, nombre) {
  const seed = getEnv('SEED_PHRASE', 'DY_INOCUIDAD_2026_CALIDAD_Y_COMPROMISO');
  const cleanLegajo = String(legajo || '').trim();
  const cleanApellido = String(apellido || '').trim().toUpperCase();
  const cleanNombre = String(nombre || '').trim().toUpperCase();
  return crypto.createHash('sha256').update(`${seed}_${cleanLegajo}_${cleanApellido}_${cleanNombre}`).digest('hex');
}

function getTriviaAccessUrl(user) {
  const baseUrl = (getEnv('APP_BASE_URL', 'https://dy-inocuidad.netlify.app')).replace(/\/+$/, '');
  let token = (user.token_hash || '').trim();
  if (!token && user.legajo) {
    token = calculateUserHash(user.legajo, user.apellido, user.nombre);
  }
  return token ? `${baseUrl}/?token=${token}` : baseUrl;
}

// ------------------------------------------------------------------------------
// 4. LECTURA Y CONEXIÓN CON GOOGLE SHEETS
// ------------------------------------------------------------------------------
async function fetchSheetParticipantesRaw() {
  const spreadsheetId = getEnv('GOOGLE_SHEETS_SPREADSHEET_ID');
  const apiKey = getEnv('GOOGLE_SHEETS_API_KEY');
  const range = getEnv('GOOGLE_SHEETS_USERS_RANGE', 'Participantes!A1:ZZ500');
  const appsScriptEndpoint = getEnv('GOOGLE_APPS_SCRIPT_ENDPOINT');

  // Intento 1: Google Sheets API v4
  if (spreadsheetId && apiKey) {
    try {
      const encodedRange = encodeURIComponent(range);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;
      const appUrl = getEnv('APP_BASE_URL', 'https://dy-inocuidad.netlify.app');
      
      const res = await fetch(url, {
        headers: {
          'Referer': appUrl.endsWith('/') ? appUrl : `${appUrl}/`,
          'Origin': appUrl
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.values && data.values.length > 0) {
          return {
            headers: data.values[0].map(h => String(h || '').trim()),
            rows: data.values.slice(1).map((r, i) => ({
              rowIndex: i + 2, // Fila 1-based en Google Sheets
              values: r
            }))
          };
        }
      } else {
        console.warn(`[Google Sheets API] Respuesta HTTP ${res.status}. Probando fallback Webhook...`);
      }
    } catch (err) {
      console.warn(`[Google Sheets API] Error de conexión: ${err.message}. Probando fallback Webhook...`);
    }
  }

  // Intento 2: Fallback vía Webhook de Apps Script
  if (appsScriptEndpoint) {
    try {
      const res = await fetch(appsScriptEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_PARTICIPANTES_RAW' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'success' && Array.isArray(data.headers)) {
          return {
            headers: data.headers.map(h => String(h || '').trim()),
            rows: data.rows || []
          };
        }
      }
    } catch (err) {
      console.warn(`[Apps Script] Error en fallback: ${err.message}`);
    }
  }

  throw new Error('No se pudo conectar a Google Sheets. Verifique GOOGLE_SHEETS_SPREADSHEET_ID y GOOGLE_SHEETS_API_KEY o GOOGLE_APPS_SCRIPT_ENDPOINT en .env_mailn');
}

// ------------------------------------------------------------------------------
// 5. REGISTRAR MARCA TEMPORAL EN GOOGLE SHEETS
// ------------------------------------------------------------------------------
async function markNewsletterTimestamp(columna, participant, rowIndex, timestamp) {
  const appsScriptEndpoint = getEnv('GOOGLE_APPS_SCRIPT_ENDPOINT');
  if (!appsScriptEndpoint) {
    console.warn(`⚠️ Advertencia: No hay GOOGLE_APPS_SCRIPT_ENDPOINT configurado. No se pudo registrar la marca temporal en Google Sheets.`);
    return false;
  }

  const payload = {
    action: 'MARCAR_NEWSLETTER',
    columna,
    legajo: participant.legajo || '',
    email: participant.email || '',
    rowIndex,
    timestamp
  };

  try {
    const res = await fetch(appsScriptEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (!res.ok) {
      console.error(`❌ Error HTTP de Apps Script al marcar celda: ${res.status}`);
      return false;
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      console.error(`❌ Apps Script no devolvió una respuesta JSON válida.`);
      return false;
    }

    if (data.status === 'error') {
      console.error(`❌ Error reportado por Apps Script: ${data.message}`);
      return false;
    }

    // El Apps Script con MARCAR_NEWSLETTER responde: { status: 'success', message: 'Marca temporal registrada exitosamente', ... }
    // Si responde message: 'OK', significa que está ejecutando una versión vieja de Código.gs que ignora MARCAR_NEWSLETTER.
    if (data.status === 'success' && data.message === 'Marca temporal registrada exitosamente') {
      return true;
    }

    console.warn(`⚠️ Advertencia: Apps Script devolvió "${data.message || JSON.stringify(data)}" en lugar de confirmar el registro de la celda.`);
    console.warn(`   👉 La versión desplegada del Webhook en Google Apps Script no tiene activa la acción MARCAR_NEWSLETTER.`);
    return false;
  } catch (err) {
    console.error(`❌ Excepción al marcar celda en Apps Script: ${err.message}`);
    return false;
  }
}

// ------------------------------------------------------------------------------
// 6. MOTOR DE REEMPLAZO DE PLANTILLA (COMODINES {{...}} y %...%)
// ------------------------------------------------------------------------------
function loadTemplate() {
  const rootMailing = path.resolve(ROOT_DIR, 'mailing.html');
  const subMailing = path.resolve(ROOT_DIR, 'mailing/mailing.html');
  const templatePathEnv = getEnv('MAILING_TEMPLATE_PATH');

  let chosenPath = '';

  // 1. Si se configuró explícitamente en env y es diferente de default
  if (templatePathEnv && templatePathEnv !== './mailing/mailing.html' && templatePathEnv !== './mailing.html') {
    const custom = path.resolve(ROOT_DIR, templatePathEnv);
    if (fs.existsSync(custom)) {
      chosenPath = custom;
    }
  }

  // 2. Detección inteligente por fecha de modificación más reciente (mtime)
  if (!chosenPath) {
    const hasRoot = fs.existsSync(rootMailing);
    const hasSub = fs.existsSync(subMailing);

    if (hasRoot && hasSub) {
      const mtimeRoot = fs.statSync(rootMailing).mtimeMs;
      const mtimeSub = fs.statSync(subMailing).mtimeMs;
      chosenPath = mtimeRoot >= mtimeSub ? rootMailing : subMailing;
    } else if (hasRoot) {
      chosenPath = rootMailing;
    } else if (hasSub) {
      chosenPath = subMailing;
    }
  }

  if (!chosenPath || !fs.existsSync(chosenPath)) {
    throw new Error(`No se encontró la plantilla HTML de mailing en ninguna de las rutas esperadas: ${rootMailing}, ${subMailing}`);
  }

  const relPath = path.relative(ROOT_DIR, chosenPath);
  return {
    content: fs.readFileSync(chosenPath, 'utf8'),
    filePath: relPath
  };
}

function renderHtml(templateHtml, participant) {
  let output = templateHtml;

  // 1. Reemplazar comodines de entorno: %NOMBRE_VAR%
  // Tomamos todas las variables de entorno disponibles
  for (const key of Object.keys(process.env)) {
    const pattern = new RegExp(`%${key}%`, 'g');
    output = output.replace(pattern, process.env[key]);
  }

  // 2. Reemplazar comodines de fila del participante: {{campo}}
  for (const key of Object.keys(participant)) {
    const val = participant[key] !== undefined && participant[key] !== null ? String(participant[key]) : '';
    const pattern = new RegExp(`{{${key}}}`, 'gi');
    output = output.replace(pattern, val);
  }

  // Comodines calculados amigables
  const linkTrivia = getTriviaAccessUrl(participant);
  output = output.replace(/{{link_trivia}}/gi, linkTrivia);
  output = output.replace(/{{trivia_url}}/gi, linkTrivia);
  output = output.replace(/{{enlace_acceso}}/gi, linkTrivia);

  const nombreCompleto = `${participant.nombre || ''} ${participant.apellido || ''}`.trim();
  output = output.replace(/{{nombre_completo}}/gi, nombreCompleto);

  // Reemplazar año actual por defecto
  output = output.replace(/%ANIO_ACTUAL%/g, new Date().getFullYear().toString());

  return output;
}

// ------------------------------------------------------------------------------
// 7. PREPARAR TRANSPORTE Y ADJUNTOS CID INLINE (IMÁGENES DE MAILING)
// ------------------------------------------------------------------------------
function getMailerTransport() {
  const host = getEnv('SMTP_HOST');
  const port = parseInt(getEnv('SMTP_PORT', '587'), 10);
  const secure = getEnv('SMTP_SECURE', 'false') === 'true' || port === 465;
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');

  if (!host || !user || !pass) {
    if (isDryRun) {
      console.log('ℹ️ Modo DRY-RUN activo sin credenciales SMTP completas. Omitiendo validación de transporte.');
      return null;
    }
    throw new Error('Faltan credenciales SMTP en .env_mailn (SMTP_HOST, SMTP_USER, SMTP_PASS).');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

function getMailingAttachments(htmlContent) {
  const assetsDir = path.resolve(ROOT_DIR, getEnv('MAILING_ASSETS_DIR', './mailing'));
  const attachments = [];

  // 1. Fondo de rayos (CID: fondo_rayos)
  if (htmlContent.includes('cid:fondo_rayos')) {
    const fondoPath = path.join(assetsDir, 'fondo-rayos.png');
    if (fs.existsSync(fondoPath)) {
      attachments.push({
        filename: 'fondo-rayos.png',
        path: fondoPath,
        cid: 'fondo_rayos'
      });
    } else {
      console.warn(`⚠️ Advertencia: No se encontró el archivo ${fondoPath} para el adjunto inline 'fondo_rayos'.`);
    }
  }

  // 2. Logo Don Yeyo (CID: logo_donyeyo)
  if (htmlContent.includes('cid:logo_donyeyo')) {
    const logoPng = path.join(assetsDir, 'logo.png');
    const logoSvg = path.join(assetsDir, 'logo.svg');
    const chosenLogo = fs.existsSync(logoPng) ? logoPng : (fs.existsSync(logoSvg) ? logoSvg : null);

    if (chosenLogo) {
      attachments.push({
        filename: path.basename(chosenLogo),
        path: chosenLogo,
        cid: 'logo_donyeyo'
      });
    } else {
      console.warn(`⚠️ Advertencia: No se encontró logo.png ni logo.svg en ${assetsDir} para el adjunto 'logo_donyeyo'.`);
    }
  }

  return attachments;
}

// ------------------------------------------------------------------------------
// 8. FUNCIÓN PRINCIPAL DE EJECUCIÓN
// ------------------------------------------------------------------------------
async function main() {
  console.log(`\n========================================================================`);
  console.log(`📧 BOT DE ENVÍO DE MAILING - TRIVIA INOCUIDAD 2026 (DON YEYO S.A.)`);
  console.log(`========================================================================\n`);

  // Identificar nombre de campaña / columna
  const campaignName = (customColumna || getEnv('NEWSLETER_ACTUAL', getEnv('NEWSLETTER_ACTUAL'))).trim();

  if (!campaignName) {
    console.error(`❌ ERROR FATAL: No se ha configurado la variable de entorno NEWSLETER_ACTUAL en .env_mailn.`);
    console.error(`Debe definir el nombre exacto de la columna en Google Sheets (ej: NEWSLETER_ACTUAL="Email Link de Trivia").\n`);
    exitClean(1);
    return;
  }

  console.log(`📋 Campaña / Columna activa: "${campaignName}"`);

  // Cargar plantilla HTML
  const { content: templateHtml, filePath: templateFilePath } = loadTemplate();
  console.log(`📄 Plantilla cargada desde: "${templateFilePath}"`);

  // 1. Conectar a Google Sheets y obtener datos de Participantes
  console.log(`📡 Consultando pestaña 'Participantes' en Google Sheets...`);
  const sheetData = await fetchSheetParticipantesRaw();
  const headers = sheetData.headers;
  const rows = sheetData.rows;

  console.log(`✅ Conexión exitosa. Se detectaron ${headers.length} columnas y ${rows.length} filas.`);

  // 2. VALIDACIÓN ESTRICTA: ¿Existe la columna NEWSLETER_ACTUAL en los encabezados?
  const targetColIndex = headers.findIndex(h => h.trim().toLowerCase() === campaignName.toLowerCase());

  if (targetColIndex === -1) {
    console.error(`\n❌❌❌ ERROR FATAL EN EL PROCESO ❌❌❌`);
    console.error(`La columna "${campaignName}" (configurada en NEWSLETER_ACTUAL) NO EXISTE en la pestaña 'Participantes' de Google Sheets.`);
    console.error(`\nColumnas existentes en la hoja:`);
    headers.forEach((h, idx) => console.error(`  [${idx + 1}] "${h}"`));
    console.error(`\nMotivo de seguridad: El bot no avanzará para evitar enviar correos sin poder registrar la marca temporal.`);
    console.error(`Solución: Creá la columna "${campaignName}" en la hoja de Participantes o ajustá NEWSLETER_ACTUAL en .env_mailn.\n`);
    exitClean(1);
    return;
  }

  const realColName = headers[targetColIndex];
  console.log(`🎯 Columna confirmada en Google Sheets: "${realColName}" (Columna N° ${targetColIndex + 1})`);

  // Identificar índices de columnas clave
  const emailColIndex = headers.findIndex(h => {
    const l = h.toLowerCase().trim();
    return l === 'email' || l === 'correo' || l === 'mail';
  });

  if (emailColIndex === -1) {
    console.error(`❌ ERROR FATAL: No se encontró la columna de correo electrónico ('email' o 'correo') en la pestaña 'Participantes'.`);
    exitClean(1);
    return;
  }

  // Mapear filas a objetos
  const participants = rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.toLowerCase()] = r.values[i] !== undefined ? String(r.values[i]).trim() : '';
    });
    return {
      rowIndex: r.rowIndex,
      rawRow: r.values,
      timestampVal: r.values[targetColIndex] !== undefined ? String(r.values[targetColIndex]).trim() : '',
      email: r.values[emailColIndex] !== undefined ? String(r.values[emailColIndex]).trim() : '',
      data: obj
    };
  });

  // ----------------------------------------------------------------------------
  // CASO A: MODO DE PRUEBA (--test)
  // ----------------------------------------------------------------------------
  if (isTestMode || (!isMassSend && !isDryRun)) {
    const targetTestEmail = (testEmailArg || getEnv('TEST_EMAIL')).trim();

    if (!targetTestEmail || !targetTestEmail.includes('@')) {
      console.error(`\n❌ Error en Modo de Prueba: No se especificó una casilla de correo válida.`);
      console.error(`Uso: node scripts/enviarMailing.js --test tu_correo@empresa.com`);
      console.error(`O configure TEST_EMAIL="tu_correo@empresa.com" en .env_mailn.\n`);
      exitClean(1);
    return;
    }

    console.log(`\n🧪 ====================================================================`);
    console.log(`🧪 EJECUTANDO MODO DE PRUEBA (TEST PREVIO)`);
    console.log(`🧪 Destinatario de prueba: ${targetTestEmail}`);
    console.log(`🧪 ====================================================================\n`);

    // Tomar el primer participante con datos completos para simular
    const sampleUser = participants.find(p => p.email && p.data.nombre) || participants[0] || {
      rowIndex: 2,
      email: targetTestEmail,
      data: { legajo: '9999', nombre: 'Juan (Prueba)', apellido: 'Pérez', sector: 'Calidad' }
    };

    console.log(`👤 Simulando datos del participante:`);
    console.log(`   - Legajo: ${sampleUser.data.legajo || 'N/A'}`);
    console.log(`   - Nombre: ${sampleUser.data.nombre || ''} ${sampleUser.data.apellido || ''}`);
    console.log(`   - Sector: ${sampleUser.data.sector || 'N/A'}`);
    console.log(`   - Enlace personal de Trivia generado: ${getTriviaAccessUrl(sampleUser.data)}`);

    const renderedHtml = renderHtml(templateHtml, sampleUser.data);
    const attachments = getMailingAttachments(renderedHtml);
    const subject = `[PRUEBA] ${getEnv('TITULO_EMAIL', 'Semana de la Inocuidad 2026 - Don Yeyo')}`;

    if (isDryRun) {
      console.log(`\n[DRY-RUN] Prueba simulada con éxito. Asunto: "${subject}". No se envió correo ni se modificó Google Sheets.`);
      exitClean(0);
      return;
    }

    const transporter = getMailerTransport();
    console.log(`📡 Verificando conexión SMTP...`);
    await transporter.verify();
    console.log(`✅ Conexión SMTP verificada con éxito.`);

    console.log(`📤 Enviando correo de prueba a ${targetTestEmail}...`);
    const info = await transporter.sendMail({
      from: getEnv('SMTP_FROM', getEnv('SMTP_USER')),
      to: targetTestEmail,
      subject,
      html: renderedHtml,
      attachments
    });

    console.log(`\n🎉 ¡Correo de prueba enviado exitosamente!`);
    console.log(`   - ID de Mensaje: ${info.messageId}`);
    console.log(`   - Destino: ${targetTestEmail}`);
    console.log(`   - Adjuntos CID inline: ${attachments.length} (${attachments.map(a => a.cid).join(', ')})`);
    console.log(`\nℹ️ NOTA: La planilla de Google Sheets NO fue modificada en modo prueba.`);
    console.log(`Para ejecutar el envío masivo real a todos los participantes pendientes, ejecutá:`);
    console.log(`   npm run mailing:send\n`);
    exitClean(0);
    return;
  }

  // ----------------------------------------------------------------------------
  // CASO B: MODO DE ENVÍO MASIVO (--send)
  // ----------------------------------------------------------------------------
  console.log(`\n🔍 Analizando registros de participantes para la campaña "${realColName}"...`);

  const alreadySent = [];
  const pending = [];
  const invalidEmail = [];

  for (const p of participants) {
    if (!p.email || !p.email.includes('@')) {
      invalidEmail.push(p);
      continue;
    }

    if (p.timestampVal !== '') {
      alreadySent.push(p);
    } else {
      pending.push(p);
    }
  }

  console.log(`\n📊 BALANCE DE LA CAMPAÑA:`);
  console.log(`   - Total registros en hoja:      ${participants.length}`);
  console.log(`   - Correos ya enviados previamente: ${alreadySent.length} (Omitidos)`);
  console.log(`   - Correos con dirección inválida:  ${invalidEmail.length} (Omitidos)`);
  console.log(`   - Destinatarios PENDIENTES:        ${pending.length}`);

  if (pending.length === 0) {
    console.log(`\n✨ ¡No hay envíos pendientes! Todos los participantes válidos ya cuentan con marca temporal en la columna "${realColName}".\n`);
    exitClean(0);
    return;
  }

  const toSendList = limitArg > 0 ? pending.slice(0, limitArg) : pending;
  if (limitArg > 0 && limitArg < pending.length) {
    console.log(`⚠️ Se aplicó límite de tanda (--limit ${limitArg}). Se enviarán ${toSendList.length} de los ${pending.length} pendientes.`);
  }

  console.log(`\n🚀 Iniciando envío masivo a ${toSendList.length} participantes...\n`);

  let transporter = null;
  if (!isDryRun) {
    transporter = getMailerTransport();
    console.log(`📡 Verificando conexión SMTP...`);
    await transporter.verify();
    console.log(`✅ Conexión SMTP verificada.\n`);
  }

  const delayMs = parseInt(getEnv('SMTP_DELAY_MS', '1200'), 10);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < toSendList.length; i++) {
    const item = toSendList[i];
    const email = item.email;
    const legajo = item.data.legajo || 'S/L';
    const nombre = `${item.data.nombre || ''} ${item.data.apellido || ''}`.trim();
    const progressTag = `[${i + 1}/${toSendList.length}]`;

    try {
      const renderedHtml = renderHtml(templateHtml, item.data);
      const attachments = getMailingAttachments(renderedHtml);
      const subject = getEnv('TITULO_EMAIL', 'Semana de la Inocuidad 2026 - Don Yeyo');

      if (isDryRun) {
        console.log(`🧪 ${progressTag} [DRY-RUN] Simulado envío a: ${email} (${nombre} - Legajo ${legajo})`);
        successCount++;
        continue;
      }

      // 1. Enviar Email vía SMTP
      await transporter.sendMail({
        from: getEnv('SMTP_FROM', getEnv('SMTP_USER')),
        to: email,
        subject,
        html: renderedHtml,
        attachments
      });

      // 2. Generar marca temporal local (Buenos Aires / Argentina)
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timestampStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      // 3. Registrar en Google Sheets celda correspondiente
      const markOk = await markNewsletterTimestamp(realColName, item.data, item.rowIndex, timestampStr);

      if (markOk) {
        console.log(`✅ ${progressTag} Enviado a: ${email} (${nombre} - Legajo ${legajo}) | Marca temporal registrada: "${timestampStr}"`);
      } else {
        console.log(`⚠️ ${progressTag} Enviado a: ${email} (${nombre}) pero hubo advertencia al registrar la marca en Google Sheets.`);
      }

      successCount++;

      // Pausa entre envíos para no saturar SMTP
      if (i < toSendList.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

    } catch (err) {
      errorCount++;
      console.error(`❌ ${progressTag} Falló envío a: ${email} (${nombre} - Legajo ${legajo}) -> Error: ${err.message}`);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`🏁 RESUMEN FINAL DEL PROCESO DE MAILING:`);
  console.log(`   - Campaña procesada:    "${realColName}"`);
  console.log(`   - Total procesados:     ${toSendList.length}`);
  console.log(`   - Envíos exitosos:      ${successCount}`);
  console.log(`   - Envíos fallidos:      ${errorCount}`);
  console.log(`========================================================================\n`);

  if (errorCount > 0) {
    exitClean(2);
  } else {
    exitClean(0);
  }
}

// Ejecutar
main().catch(err => {
  console.error(`\n💥 Error no controlado en el proceso:`, err);
  exitClean(1);
});

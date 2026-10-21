#!/usr/bin/env node
// ==============================================================================
// BOT DE ENVÍO MASIVO DE EMAILS (MAILING TRIVIA INOCUIDAD 2026 - DON YEYO S.A.)
// ==============================================================================
// - Lee participantes directamente desde la base de datos Supabase
// - Gestiona el estado de email_enviado en Supabase (config.EMAILS_ENVIADOS)
// - Cero dependencias de Google Sheets
// - Envía correos con la plantilla mailing/mailing.html y comodines {{campo}} / %VAR%
// - Modo prueba (--test correo@ejemplo.com) para verificar sin modificar la base
// - Modo por legajo (--legajo 1721) para enviar o reenviar a un colaborador específico
// - Modo masivo (--send) con opción de reenvío forzado (--resend)
// ==============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ------------------------------------------------------------------------------
// 1. CARGA DE VARIABLES DE ENTORNO (.env)
// ------------------------------------------------------------------------------
const envBasePath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envBasePath)) {
  dotenv.config({ path: envBasePath });
}

function getEnv(key, fallback = '') {
  return process.env[key] !== undefined && process.env[key] !== ''
    ? process.env[key]
    : fallback;
}

// ------------------------------------------------------------------------------
// 2. CONEXIÓN DIRECTA A SUPABASE
// ------------------------------------------------------------------------------
const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontradas en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// ------------------------------------------------------------------------------
// 3. PARSEO DE ARGUMENTOS DE LÍNEA DE COMANDOS
// ------------------------------------------------------------------------------
const args = process.argv.slice(2);

const isHelp = args.includes('--help') || args.includes('-h');
const isDryRun = args.includes('--dry-run');
const isMassSend = args.includes('--send') || args.includes('--masivo') || args.includes('-s');
const isResendAll = args.includes('--resend') || args.includes('--reenviar') || args.includes('-r');

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

let targetLegajo = '';
const legajoIndex = args.findIndex(a => a === '--legajo' || a === '-l');
if (legajoIndex !== -1 && args[legajoIndex + 1]) {
  targetLegajo = String(args[legajoIndex + 1]).trim();
}

let limitArg = 0;
const limitIndex = args.findIndex(a => a === '--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  limitArg = parseInt(args[limitIndex + 1], 10) || 0;
}

if (isHelp) {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║     BOT DE ENVÍO DE MAILING - TRIVIA INOCUIDAD 2026 (DON YEYO S.A.)        ║
║     Motor: Supabase (PostgreSQL) - Sin dependencias de Google Sheets       ║
╚════════════════════════════════════════════════════════════════════════════╝

USO:
  node scripts/enviarMailing.js [opciones]
  npm run mailing:test [-- destinatario@empresa.com]
  npm run mailing:send

OPCIONES:
  --test, -t [email]       Envía un único correo de prueba a la casilla indicada
                           (o a TEST_EMAIL de .env) sin modificar la base.
  --send, --masivo, -s     Ejecuta el envío masivo a los colaboradores con email
                           que aún no tengan la marca en Supabase.
  --resend, -r             Fuerza el reenvío a los participantes aunque ya figuren enviados.
  --legajo <legajo>        Envía o reenvía la invitación a un colaborador específico.
  --limit <número>         Limita el número máximo de correos a enviar en la tanda.
  --dry-run                Simula el proceso completo sin realizar envíos SMTP.
  --help, -h               Muestra este menú de ayuda.
`);
  process.exit(0);
}

// ------------------------------------------------------------------------------
// 4. GENERACIÓN DE HASH / ENLACE DE TRIVIA
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
// 5. TRANSPORTE SMTP (NODEMAILER)
// ------------------------------------------------------------------------------
function getMailerTransport() {
  const host = getEnv('SMTP_HOST', 'smtp-mail.outlook.com');
  const port = parseInt(getEnv('SMTP_PORT', '587'), 10);
  const secure = getEnv('SMTP_SECURE', 'false') === 'true';
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');

  if (!user || !pass) {
    throw new Error('Variables SMTP_USER y SMTP_PASS no encontradas en .env');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
}

// ------------------------------------------------------------------------------
// 6. RENDERIZACIÓN DE PLANTILLA HTML Y ADJUNTOS
// ------------------------------------------------------------------------------
function getTemplateHtml() {
  const templatePath = path.resolve(ROOT_DIR, getEnv('MAILING_TEMPLATE_PATH', 'mailing/mailing.html'));
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }
  const altPath = path.resolve(ROOT_DIR, 'mailing', 'mailing.html');
  if (fs.existsSync(altPath)) {
    return fs.readFileSync(altPath, 'utf8');
  }
  throw new Error(`No se encontró la plantilla HTML en ${templatePath}`);
}

function renderHtml(template, user) {
  const linkTrivia = getTriviaAccessUrl(user);

  return template
    .replace(/%TITULO_EMAIL%/g, getEnv('TITULO_EMAIL', '¡ACÁ EMPIEZA EL DESAFÍO DE INOCUIDAD!'))
    .replace(/%SUBTITULO%/g, getEnv('SUBTITULO', 'Llegó el momento de demostrar todo lo que sabés.'))
    .replace(/%MENSAJE_PRINCIPAL%/g, getEnv('MENSAJE_PRINCIPAL', ''))
    .replace(/%MENSAJE_SECUNDARIO%/g, getEnv('MENSAJE_SECUNDARIO', ''))
    .replace(/%CALL_TO_ACTION_TEXTO%/g, getEnv('CALL_TO_ACTION_TEXTO', 'INGRESAR A LA TRIVIA AHORA'))
    .replace(/%CALL_TO_ACTION_URL%/g, linkTrivia)
    .replace(/%EMPRESA_NOMBRE%/g, getEnv('EMPRESA_NOMBRE', 'Don Yeyo S.A.'))
    .replace(/%CONTACTO_SOPORTE%/g, getEnv('CONTACTO_SOPORTE', ''))
    .replace(/%ANIO_ACTUAL%/g, getEnv('ANIO_ACTUAL', String(new Date().getFullYear())))
    .replace(/\{\{nombre\}\}/gi, user.nombre || 'Colaborador')
    .replace(/\{\{apellido\}\}/gi, user.apellido || '')
    .replace(/\{\{legajo\}\}/gi, String(user.legajo || ''))
    .replace(/\{\{sector\}\}/gi, user.sector || '')
    .replace(/\{\{email\}\}/gi, user.email || '')
    .replace(/\{\{link_trivia\}\}/gi, linkTrivia);
}

function getMailingAttachments(renderedHtml) {
  const attachments = [];
  const mailingDir = path.resolve(ROOT_DIR, 'mailing');

  const files = [
    { cid: 'logo_donyeyo', file: 'logo.png' },
    { cid: 'fondo_rayos', file: 'fondo-rayos.png' }
  ];

  files.forEach(({ cid, file }) => {
    if (renderedHtml.includes(`cid:${cid}`)) {
      const fullPath = path.join(mailingDir, file);
      if (fs.existsSync(fullPath)) {
        attachments.push({
          filename: file,
          path: fullPath,
          cid
        });
      }
    }
  });

  return attachments;
}

// ------------------------------------------------------------------------------
// 7. GESTIÓN DE PARTICIPANTES Y ESTADOS EN SUPABASE
// ------------------------------------------------------------------------------
async function fetchSupabaseParticipants() {
  let all = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('apellido', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Error consultando participantes en Supabase: ${error.message}`);
    }

    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  // Leer mapa de emails enviados
  let emailSentMap = {};
  const { data: cfgData } = await supabase
    .from('config')
    .select('valor')
    .eq('clave', 'EMAILS_ENVIADOS')
    .maybeSingle();

  if (cfgData && cfgData.valor) {
    try { emailSentMap = JSON.parse(cfgData.valor); } catch (e) { emailSentMap = {}; }
  }

  return all.map(p => {
    const leg = String(p.legajo || '').trim();
    return {
      ...p,
      email_enviado: Boolean(emailSentMap[leg])
    };
  });
}

async function markEmailSentInSupabase(legajo) {
  const cleanLeg = String(legajo || '').trim();
  const { data: cfgData } = await supabase
    .from('config')
    .select('valor')
    .eq('clave', 'EMAILS_ENVIADOS')
    .maybeSingle();

  let map = {};
  if (cfgData && cfgData.valor) {
    try { map = JSON.parse(cfgData.valor); } catch (e) { map = {}; }
  }

  map[cleanLeg] = true;

  await supabase.from('config').upsert({
    clave: 'EMAILS_ENVIADOS',
    valor: JSON.stringify(map),
    descripcion: 'Mapa JSON de legajos a los que se les envió el email de invitación',
    updated_at: new Date().toISOString()
  }, { onConflict: 'clave' });
}

// ------------------------------------------------------------------------------
// 8. EJECUCIÓN PRINCIPAL
// ------------------------------------------------------------------------------
async function main() {
  console.log(`\n====================================================================`);
  console.log(`🚀 BOT DE MAILING - TRIVIA INOCUIDAD 2026 (DON YEYO S.A.)`);
  console.log(`📡 Motor de Base de Datos: Supabase (PostgreSQL)`);
  console.log(`====================================================================\n`);

  const templateHtml = getTemplateHtml();

  // 1. CASO PRUEBA
  if (isTestMode || (!isMassSend && !targetLegajo && !isDryRun)) {
    const targetTestEmail = (testEmailArg || getEnv('TEST_EMAIL', 'gabrieltonelli@gmail.com')).trim();
    console.log(`🧪 MODO DE PRUEBA: Destinatario: ${targetTestEmail}`);

    const demoUser = {
      legajo: '9999',
      nombre: 'Colaborador (Prueba)',
      apellido: 'Don Yeyo',
      sector: 'Calidad e Inocuidad',
      email: targetTestEmail,
      token_hash: 'demo_token_hash_para_pruebas'
    };

    const rendered = renderHtml(templateHtml, demoUser);
    const attachments = getMailingAttachments(rendered);
    const subject = `[PRUEBA] ${getEnv('TITULO_EMAIL', 'Desafío de Inocuidad 2026 - Don Yeyo')}`;

    if (isDryRun) {
      console.log(`[DRY-RUN] Prueba simulada. Asunto: "${subject}".`);
      process.exit(0);
    }

    const transporter = getMailerTransport();
    await transporter.verify();
    console.log(`✅ Conexión SMTP verificada exitosamente.`);

    console.log(`📤 Enviando correo de prueba a ${targetTestEmail}...`);
    const info = await transporter.sendMail({
      from: `"Don Yeyo S.A." <${getEnv('SMTP_FROM', getEnv('SMTP_USER'))}>`,
      to: targetTestEmail,
      subject,
      html: rendered,
      attachments
    });

    console.log(`🎉 ¡Correo de prueba enviado con éxito! ID: ${info.messageId}\n`);
    process.exit(0);
  }

  // 2. OBTENER PARTICIPANTES DESDE SUPABASE
  console.log(`📥 Cargando participantes desde Supabase...`);
  const participants = await fetchSupabaseParticipants();
  console.log(`👥 Total de colaboradores en Supabase: ${participants.length}`);

  // Filtrar destinatarios
  let targets = [];

  if (targetLegajo) {
    targets = participants.filter(p => String(p.legajo).trim() === targetLegajo);
    if (targets.length === 0) {
      console.error(`❌ No se encontró ningún participante con legajo "${targetLegajo}" en Supabase.`);
      process.exit(1);
    }
  } else {
    targets = participants.filter(p => {
      if (!p.email || !p.email.includes('@')) return false;
      if (isResendAll) return true;
      return !p.email_enviado;
    });
  }

  if (limitArg > 0) {
    targets = targets.slice(0, limitArg);
  }

  console.log(`📋 Destinatarios seleccionados para envío: ${targets.length}`);
  if (targets.length === 0) {
    console.log(`✅ No hay correos pendientes por enviar. (Usá --resend si deseás forzar el reenvío).`);
    process.exit(0);
  }

  if (isDryRun) {
    console.log(`\n[DRY-RUN] Simulación completa. Se habrían enviado ${targets.length} correos.`);
    targets.forEach((t, i) => console.log(`  [${i + 1}] Legajo ${t.legajo}: ${t.email} (${t.nombre} ${t.apellido})`));
    process.exit(0);
  }

  const transporter = getMailerTransport();
  await transporter.verify();
  console.log(`✅ Conexión SMTP verificada con ${getEnv('SMTP_USER')}.`);

  const delayMs = parseInt(getEnv('SMTP_DELAY_MS', '1000'), 10);
  let sentCount = 0;
  let failedCount = 0;

  console.log(`\n📤 Iniciando envío (${targets.length} correos, pausa de ${delayMs}ms entre cada uno)...\n`);

  for (let i = 0; i < targets.length; i++) {
    const user = targets[i];
    const progressText = `[${i + 1}/${targets.length}]`;

    try {
      const rendered = renderHtml(templateHtml, user);
      const attachments = getMailingAttachments(rendered);
      const subject = getEnv('TITULO_EMAIL', '¡ACÁ EMPIEZA EL DESAFÍO DE INOCUIDAD!');

      await transporter.sendMail({
        from: `"Don Yeyo S.A." <${getEnv('SMTP_FROM', getEnv('SMTP_USER'))}>`,
        to: user.email,
        subject,
        html: rendered,
        attachments
      });

      await markEmailSentInSupabase(user.legajo);
      sentCount++;
      console.log(`✅ ${progressText} Enviado a ${user.nombre} ${user.apellido} (${user.email}) - Legajo: ${user.legajo}`);
    } catch (err) {
      failedCount++;
      console.error(`❌ ${progressText} Error enviando a ${user.email} (Legajo: ${user.legajo}): ${err.message}`);
    }

    if (i < targets.length - 1 && delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  console.log(`\n====================================================================`);
  console.log(`🏁 RESUMEN DEL PROCESO DE MAILING:`);
  console.log(`   - Total procesados: ${targets.length}`);
  console.log(`   - Envíos exitosos:  ${sentCount}`);
  console.log(`   - Envíos fallidos:  ${failedCount}`);
  console.log(`   - Base de Datos:    Supabase actualizada exitosamente`);
  console.log(`====================================================================\n`);
}

main().catch(err => {
  console.error('❌ Error fatal en bot de mailing:', err);
  process.exit(1);
});

// ==============================================================================
// NETLIFY FUNCTION: MAILING SERVICE (/api/mailing)
// Envío y reenvío de invitaciones a la trivia usando exclusivamente Supabase y SMTP
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getDatabase } from './_db/index.js';
import { verifyAdminToken, getServerEnv } from './utils/googleSheets.js';

/**
 * Carga la configuración SMTP y textos de mailing desde .env_mailn o variables de entorno
 */
function getMailingConfig() {
  let mailnEnv = {};
  try {
    const envMailnPath = path.resolve(process.cwd(), '.env_mailn');
    if (fs.existsSync(envMailnPath)) {
      mailnEnv = dotenv.parse(fs.readFileSync(envMailnPath));
    }
  } catch (e) {
    mailnEnv = {};
  }

  const getVal = (key, fallback = '') => {
    return mailnEnv[key] || process.env[key] || getServerEnv(key) || fallback;
  };

  return {
    smtpHost: getVal('SMTP_HOST', 'smtp-mail.outlook.com'),
    smtpPort: parseInt(getVal('SMTP_PORT', '587'), 10),
    smtpSecure: getVal('SMTP_SECURE', 'false') === 'true',
    smtpUser: getVal('SMTP_USER', ''),
    smtpPass: getVal('SMTP_PASS', ''),
    smtpFrom: getVal('SMTP_FROM', getVal('SMTP_USER', '')),
    appBaseUrl: getVal('APP_BASE_URL', 'https://dy-inocuidad.netlify.app').replace(/\/+$/, ''),
    testEmail: getVal('TEST_EMAIL', 'gabrieltonelli@gmail.com'),
    tituloEmail: getVal('TITULO_EMAIL', '¡ACÁ EMPIEZA EL DESAFÍO DE INOCUIDAD!'),
    subtitulo: getVal('SUBTITULO', 'Llegó el momento de demostrar todo lo que sabés.'),
    mensajePrincipal: getVal(
      'MENSAJE_PRINCIPAL',
      '<p>🏆 <strong>Completá la trivia, acumulá puntos y asegurá tu lugar en la siguiente fase.</strong></p>'
    ),
    mensajeSecundario: getVal(
      'MENSAJE_SECUNDARIO',
      '⚠️ <strong>Muy importante:</strong> cada pregunta permite un único intento por participante.'
    ),
    callToActionTexto: getVal('CALL_TO_ACTION_TEXTO', 'INGRESAR A LA TRIVIA AHORA'),
    callToActionUrl: getVal('CALL_TO_ACTION_URL', 'https://dy-inocuidad.netlify.app'),
    empresaNombre: getVal('EMPRESA_NOMBRE', 'Don Yeyo S.A. • Departamento de Calidad e Inocuidad'),
    contactoSoporte: getVal('CONTACTO_SOPORTE', 'Para consultas, comunicate con el área de Calidad o RR.HH.'),
    anioActual: getVal('ANIO_ACTUAL', String(new Date().getFullYear()))
  };
}

/**
 * Crea el transporter de Nodemailer
 */
function createTransporter(cfg) {
  if (!cfg.smtpUser || !cfg.smtpPass) {
    throw new Error('Credenciales SMTP no configuradas (SMTP_USER / SMTP_PASS faltantes en .env_mailn)');
  }

  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPass
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
}

/**
 * Carga y renderiza la plantilla HTML
 */
function renderEmailHtml(user, cfg) {
  let template = '';
  const possiblePaths = [
    path.resolve(process.cwd(), 'mailing', 'mailing.html'),
    path.resolve(process.cwd(), 'mailing.html')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      template = fs.readFileSync(p, 'utf8');
      break;
    }
  }

  if (!template) {
    // Plantilla de respaldo integrada
    template = `
      <div style="font-family: Arial, sans-serif; background: #07152b; color: #ffffff; padding: 30px; border-radius: 16px;">
        <h1 style="color: #ffb800;">%TITULO_EMAIL%</h1>
        <p>Hola <strong>{{nombre}} {{apellido}}</strong> (Legajo: {{legajo}}),</p>
        <div>%MENSAJE_PRINCIPAL%</div>
        <div style="margin: 30px 0; text-align: center;">
          <a href="{{link_trivia}}" style="background: #e40521; color: #ffffff; padding: 15px 30px; border-radius: 12px; font-weight: bold; text-decoration: none; display: inline-block;">
            %CALL_TO_ACTION_TEXTO%
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">%MENSAJE_SECUNDARIO%</p>
        <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
        <p style="font-size: 11px; color: #64748b;">%EMPRESA_NOMBRE% - %ANIO_ACTUAL%</p>
      </div>
    `;
  }

  const token = (user.token_hash || '').trim();
  const linkTrivia = token ? `${cfg.appBaseUrl}/?token=${encodeURIComponent(token)}` : cfg.appBaseUrl;

  let rendered = template
    .replace(/%TITULO_EMAIL%/g, cfg.tituloEmail)
    .replace(/%SUBTITULO%/g, cfg.subtitulo)
    .replace(/%MENSAJE_PRINCIPAL%/g, cfg.mensajePrincipal)
    .replace(/%MENSAJE_SECUNDARIO%/g, cfg.mensajeSecundario)
    .replace(/%CALL_TO_ACTION_TEXTO%/g, cfg.callToActionTexto)
    .replace(/%CALL_TO_ACTION_URL%/g, linkTrivia)
    .replace(/%EMPRESA_NOMBRE%/g, cfg.empresaNombre)
    .replace(/%CONTACTO_SOPORTE%/g, cfg.contactoSoporte)
    .replace(/%ANIO_ACTUAL%/g, cfg.anioActual)
    .replace(/\{\{nombre\}\}/gi, user.nombre || 'Colaborador')
    .replace(/\{\{apellido\}\}/gi, user.apellido || '')
    .replace(/\{\{legajo\}\}/gi, String(user.legajo || ''))
    .replace(/\{\{sector\}\}/gi, user.sector || '')
    .replace(/\{\{email\}\}/gi, user.email || '')
    .replace(/\{\{link_trivia\}\}/gi, linkTrivia);

  return rendered;
}

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 🛡️ Seguridad: Exclusivo para administradores autenticados
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const isAdmin = verifyAdminToken(authHeader);

  if (!isAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Acceso no autorizado. Se requiere token de administrador.' })
    };
  }

  const db = getDatabase();
  const cfg = getMailingConfig();

  // --------------------------------------------------------------------------
  // GET: Consultar Estado General del Mailing
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'GET') {
    try {
      const participants = await db.getParticipantsAdmin();
      const withEmail = participants.filter(p => p.email && p.email.includes('@'));
      const sentCount = withEmail.filter(p => p.email_enviado).length;
      const pendingCount = withEmail.length - sentCount;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          totalParticipants: participants.length,
          totalWithEmail: withEmail.length,
          sentCount,
          pendingCount,
          smtpUser: cfg.smtpUser ? `${cfg.smtpUser.split('@')[0]}@...` : 'No configurado',
          smtpHost: cfg.smtpHost,
          appBaseUrl: cfg.appBaseUrl
        })
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: e.message })
      };
    }
  }

  // --------------------------------------------------------------------------
  // POST: Acciones de Envío, Reenvío o Marcado Masivo
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const action = body.action || '';

      // 1. MARCAR TODOS COMO ENVIADOS O NO ENVIADOS (Supabase)
      if (action === 'MARK_ALL_EMAILS') {
        const markValue = body.value !== undefined ? Boolean(body.value) : true;
        const supabase = db.getClient();
        const { data: users, error: uErr } = await supabase.from('participants').select('legajo');

        if (uErr || !users) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error leyendo participantes de Supabase' }) };
        }

        const map = {};
        if (markValue) {
          users.forEach(u => {
            if (u.legajo) map[String(u.legajo).trim()] = true;
          });
        }

        await supabase.from('config').upsert({
          clave: 'EMAILS_ENVIADOS',
          valor: JSON.stringify(map),
          descripcion: 'Mapa JSON de legajos a los que se les envió el email de invitación',
          updated_at: new Date().toISOString()
        }, { onConflict: 'clave' });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            markedAs: markValue,
            count: users.length,
            message: markValue
              ? `Se marcaron todos los participantes (${users.length}) como Email Enviado en Supabase.`
              : `Se desmarcaron todos los participantes en Supabase.`
          })
        };
      }

      // 2. ENVIAR CORREO DE PRUEBA (TEST EMAIL)
      if (action === 'SEND_TEST') {
        const targetEmail = (body.testEmail || cfg.testEmail || '').trim();
        if (!targetEmail || !targetEmail.includes('@')) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dirección de correo de prueba inválida' }) };
        }

        const transporter = createTransporter(cfg);
        const demoUser = {
          legajo: '9999',
          nombre: 'Colaborador',
          apellido: 'Prueba',
          sector: 'Calidad e Inocuidad',
          email: targetEmail,
          token_hash: 'demo_token_hash_para_pruebas'
        };

        const html = renderEmailHtml(demoUser, cfg);

        await transporter.sendMail({
          from: `"Don Yeyo S.A." <${cfg.smtpFrom}>`,
          to: targetEmail,
          subject: `[PRUEBA] ${cfg.tituloEmail}`,
          html
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Correo de prueba enviado exitosamente a ${targetEmail}`
          })
        };
      }

      // 3. ENVIAR O REENVIAR A UN PARTICIPANTE INDIVIDUAL
      if (action === 'SEND_SINGLE') {
        const legajo = String(body.legajo || '').trim();
        if (!legajo) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Legajo requerido' }) };
        }

        const supabase = db.getClient();
        const { data: user, error: fErr } = await supabase
          .from('participants')
          .select('*')
          .eq('legajo', legajo)
          .maybeSingle();

        if (fErr || !user) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Participante no encontrado en Supabase' }) };
        }

        if (!user.email || !user.email.includes('@')) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `El participante ${user.nombre} ${user.apellido} no tiene un email válido registrado.` }) };
        }

        const transporter = createTransporter(cfg);
        const html = renderEmailHtml(user, cfg);

        await transporter.sendMail({
          from: `"Don Yeyo S.A." <${cfg.smtpFrom}>`,
          to: user.email,
          subject: cfg.tituloEmail,
          html
        });

        // Marcar en Supabase
        await db.toggleEmailSent(user.legajo, true);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Invitación enviada exitosamente a ${user.nombre} ${user.apellido} (${user.email})`,
            email: user.email
          })
        };
      }

      // 4. ENVIAR POR LOTES A PENDIENTES
      if (action === 'SEND_BATCH') {
        const limit = parseInt(body.limit, 10) || 50;
        const resendAll = Boolean(body.resendAll);

        const participants = await db.getParticipantsAdmin();
        const targets = participants.filter(p => {
          if (!p.email || !p.email.includes('@')) return false;
          if (resendAll) return true;
          return !p.email_enviado;
        }).slice(0, limit);

        if (targets.length === 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              sentCount: 0,
              message: 'No hay participantes pendientes con correo electrónico para enviar.'
            })
          };
        }

        const transporter = createTransporter(cfg);
        let sentCount = 0;
        let errors = [];

        for (const user of targets) {
          try {
            const html = renderEmailHtml(user, cfg);
            await transporter.sendMail({
              from: `"Don Yeyo S.A." <${cfg.smtpFrom}>`,
              to: user.email,
              subject: cfg.tituloEmail,
              html
            });
            await db.toggleEmailSent(user.legajo, true);
            sentCount++;
            // Breve pausa para no saturar SMTP
            await new Promise(r => setTimeout(r, 600));
          } catch (mErr) {
            console.error(`Error enviando email a legajo ${user.legajo}:`, mErr.message);
            errors.push({ legajo: user.legajo, email: user.email, error: mErr.message });
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            sentCount,
            totalAttempted: targets.length,
            errorsCount: errors.length,
            errors,
            message: `Se enviaron exitosamente ${sentCount} de ${targets.length} correos de invitación.`
          })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Acción '${action}' no reconocida` })
      };
    } catch (err) {
      console.error('Error en /api/mailing:', err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: err.message || 'Error interno en servicio de mailing' })
      };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
}

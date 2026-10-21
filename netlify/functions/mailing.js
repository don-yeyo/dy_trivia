// ==============================================================================
// NETLIFY FUNCTION: MAILING SERVICE (/api/mailing)
// Envío, reenvío y parametrización de emails (Invitación y Resultados) con Supabase y SMTP
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { getDatabase } from './_db/index.js';
import { verifyAdminToken, getServerEnv } from './utils/googleSheets.js';

/**
 * Carga la configuración SMTP base desde .env_mailn o variables de entorno
 */
function getSmtpConfig() {
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
    smtpFrom: getVal('SMTP_FROM', getVal('SMTP_USER', 'conectados@donyeyo.com.ar')),
    appBaseUrl: getVal('APP_BASE_URL', 'https://dy-inocuidad.netlify.app').replace(/\/+$/, ''),
    testEmail: getVal('TEST_EMAIL', 'gabrieltonelli@gmail.com')
  };
}

/**
 * Crea el transporter de Nodemailer
 */
function createTransporter(cfg) {
  if (!cfg.smtpUser || !cfg.smtpPass) {
    throw new Error('Credenciales SMTP no configuradas (SMTP_USER / SMTP_PASS faltantes en .env_mailn o variables de entorno)');
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
 * Carga el archivo HTML correspondiente al tipo de correo ('INVITACION' o 'RESULTADOS')
 */
function loadTemplateFile(emailTipo = 'INVITACION') {
  const isResultados = String(emailTipo).toUpperCase() === 'RESULTADOS';
  const fileName = isResultados ? 'resultados.html' : 'invitacion.html';
  const legacyFileName = isResultados ? 'resultados.html' : 'mailing.html';

  let currentDir = '';
  try {
    const fileUrl = new URL(import.meta.url);
    currentDir = path.dirname(decodeURIComponent(fileUrl.pathname).replace(/^\/([A-Z]:)/, '$1'));
  } catch (e) {
    currentDir = process.cwd();
  }

  const rootDir = path.resolve(currentDir, '..', '..');

  const possiblePaths = [
    path.resolve(rootDir, 'mailing', fileName),
    path.resolve(rootDir, fileName),
    path.resolve(process.cwd(), 'mailing', fileName),
    path.resolve(process.cwd(), fileName),
    path.resolve(rootDir, 'mailing', legacyFileName),
    path.resolve(process.cwd(), 'mailing', legacyFileName)
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8');
    }
  }

  // Plantilla de respaldo en memoria si no se encuentra el archivo
  return `
    <div style="font-family: Arial, sans-serif; background: #07152b; color: #ffffff; padding: 30px; border-radius: 16px;">
      <h1 style="color: #ffb800;">%TITULO_EMAIL%</h1>
      <p style="color: #93c5fd;">%SUBTITULO%</p>
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

/**
 * Renderiza el HTML reemplazando parámetros (%PARAMETRO%) y comodines del usuario ({{comodin}})
 */
function renderEmailHtml(user, emailTipo = 'INVITACION', paramsMap = {}, smtpCfg = null) {
  const cfg = smtpCfg || getSmtpConfig();
  const tipo = String(emailTipo || 'INVITACION').toUpperCase();
  let template = loadTemplateFile(tipo);

  // Reemplazar parámetros de configuración (%PARAMETRO%)
  Object.entries(paramsMap).forEach(([k, v]) => {
    const regex = new RegExp(`%${k}%`, 'g');
    template = template.replace(regex, String(v ?? ''));
  });

  // Reemplazos de URLs de imágenes si quedaron sin sustituir
  const defaultLogo = `${cfg.appBaseUrl}/logo-donyeyo.svg`;
  const defaultFondo = `${cfg.appBaseUrl}/mailing/fondo-rayos.png`;
  template = template
    .replace(/%URL_LOGO%/g, paramsMap.URL_LOGO || defaultLogo)
    .replace(/%URL_FONDO%/g, paramsMap.URL_FONDO || defaultFondo)
    .replace(/cid:logo_donyeyo/g, paramsMap.URL_LOGO || defaultLogo)
    .replace(/cid:fondo_rayos/g, paramsMap.URL_FONDO || defaultFondo);

  // Comodines del usuario
  const token = (user.token_hash || '').trim();
  const linkTrivia = token ? `${cfg.appBaseUrl}/?token=${encodeURIComponent(token)}` : cfg.appBaseUrl;
  const linkPodio = `${cfg.appBaseUrl}/?view=clasificacion`;

  template = template
    .replace(/\{\{nombre\}\}/gi, user.nombre || 'Colaborador')
    .replace(/\{\{apellido\}\}/gi, user.apellido || '')
    .replace(/\{\{legajo\}\}/gi, String(user.legajo || ''))
    .replace(/\{\{sector\}\}/gi, user.sector || 'Planta General')
    .replace(/\{\{email\}\}/gi, user.email || '')
    .replace(/\{\{link_trivia\}\}/gi, linkTrivia)
    .replace(/\{\{link_podio\}\}/gi, linkPodio)
    .replace(/\{\{puntaje_obtenido\}\}/gi, String(user.puntaje ?? 1250))
    .replace(/\{\{respuestas_correctas\}\}/gi, String(user.correctas ?? 14))
    .replace(/\{\{total_preguntas\}\}/gi, String(user.total_preguntas ?? 15))
    .replace(/\{\{tiempo_total\}\}/gi, String(user.tiempo_total ?? 184));

  // Bloque de feedback pedagógico
  const feedbackHtml = user.feedback_detalle || `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; margin-bottom: 24px; padding: 16px;">
      <tr>
        <td style="color: #cbd5e1; font-size: 13px; line-height: 20px;">
          <div style="font-weight: 700; color: #38bdf8; margin-bottom: 8px;">📚 Devolución Pedagógica Oficial</div>
          <p style="margin: 0 0 6px 0;">¡Excelente desempeño! Recordá que ante cualquier desvío de temperatura o rotura de empaque primario, el procedimiento de Calidad Don Yeyo indica aislar inmediatamente el lote y notificar a supervisión.</p>
        </td>
      </tr>
    </table>
  `;

  template = template.replace(/\{\{feedback_detalle\}\}/gi, feedbackHtml);

  return template;
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
  const smtpCfg = getSmtpConfig();

  // --------------------------------------------------------------------------
  // GET: Consultar Estado General y Parámetros del Mailing
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'GET') {
    try {
      const emailTipo = (event.queryStringParameters?.tipo || 'INVITACION').toUpperCase();
      const participants = await db.getParticipantsAdmin();
      const withEmail = participants.filter(p => p.email && p.email.includes('@'));
      const sentCount = withEmail.filter(p => p.email_enviado).length;
      const pendingCount = withEmail.length - sentCount;

      // Obtener parámetros de Supabase
      const paramsList = await db.getMailingParams(emailTipo);
      const paramsMap = {};
      paramsList.forEach(r => {
        paramsMap[r.nombre_parametro] = r.valor;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          emailTipo,
          totalParticipants: participants.length,
          totalWithEmail: withEmail.length,
          sentCount,
          pendingCount,
          smtpUser: smtpCfg.smtpUser ? `${smtpCfg.smtpUser.split('@')[0]}@...` : 'No configurado',
          smtpHost: smtpCfg.smtpHost,
          appBaseUrl: smtpCfg.appBaseUrl,
          testEmail: smtpCfg.testEmail,
          params: paramsMap
        })
      };
    } catch (e) {
      console.error('Error en GET /api/mailing:', e);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: e.message })
      };
    }
  }

  // --------------------------------------------------------------------------
  // POST: Acciones de Gestión, Vista Previa en Vivo y Envíos
  // --------------------------------------------------------------------------
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const action = body.action || '';
      const emailTipo = String(body.emailTipo || 'INVITACION').toUpperCase();

      // 1. OBTENER PARÁMETROS DE LA BASE DE DATOS
      if (action === 'GET_PARAMS') {
        const paramsList = await db.getMailingParams(emailTipo);
        const paramsMap = {};
        paramsList.forEach(r => {
          paramsMap[r.nombre_parametro] = r.valor;
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            emailTipo,
            params: paramsMap
          })
        };
      }

      // 2. GUARDAR / PERSISTIR PARÁMETROS EN SUPABASE
      if (action === 'SAVE_PARAMS') {
        const incomingParams = body.params || {};
        const saveRes = await db.saveMailingParams(emailTipo, incomingParams);

        if (!saveRes.success) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: saveRes.error || 'No se pudieron guardar los parámetros' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Parámetros para '${emailTipo}' guardados exitosamente en la base de datos.`
          })
        };
      }

      // 3. RENDERIZAR VISTA PREVIA EN TIEMPO REAL (HTML COMPLETO)
      if (action === 'RENDER_PREVIEW') {
        let paramsMap = body.params;
        if (!paramsMap || Object.keys(paramsMap).length === 0) {
          const paramsList = await db.getMailingParams(emailTipo);
          paramsMap = {};
          paramsList.forEach(r => {
            paramsMap[r.nombre_parametro] = r.valor;
          });
        }

        const sampleUser = body.sampleUser || {
          legajo: '1042',
          nombre: 'Juan Román',
          apellido: 'Riquelme',
          sector: 'Producción y Elaboración',
          email: 'jriquelme@donyeyo.com.ar',
          token_hash: 'token_muestra_live_preview',
          puntaje: 1420,
          correctas: 15,
          total_preguntas: 15,
          tiempo_total: 165
        };

        const html = renderEmailHtml(sampleUser, emailTipo, paramsMap, smtpCfg);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            emailTipo,
            html
          })
        };
      }

      // 4. MARCAR TODOS COMO ENVIADOS O NO ENVIADOS (Supabase)
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

      // Cargar parámetros actuales de Supabase para los envíos
      const paramsList = await db.getMailingParams(emailTipo);
      const paramsMap = {};
      paramsList.forEach(r => {
        paramsMap[r.nombre_parametro] = r.valor;
      });
      // Si el cliente envía params actualizados, priorizarlos
      if (body.params && typeof body.params === 'object') {
        Object.assign(paramsMap, body.params);
      }

      const emailSubject = paramsMap.TITULO_EMAIL || (emailTipo === 'RESULTADOS' ? 'Resultados Desafío Inocuidad 2026' : '¡Invitación a Jugar Desafío Inocuidad 2026!');

      // 5. ENVIAR CORREO DE PRUEBA (TEST EMAIL)
      if (action === 'SEND_TEST') {
        const targetEmail = (body.testEmail || smtpCfg.testEmail || '').trim();
        if (!targetEmail || !targetEmail.includes('@')) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dirección de correo de prueba inválida' }) };
        }

        const transporter = createTransporter(smtpCfg);
        const demoUser = {
          legajo: '9999',
          nombre: 'Colaborador',
          apellido: 'Prueba',
          sector: 'Calidad e Inocuidad',
          email: targetEmail,
          token_hash: 'demo_token_hash_para_pruebas',
          puntaje: 1350,
          correctas: 14,
          total_preguntas: 15,
          tiempo_total: 172
        };

        const html = renderEmailHtml(demoUser, emailTipo, paramsMap, smtpCfg);

        await transporter.sendMail({
          from: `"Don Yeyo S.A." <${smtpCfg.smtpFrom}>`,
          to: targetEmail,
          subject: `[PRUEBA ${emailTipo}] ${emailSubject}`,
          html
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Correo de prueba (${emailTipo}) enviado exitosamente a ${targetEmail}`
          })
        };
      }

      // 6. ENVIAR O REENVIAR A UN PARTICIPANTE INDIVIDUAL
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

        // Si es resultados, obtener su puntaje y respuestas reales
        if (emailTipo === 'RESULTADOS') {
          const { data: userResponses } = await supabase
            .from('responses')
            .select('es_correcta, puntos_obtenidos, tiempo_tardado')
            .eq('legajo', legajo);

          const rList = userResponses || [];
          user.correctas = rList.filter(r => r.es_correcta).length;
          user.total_preguntas = Math.max(rList.length, 15);
          user.puntaje = rList.reduce((acc, r) => acc + (r.puntos_obtenidos || 0), 0);
          user.tiempo_total = rList.reduce((acc, r) => acc + (r.tiempo_tardado || 0), 0);
        }

        const transporter = createTransporter(smtpCfg);
        const html = renderEmailHtml(user, emailTipo, paramsMap, smtpCfg);

        await transporter.sendMail({
          from: `"Don Yeyo S.A." <${smtpCfg.smtpFrom}>`,
          to: user.email,
          subject: emailSubject,
          html
        });

        // Marcar en Supabase
        await db.toggleEmailSent(user.legajo, true);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Email (${emailTipo}) enviado exitosamente a ${user.nombre} ${user.apellido} (${user.email})`,
            email: user.email
          })
        };
      }

      // 7. ENVIAR POR LOTES
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

        const transporter = createTransporter(smtpCfg);
        let sentCount = 0;
        let errors = [];

        for (const user of targets) {
          try {
            // Si es resultados, intentar calcular aciertos si están en base
            if (emailTipo === 'RESULTADOS') {
              const supabase = db.getClient();
              const { data: userResponses } = await supabase
                .from('responses')
                .select('es_correcta, puntos_obtenidos, tiempo_tardado')
                .eq('legajo', user.legajo);

              const rList = userResponses || [];
              user.correctas = rList.filter(r => r.es_correcta).length;
              user.total_preguntas = Math.max(rList.length, 15);
              user.puntaje = rList.reduce((acc, r) => acc + (r.puntos_obtenidos || 0), 0);
              user.tiempo_total = rList.reduce((acc, r) => acc + (r.tiempo_tardado || 0), 0);
            }

            const html = renderEmailHtml(user, emailTipo, paramsMap, smtpCfg);
            await transporter.sendMail({
              from: `"Don Yeyo S.A." <${smtpCfg.smtpFrom}>`,
              to: user.email,
              subject: emailSubject,
              html
            });
            await db.toggleEmailSent(user.legajo, true);
            sentCount++;
            // Pausa de 600ms para evitar saturación SMTP
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
            message: `Se enviaron exitosamente ${sentCount} de ${targets.length} correos de ${emailTipo}.`
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

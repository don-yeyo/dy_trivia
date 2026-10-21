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
import { defaultInvitacionHtml, defaultResultadosHtml } from './templates/defaultTemplates.js';

/**
 * Carga la configuración SMTP base desde .env o variables de entorno
 */
function getSmtpConfig() {
  const getVal = (key, fallback = '') => {
    return process.env[key] || getServerEnv(key) || fallback;
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
    throw new Error('Credenciales SMTP no configuradas (SMTP_USER / SMTP_PASS faltantes en .env o variables de entorno)');
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
    path.resolve(rootDir, 'email_templates', fileName),
    path.resolve(process.cwd(), 'email_templates', fileName),
    path.resolve(rootDir, fileName),
    path.resolve(process.cwd(), fileName),
    path.resolve(rootDir, 'email_templates', legacyFileName),
    path.resolve(process.cwd(), 'email_templates', legacyFileName),
    path.resolve(rootDir, 'mailing', fileName),
    path.resolve(process.cwd(), 'mailing', fileName)
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8');
    }
  }

  // Fallback garantizado en memoria: las plantillas oficiales Don Yeyo completas
  return isResultados ? defaultResultadosHtml : defaultInvitacionHtml;
}

/**
 * Helper para extraer el texto legible de una opción
 */
function getOptionText(options, optVal) {
  if (optVal === null || optVal === undefined) return '';
  const num = parseInt(optVal, 10);
  if (Array.isArray(options)) {
    const matchObj = options.find((o, idx) => {
      if (typeof o === 'object' && o !== null) {
        return o.id !== undefined ? o.id === num : (idx + 1) === num;
      }
      return (idx + 1) === num;
    });

    if (matchObj) {
      if (typeof matchObj === 'object' && matchObj !== null) {
        return matchObj.text || matchObj.texto || matchObj.title || '';
      }
      return String(matchObj);
    }

    if (num >= 1 && num <= options.length) {
      const item = options[num - 1];
      return typeof item === 'object' && item !== null
        ? (item.text || item.texto || '')
        : String(item);
    }
  }
  return `Opción ${num}`;
}

/**
 * Genera el bloque HTML con el detalle de resultados pedagógicos pregunta por pregunta
 * @param {Array} questions - Lista de preguntas de la fase
 * @param {Array} userResponses - Respuestas registradas del participante
 * @returns {string} Bloque HTML seguro para correos (estilos inline)
 */
function buildFeedbackDetalleHtml(questions = [], userResponses = []) {
  if (!questions || questions.length === 0) {
    return '';
  }

  // Mapa de respuestas por pregunta_id
  const respMap = new Map();
  (userResponses || []).forEach(r => {
    const qId = parseInt(r.pregunta_id, 10);
    if (!isNaN(qId)) {
      respMap.set(qId, r);
    }
  });

  const cardsHtml = questions.map((q, idx) => {
    const qNum = idx + 1;
    const qId = parseInt(q.id, 10);
    const userResp = respMap.get(qId);

    const hasAnswered = userResp !== undefined && userResp.respuesta_seleccionada !== null && userResp.respuesta_seleccionada !== undefined;
    const isCorrect = hasAnswered && Boolean(userResp.es_correcta);
    const options = Array.isArray(q.opciones) ? q.opciones : [];

    const correctOptionText = getOptionText(options, q.respuesta_correcta);
    const userOptionText = hasAnswered ? getOptionText(options, userResp.respuesta_seleccionada) : '';
    const explicacion = String(q.explicacion || '').trim();

    // Estilos compatibles con clientes de correo (Outlook, Gmail, etc.)
    let statusBadge = '';
    let borderColor = '#64748b';
    let cardBg = '#0d2244';

    if (!hasAnswered) {
      borderColor = '#94a3b8';
      cardBg = '#13284c';
      statusBadge = `
        <span style="display: inline-block; background-color: #334155; color: #cbd5e1; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 9px; border-radius: 6px; border: 1px solid #475569;">
          ⏳ SIN RESPONDER
        </span>
      `;
    } else if (isCorrect) {
      borderColor = '#10b981';
      cardBg = '#0a2e2d';
      statusBadge = `
        <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.25); color: #34d399; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 9px; border-radius: 6px; border: 1px solid #10b981;">
          ✅ CORRECTA
        </span>
      `;
    } else {
      borderColor = '#ef4444';
      cardBg = '#2d141e';
      statusBadge = `
        <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.25); color: #f87171; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 9px; border-radius: 6px; border: 1px solid #ef4444;">
          ❌ INCORRECTA
        </span>
      `;
    }

    // Bloque de respuesta correcta (se enfatiza si el participante se equivocó o no contestó)
    let correctBlock = '';
    if (!isCorrect) {
      correctBlock = `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.12); font-size: 13px; color: #cbd5e1;">
          <span style="color: #94a3b8; font-size: 12px;">Opción correcta:</span>
          <strong style="color: #34d399; margin-left: 5px;">${correctOptionText || `Opción ${q.respuesta_correcta}`}</strong>
        </div>
      `;
    }

    // Bloque de justificación pedagógica de la opción correcta (si fue establecida)
    let explicacionBlock = '';
    if (explicacion) {
      explicacionBlock = `
        <div style="margin-top: 10px; background-color: rgba(14, 165, 233, 0.12); border-left: 3px solid #38bdf8; border-radius: 6px; padding: 10px 14px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #38bdf8; margin-bottom: 3px; letter-spacing: 0.5px;">
            💡 Justificación de Calidad e Inocuidad:
          </div>
          <div style="font-size: 12px; line-height: 18px; color: #e0f2fe;">
            ${explicacion}
          </div>
        </div>
      `;
    }

    return `
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"
        style="margin-bottom: 16px; background-color: ${cardBg}; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); border-left: 5px solid ${borderColor};">
        <tr>
          <td style="padding: 16px 18px;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="left" style="color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
                  Pregunta ${qNum} de ${questions.length}
                </td>
                <td align="right">
                  ${statusBadge}
                </td>
              </tr>
            </table>

            <h4 style="margin: 10px 0 8px 0; color: #ffffff; font-size: 14px; line-height: 20px; font-weight: 700;">
              ${q.pregunta}
            </h4>

            <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 4px;">
              <span style="color: #94a3b8; font-size: 12px;">Tu respuesta:</span>
              ${hasAnswered ? `
                <span style="color: ${isCorrect ? '#34d399' : '#f87171'}; font-weight: 700; margin-left: 5px;">
                  ${userOptionText || `Opción ${userResp.respuesta_seleccionada}`}
                </span>
              ` : `
                <span style="color: #94a3b8; font-style: italic; margin-left: 5px;">
                  No llegaste a responder
                </span>
              `}
            </div>

            ${correctBlock}
            ${explicacionBlock}
          </td>
        </tr>
      </table>
    `;
  }).join('');

  return `
    <div style="margin: 28px 0 24px 0;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
        <tr>
          <td>
            <div style="color: #facc15; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
              ★ DEVOLUCIÓN PEDAGÓGICA Y BUENAS PRÁCTICAS ★
            </div>
            <h3 style="margin: 0; color: #ffffff; font-size: 18px; line-height: 24px; font-weight: 800;">
              Resultados Pregunta por Pregunta
            </h3>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; line-height: 18px;">
              A continuación podés revisar cada una de tus respuestas y la fundamentación técnica de inocuidad correspondiente:
            </p>
          </td>
        </tr>
      </table>

      ${cardsHtml}
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
  const feedbackHtml = user.feedback_detalle || '';
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
      const isSent = (p) => emailTipo === 'RESULTADOS' ? Boolean(p.email_resultado_enviado) : Boolean(p.email_enviado);
      const sentCount = withEmail.filter(isSent).length;
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
          correctas: 13,
          total_preguntas: 15,
          tiempo_total: 165
        };

        if (emailTipo === 'RESULTADOS' && !sampleUser.feedback_detalle) {
          const sysConfig = await db.getConfig();
          const activePhase = sysConfig.activePhase || 1;
          const questions = await db.getQuestionsAdmin(activePhase);

          // Simular respuestas variadas para la vista previa
          const sampleResponses = questions.map((q, idx) => {
            const isCorrect = idx !== 3 && idx !== 8;
            const options = Array.isArray(q.opciones) ? q.opciones : [];
            const correctOpt = parseInt(q.respuesta_correcta, 10) || 1;
            let userOpt = correctOpt;
            if (!isCorrect) {
              userOpt = correctOpt === 1 ? 2 : 1;
            }

            // Justificación modelo en la muestra si la pregunta aún no la tiene en base
            if (!q.explicacion) {
              if (idx === 0) {
                q.explicacion = 'Las normas BPM prohíben anillos, pulseras y relojes para evitar la acumulación de suciedad microbiológica y prevenir cuerpos extraños en la línea productiva.';
              } else if (idx === 3) {
                q.explicacion = 'El lavado de manos debe realizarse con jabón antibacterial frotando palma, dorso y entre dedos durante al menos 20 segundos antes de manipular alimentos.';
              }
            }

            return {
              pregunta_id: q.id,
              respuesta_seleccionada: userOpt,
              es_correcta: isCorrect,
              puntos_obtenidos: isCorrect ? (q.puntos || 100) : 0,
              tiempo_tardado: 8
            };
          });

          sampleUser.correctas = sampleResponses.filter(r => r.es_correcta).length;
          sampleUser.total_preguntas = questions.length;
          sampleUser.feedback_detalle = buildFeedbackDetalleHtml(questions, sampleResponses);
        }

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
        const isResult = emailTipo === 'RESULTADOS';
        const configKey = isResult ? 'EMAILS_RESULTADOS_ENVIADOS' : 'EMAILS_ENVIADOS';
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
          clave: configKey,
          valor: JSON.stringify(map),
          descripcion: isResult
            ? 'Mapa JSON de legajos a los que se les envió el email de resultados'
            : 'Mapa JSON de legajos a los que se les envió el email de invitación',
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
              ? `Se marcaron todos los participantes (${users.length}) como ${emailTipo} enviado en Supabase.`
              : `Se desmarcaron todos los participantes para ${emailTipo} en Supabase.`
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
          correctas: 13,
          total_preguntas: 15,
          tiempo_total: 172
        };

        if (emailTipo === 'RESULTADOS') {
          const sysConfig = await db.getConfig();
          const activePhase = sysConfig.activePhase || 1;
          const questions = await db.getQuestionsAdmin(activePhase);

          const sampleResponses = questions.map((q, idx) => {
            const isCorrect = idx !== 2 && idx !== 7;
            const options = Array.isArray(q.opciones) ? q.opciones : [];
            const correctOpt = parseInt(q.respuesta_correcta, 10) || 1;
            let userOpt = correctOpt;
            if (!isCorrect) {
              userOpt = correctOpt === 1 ? 2 : 1;
            }

            if (!q.explicacion) {
              if (idx === 0) {
                q.explicacion = 'Las normas BPM prohíben anillos, pulseras y relojes para evitar la acumulación de suciedad microbiológica y prevenir cuerpos extraños.';
              } else if (idx === 2) {
                q.explicacion = 'Ante un desvío o rotura de empaque primario, se debe aislar inmediatamente el lote y notificar a supervisión.';
              }
            }

            return {
              pregunta_id: q.id,
              respuesta_seleccionada: userOpt,
              es_correcta: isCorrect,
              puntos_obtenidos: isCorrect ? (q.puntos || 100) : 0,
              tiempo_tardado: 9
            };
          });

          demoUser.correctas = sampleResponses.filter(r => r.es_correcta).length;
          demoUser.total_preguntas = questions.length;
          demoUser.feedback_detalle = buildFeedbackDetalleHtml(questions, sampleResponses);
        }

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

        // Si es resultados, obtener su puntaje, preguntas y respuestas reales con detalle pedagógico
        if (emailTipo === 'RESULTADOS') {
          const sysConfig = await db.getConfig();
          const activePhase = sysConfig.activePhase || 1;
          const questions = await db.getQuestionsAdmin(activePhase);

          const { data: userResponses } = await supabase
            .from('responses')
            .select('pregunta_id, respuesta_seleccionada, es_correcta, puntos_obtenidos, tiempo_tardado')
            .eq('legajo', legajo)
            .eq('fase', activePhase);

          const rList = userResponses || [];
          user.correctas = rList.filter(r => r.es_correcta).length;
          user.total_preguntas = Math.max(questions.length, rList.length, 15);
          user.puntaje = rList.reduce((acc, r) => acc + (r.puntos_obtenidos || 0), 0);
          user.tiempo_total = rList.reduce((acc, r) => acc + (r.tiempo_tardado || 0), 0);
          user.feedback_detalle = buildFeedbackDetalleHtml(questions, rList);
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
        await db.toggleEmailSent(user.legajo, true, emailTipo);

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
        const isSent = (p) => emailTipo === 'RESULTADOS' ? Boolean(p.email_resultado_enviado) : Boolean(p.email_enviado);
        const targets = participants.filter(p => {
          if (!p.email || !p.email.includes('@')) return false;
          if (resendAll) return true;
          return !isSent(p);
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

        let questions = [];
        let activePhase = 1;
        if (emailTipo === 'RESULTADOS') {
          const sysConfig = await db.getConfig();
          activePhase = sysConfig.activePhase || 1;
          questions = await db.getQuestionsAdmin(activePhase);
        }

        const transporter = createTransporter(smtpCfg);
        let sentCount = 0;
        let errors = [];

        for (const user of targets) {
          try {
            // Si es resultados, calcular aciertos, puntaje y construir feedback pedagógico
            if (emailTipo === 'RESULTADOS') {
              const supabase = db.getClient();
              const { data: userResponses } = await supabase
                .from('responses')
                .select('pregunta_id, respuesta_seleccionada, es_correcta, puntos_obtenidos, tiempo_tardado')
                .eq('legajo', user.legajo)
                .eq('fase', activePhase);

              const rList = userResponses || [];
              user.correctas = rList.filter(r => r.es_correcta).length;
              user.total_preguntas = Math.max(questions.length, rList.length, 15);
              user.puntaje = rList.reduce((acc, r) => acc + (r.puntos_obtenidos || 0), 0);
              user.tiempo_total = rList.reduce((acc, r) => acc + (r.tiempo_tardado || 0), 0);
              user.feedback_detalle = buildFeedbackDetalleHtml(questions, rList);
            }

            const html = renderEmailHtml(user, emailTipo, paramsMap, smtpCfg);
            await transporter.sendMail({
              from: `"Don Yeyo S.A." <${smtpCfg.smtpFrom}>`,
              to: user.email,
              subject: emailSubject,
              html
            });
            await db.toggleEmailSent(user.legajo, true, emailTipo);
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

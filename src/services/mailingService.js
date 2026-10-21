// ==============================================================================
// SERVICIO FRONTEND DE MAILING (INVITACIONES Y RESULTADOS PEDAGÓGICOS)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getStoredAdminToken } from './adminService';

function getAuthHeader(token) {
  const adminToken = token || getStoredAdminToken() || '';
  return {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Consulta el estado del servicio de mailing, métricas y parámetros actuales
 */
export async function fetchMailingStatus(emailTipo = 'INVITACION', token = '') {
  try {
    const res = await fetch(`/api/mailing?tipo=${encodeURIComponent(emailTipo)}`, {
      headers: getAuthHeader(token)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Error consultando estado de mailing:', err);
  }
  return null;
}

/**
 * Consulta los parámetros de mailing desde Supabase para un tipo ('INVITACION' o 'RESULTADOS')
 */
export async function fetchMailingParams(emailTipo = 'INVITACION', token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'GET_PARAMS',
        emailTipo
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return data.params || {};
    }
  } catch (err) {
    console.error('Error obteniendo parámetros de mailing:', err);
  }
  return {};
}

/**
 * Guarda y persiste los parámetros de mailing en Supabase
 */
export async function saveMailingParams(emailTipo = 'INVITACION', params = {}, token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'SAVE_PARAMS',
        emailTipo,
        params
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'No se pudieron guardar los parámetros' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Renderiza el HTML completo en tiempo real combinando los parámetros y usuario muestra
 */
export async function renderMailingPreview(emailTipo = 'INVITACION', params = {}, sampleUser = null, token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'RENDER_PREVIEW',
        emailTipo,
        params,
        sampleUser
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, html: data.html };
    }
    return { success: false, error: data.error || 'Error renderizando vista previa' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Envía el correo a un colaborador individual por su legajo
 */
export async function sendSingleParticipantEmail(legajo, emailTipo = 'INVITACION', params = null, token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'SEND_SINGLE',
        legajo: String(legajo),
        emailTipo,
        params
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message, email: data.email };
    }
    return { success: false, error: data.error || 'No se pudo enviar el correo' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Envía un correo de prueba a una dirección de email específica
 */
export async function sendTestEmail(testEmail, emailTipo = 'INVITACION', params = null, token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'SEND_TEST',
        testEmail: String(testEmail).trim(),
        emailTipo,
        params
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'Error enviando correo de prueba' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Envía correos masivos por lotes (con opción de forzar reenvío a todos)
 */
export async function sendBatchMailing({ limit = 50, resendAll = false, emailTipo = 'INVITACION', params = null }, token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'SEND_BATCH',
        limit: parseInt(limit, 10) || 50,
        resendAll: Boolean(resendAll),
        emailTipo,
        params
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return {
        success: true,
        sentCount: data.sentCount || 0,
        message: data.message,
        errors: data.errors || []
      };
    }
    return { success: false, error: data.error || 'Error en envío por lotes' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Marca masivamente en Supabase a todos los participantes como email enviado o no enviado
 */
export async function markAllEmailsSent(markValue = true, token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'MARK_ALL_EMAILS',
        value: Boolean(markValue)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message, count: data.count };
    }
    return { success: false, error: data.error || 'Error actualizando marcas en Supabase' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

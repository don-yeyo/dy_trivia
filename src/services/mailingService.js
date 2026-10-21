// ==============================================================================
// SERVICIO FRONTEND DE MAILING (INVITACIONES A LA TRIVIA)
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
 * Consulta el estado del servicio de mailing y cantidades
 */
export async function fetchMailingStatus(token = '') {
  try {
    const res = await fetch('/api/mailing', {
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
 * Envía la invitación a un colaborador individual por su legajo
 */
export async function sendSingleParticipantEmail(legajo, token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'SEND_SINGLE',
        legajo: String(legajo)
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
export async function sendTestEmail(testEmail, token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'SEND_TEST',
        testEmail: String(testEmail).trim()
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
 * Envía correos masivos a los participantes pendientes (con opción de forzar reenvío a todos)
 */
export async function sendBatchMailing({ limit = 50, resendAll = false }, token = '') {
  try {
    const res = await fetch('/api/mailing', {
      method: 'POST',
      headers: getAuthHeader(token),
      body: JSON.stringify({
        action: 'SEND_BATCH',
        limit: parseInt(limit, 10) || 50,
        resendAll: Boolean(resendAll)
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

// ==============================================================================
// SERVICIO DE GESTIÓN DE PARTICIPANTES (FRONTEND ADMIN)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import { getStoredAdminToken } from './adminService';

/**
 * Obtiene el token de admin o el almacenado en sesión
 */
function resolveToken(providedToken) {
  return providedToken || getStoredAdminToken() || '';
}

/**
 * Consulta la lista completa de participantes con su progreso y estado
 */
export async function fetchParticipantsAdmin(token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      return data.participants || [];
    }
  } catch (error) {
    console.error('Error en fetchParticipantsAdmin:', error);
  }
  return [];
}

/**
 * Crea un nuevo participante
 */
export async function createParticipant(participantData, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'CREATE',
        participant: participantData
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, participant: data.participant };
    }
    return { success: false, error: data.error || 'Error al crear participante' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Actualiza los datos de un participante existente
 */
export async function updateParticipant(legajo, participantData, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'UPDATE',
        legajo: String(legajo),
        participant: participantData
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Error al actualizar participante' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Elimina un participante y sus respuestas asociadas
 */
export async function deleteParticipant(legajo, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'DELETE',
        legajo: String(legajo)
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Error al eliminar participante' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Regenera el token_hash de un participante usando la frase semilla oficial
 */
export async function regenerateParticipantHash(legajo, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'GENERATE_HASH',
        legajo: String(legajo)
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, token_hash: data.token_hash };
    }
    return { success: false, error: data.error || 'Error generando hash' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Genera hashes para todos los participantes que no posean token_hash
 */
export async function generateAllMissingHashes(token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'GENERATE_ALL_MISSING'
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, updatedCount: data.updatedCount || 0 };
    }
    return { success: false, error: data.error || 'Error generando hashes masivos' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Marca o desmarca si el email fue enviado a un participante (Invitación o Resultados)
 */
export async function toggleEmailSent(legajo, emailSent, emailTipo = 'INVITACION', token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'TOGGLE_EMAIL',
        legajo: String(legajo),
        emailSent: Boolean(emailSent),
        emailTipo
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, emailSent: data.emailSent, emailTipo: data.emailTipo };
    }
    return { success: false, error: data.error || 'Error actualizando estado de email' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Resetea el progreso y respuestas de un participante en la fase especificada o en todas
 */
export async function resetParticipantTrivia(legajo, phase = null, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'RESET_TRIVIA',
        legajo: String(legajo),
        phase: phase !== null && phase !== undefined ? parseInt(phase, 10) : null
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Error reseteando trivia del participante' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Construye el enlace de participación completo para el colaborador
 */
export function buildParticipationUrl(tokenHash) {
  if (!tokenHash) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dy-inocuidad.netlify.app';
  return `${origin}/?token=${encodeURIComponent(tokenHash)}`;
}

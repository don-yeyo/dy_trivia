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
 * Consulta la lista completa de participantes con su progreso, estado, puntaje y clasificación
 */
export async function fetchParticipantsAdmin(phase = null, token = '') {
  let effectivePhase = phase;
  let effectiveToken = token;
  // Soporte para firma retrocompatible (token como primer argumento)
  if (typeof phase === 'string' && (phase.startsWith('mock_token_') || phase.length > 20)) {
    effectiveToken = phase;
    effectivePhase = null;
  }
  const adminToken = resolveToken(effectiveToken);
  try {
    const url = effectivePhase ? `/api/participants?phase=${effectivePhase}` : '/api/participants';
    const res = await fetch(url, {
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
 * Resetea masivamente el progreso y respuestas de una lista de participantes en la fase especificada o en todas
 */
export async function resetParticipantTriviaBatch(legajos = [], phase = null, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'RESET_TRIVIA_BATCH',
        legajos: legajos.map(String),
        phase: phase !== null && phase !== undefined ? parseInt(phase, 10) : null
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, updatedCount: data.updatedCount };
    }
    return { success: false, error: data.error || 'Error reseteando trivias masivamente' };
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

/**
 * Cambia el estado de activo (true/false) de un participante individual
 */
export async function toggleParticipantActive(legajo, activo, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'SET_ACTIVE',
        legajo: String(legajo),
        activo: Boolean(activo)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, activo: data.activo };
    }
    return { success: false, error: data.error || 'Error actualizando estado de activo' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Cambia masivamente el estado de activo de una lista de participantes
 */
export async function setParticipantsActiveBatch(legajos = [], activo = true, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'SET_ACTIVE_BATCH',
        legajos: legajos.map(String),
        activo: Boolean(activo)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, updatedCount: data.updatedCount, activo: data.activo };
    }
    return { success: false, error: data.error || 'Error actualizando estados masivos' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Blanquea/elimina el token_hash de un participante
 */
export async function clearParticipantHash(legajo, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'CLEAR_HASH',
        legajo: String(legajo)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Error blanqueando hash' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Blanquea masivamente el token_hash de múltiples participantes
 */
export async function clearParticipantHashBatch(legajos = [], token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'CLEAR_HASH_BATCH',
        legajos: legajos.map(String)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, updatedCount: data.updatedCount };
    }
    return { success: false, error: data.error || 'Error blanqueando hashes masivos' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Regenera/reestablece masivamente el token_hash para los legajos seleccionados
 */
export async function regenerateParticipantHashBatch(legajos = [], token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'GENERATE_HASH_BATCH',
        legajos: legajos.map(String)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, updatedCount: data.updatedCount };
    }
    return { success: false, error: data.error || 'Error regenerando hashes masivos' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Marca o desmarca masivamente el estado de email para una lista de participantes
 */
export async function toggleEmailSentBatch(legajos = [], emailSent = true, emailTipo = 'INVITACION', token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'TOGGLE_EMAIL_BATCH',
        legajos: legajos.map(String),
        emailSent: Boolean(emailSent),
        emailTipo
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, updatedCount: data.updatedCount };
    }
    return { success: false, error: data.error || 'Error actualizando marcas de email' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Consulta la lista de participantes y grupos en una sola llamada
 */
export async function fetchParticipantsAndGroups(phase = null, token = '') {
  let effectivePhase = phase;
  let effectiveToken = token;
  if (typeof phase === 'string' && (phase.startsWith('mock_token_') || phase.length > 20)) {
    effectiveToken = phase;
    effectivePhase = null;
  }
  const adminToken = resolveToken(effectiveToken);
  try {
    const url = effectivePhase ? `/api/participants?phase=${effectivePhase}` : '/api/participants';
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      return {
        participants: data.participants || [],
        groups: data.groups || []
      };
    }
  } catch (error) {
    console.error('Error en fetchParticipantsAndGroups:', error);
  }
  return { participants: [], groups: [] };
}

/**
 * Obtiene el listado de grupos registrados
 */
export async function fetchGroups(token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'GET_GROUPS' })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return data.groups || [];
    }
  } catch (error) {
    console.error('Error en fetchGroups:', error);
  }
  return [];
}

/**
 * Crea un nuevo grupo
 */
export async function createGroup(groupData, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'CREATE_GROUP',
        group: groupData
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, group: data.group };
    }
    return { success: false, error: data.error || 'Error al crear grupo' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Elimina un grupo y desasigna a sus miembros
 */
export async function deleteGroup(nombre, token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'DELETE_GROUP',
        nombre
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Error al eliminar grupo' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Asigna masivamente un grupo a una lista de participantes
 */
export async function assignGroupBatch(legajos = [], grupo = '', token = '') {
  const adminToken = resolveToken(token);
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'ASSIGN_GROUP_BATCH',
        legajos: legajos.map(String),
        grupo: String(grupo || '').trim()
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, updatedCount: data.updatedCount, grupo: data.grupo };
    }
    return { success: false, error: data.error || 'Error al asignar grupo' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Consulta el detalle completo de preguntas y respuestas de un participante para una fase dada
 * @param {string|number} legajo Número de legajo
 * @param {number} phase Número de fase (default: 1)
 * @param {string} token Token de admin opcional
 */
export async function fetchParticipantResponsesDetail(legajo, phase = 1, token = '') {
  const adminToken = resolveToken(token);
  try {
    const cleanLegajo = encodeURIComponent(String(legajo || '').trim());
    const res = await fetch(`/api/participants?action=RESPONSES_DETAIL&legajo=${cleanLegajo}&phase=${phase}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return data;
    }
    return { success: false, error: data.error || 'Error al obtener detalle de respuestas' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


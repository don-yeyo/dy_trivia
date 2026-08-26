// ==============================================================================
// UTILIDAD GENERADORA DE ENLACES ÚNICOS PARA RRHH Y DISTRIBUCIÓN
// ==============================================================================
import { generateUserHash } from '../services/authService';

/**
 * Genera la URL completa de acceso para un colaborador
 */
export function buildUserAccessUrl(baseUrl, legajo, apellido, nombre) {
  const hash = generateUserHash(legajo, apellido, nombre);
  const cleanBase = baseUrl.replace(/\/$/, '');
  return `${cleanBase}/?token=${hash}`;
}

/**
 * Procesa un listado de usuarios y devuelve el array con los hashes y links generados
 */
export function generateLinksForUsers(usersList, baseUrl = window.location.origin) {
  return usersList.map(user => {
    const hash = generateUserHash(user.legajo, user.apellido, user.nombre);
    return {
      ...user,
      token_hash: hash,
      access_url: buildUserAccessUrl(baseUrl, user.legajo, user.apellido, user.nombre)
    };
  });
}

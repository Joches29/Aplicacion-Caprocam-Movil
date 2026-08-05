/**
 * SERVICIO: workerService
 * Lee la lista de colaboradores disponibles para login desde SQLite local (offline-first).
 *
 * @dependencies - offlineAuth.service.js (database/local)
 * @validations  - Filtra colaboradores activos y no eliminados (ya lo hace la query local).
 * @navigation   - N/A
 */

import { obtenerColaboradoresLoginOffline } from '../../../database/local/offlineAuth.service';

import { localApi } from "../../../database/local/localApi.service";
import { obtenerGrupoDatosSesion } from "../../../shared/utils/sessionUtils";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const ROLES_DISPLAY = {
    caprocam_collab: "Colaborador CAPROCAM",
    external_owner: "Propietario",
    external_collab: "Colaborador Externo",
};

/**
 * mapColaborador(colaborador)
 *
 * Transforma un registro crudo de la tabla local `colaboradores`
 * al formato que consume la UI de login.
 *
 * @param {Object} colaborador - Fila de SQLite (id, nombre, apellidos, tipo_colaborador, etc.)
 * @returns {Object} { id, initials, name, role }
 */
const mapColaborador = (colaborador) => {
    const nombre = colaborador.nombre ?? "";
    const apellidos = colaborador.apellidos ?? "";

    const inicialNombre = nombre.charAt(0) || "";
    const inicialApellido = apellidos.charAt(0) || "";

    return {
        id: colaborador.id,
        initials: `${inicialNombre}${inicialApellido}`.toUpperCase(),
        name: `${nombre} ${apellidos}`.trim(),
        role: ROLES_DISPLAY[colaborador.tipo_colaborador] ?? colaborador.tipo_colaborador ?? "Colaborador"
    };
};
/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * getWorkers()
 * Retorna la lista de trabajadores/colaboradores activos desde SQLite local.
 *
 * @returns {Promise<Array>} Lista de colaboradores mapeados.
 * @throws {Error} Si la consulta local falla.
 */
export const getWorkers = async () => {
    const respuesta = await obtenerColaboradoresLoginOffline();

    if (!respuesta.success) {
        throw new Error(respuesta.message || 'No se pudo cargar la lista de colaboradores.');
    }

    return respuesta.data.map(mapColaborador);
};

/**
 * getWorkerById(id)
 * Obtiene un trabajador específico por su id local.
 *
 * @param {number} id - id local del colaborador.
 * @returns {Promise<Object|null>} Colaborador encontrado o null.
 */
export const getWorkerById = async (id) => {
    const workers = await getWorkers();
    return workers.find((w) => w.id === id) || null;
};
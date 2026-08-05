/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: tareasService.js
Autor: Rodolfo
Fecha: 04/08/2026
Modulo: Mantenimiento de Equipos - Tareas
Descripcion:
Servicio CRUD para tareas operando sobre SQLite local.
Convierte entre el formato snake_case de la BD local y el
shape camelCase del frontend. Incluye mapeos de estado y
categoria para mantener compatibilidad con las pantallas.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from "../../../database/local/localApi.service";
import { obtenerCamposAuditoria } from "../../../shared/utils/sessionUtils";

/*
//////////////////////////////////////////////////////////
MAPEOS
//////////////////////////////////////////////////////////
*/

// Estado: SQLite/backend capitalizado → frontend snake_case
const ESTADO_LOCAL_A_FRONTEND = {
    Pendiente: "no_iniciada",
    "En proceso": "en_ejecucion",
    Finalizada: "finalizada",
    Cancelada: "cancelada",
};

// Estado: frontend snake_case → SQLite/backend capitalizado
const ESTADO_FRONTEND_A_LOCAL = {
    no_iniciada: "Pendiente",
    pendiente: "Pendiente",
    en_ejecucion: "En proceso",
    en_proceso: "En proceso",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
};

// Categoria: normalizar a capitalizada
const CATEGORIA_A_LOCAL = {
    preventivo: "Preventivo",
    correctivo: "Correctivo",
    predictivo: "Predictivo",
    emergencia: "Emergencia",
    Preventivo: "Preventivo",
    Correctivo: "Correctivo",
    Predictivo: "Predictivo",
    Emergencia: "Emergencia",
};

/*
//////////////////////////////////////////////////////////
FUNCIONES DE MAPEO
//////////////////////////////////////////////////////////
*/

/**
 * Mapea un registro SQLite de tarea al shape del frontend.
 * @param {object} data - Registro SQLite.
 * @returns {object} Tarea en formato frontend.
 */
function mapTareaLocal(data) {
    if (!data) return {};

    return {
        id: data.id,
        servidorId: data.servidor_id,
        uuid: data.uuid,
        nombre: data.nombre || "",
        descripcion: data.descripcion || "",
        categoria: data.categoria || "",
        duracionEstimada: Number(data.horas) || 0,
        estado: ESTADO_LOCAL_A_FRONTEND[data.estado] || "no_iniciada",
        codigoTarea: data.codigo_tarea || "",
        // Aliases para compatibilidad con selects de mantEquipoService
        value: String(data.id),
        label: data.nombre || "",
        createdAt: data.fecha_creacion,
        updatedAt: data.fecha_actualizacion,
        sincronizado: Boolean(data.sincronizado),
        pendienteSync: Boolean(data.pendiente_sync),
    };
}

/**
 * Mapea los datos del formulario frontend al formato SQLite.
 * @param {object} data - Datos del formulario.
 * @returns {object} Datos para SQLite.
 */
function mapTareaALocal(data) {
    const estadoFrontend = data.estado || "no_iniciada";

    return {
        nombre: (data.nombre || "").trim(),
        descripcion: (data.descripcion || "").trim(),
        categoria: CATEGORIA_A_LOCAL[data.categoria] || data.categoria || "Preventivo",
        horas: Number(data.horas ?? data.duracionEstimada) || 0,
        estado: ESTADO_FRONTEND_A_LOCAL[estadoFrontend.toLowerCase()] || "Pendiente",
        codigo_tarea: data.codigo || data.codigoTarea || `TAR-${String(Date.now()).slice(-6)}`,
    };
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Obtiene todas las tareas activas desde SQLite.
 * @param {object} filtros - Filtros opcionales (categoria, estado).
 * @returns {Promise<Array>} Lista de tareas mapeadas.
 */
async function getTareas(filtros = {}) {
    try {
        const respuesta = await localApi.tareas.obtenerTodos();

        if (!respuesta.success) {
            return [];
        }

        let data = (respuesta.data || []).map(mapTareaLocal);

        if (filtros.categoria) {
            data = data.filter((t) => t.categoria === filtros.categoria);
        }
        if (filtros.estado) {
            data = data.filter((t) => t.estado === filtros.estado);
        }

        return data;
    } catch (error) {
        throw new Error(error.message || "Error al obtener tareas.");
    }
}

/**
 * Obtiene una tarea por su ID local.
 * @param {number|string} id - ID local de la tarea.
 * @returns {Promise<object>} Tarea mapeada.
 */
async function getTareaById(id) {
    try {
        const respuesta = await localApi.tareas.obtenerPorId(Number(id));

        if (!respuesta.success || !respuesta.data) {
            throw new Error("Tarea no encontrada.");
        }

        return mapTareaLocal(respuesta.data);
    } catch (error) {
        throw new Error(error.message || "Error al obtener tarea.");
    }
}

/**
 * Crea una nueva tarea en SQLite local.
 * @param {object} data - Datos de la tarea del formulario.
 * @returns {Promise<object>} Tarea creada mapeada.
 */
async function createTarea(data) {
    try {
        const auditoria = await obtenerCamposAuditoria();
        const payload = {
            ...mapTareaALocal(data),
            ...auditoria,
        };

        const respuesta = await localApi.tareas.crear(payload);

        if (!respuesta.success) {
            const msg = respuesta.error ? `${respuesta.message} (${respuesta.error})` : respuesta.message;
            throw new Error(msg || "Error al crear tarea.");
        }

        return mapTareaLocal(respuesta.data);
    } catch (error) {
        throw new Error(error.message || "Error al crear tarea.");
    }
}

/**
 * Actualiza una tarea existente en SQLite local.
 * @param {number|string} id - ID local de la tarea.
 * @param {object} data - Datos actualizados.
 * @returns {Promise<object>} Tarea actualizada mapeada.
 */
async function updateTarea(id, data) {
    try {
        const payload = mapTareaALocal(data);
        const respuesta = await localApi.tareas.actualizar(Number(id), payload);

        if (!respuesta.success) {
            const msg = respuesta.error ? `${respuesta.message} (${respuesta.error})` : respuesta.message;
            throw new Error(msg || "Error al actualizar tarea.");
        }

        return mapTareaLocal(respuesta.data);
    } catch (error) {
        throw new Error(error.message || "Error al actualizar tarea.");
    }
}

/**
 * Elimina logicamente una tarea en SQLite local (soft delete).
 * @param {number|string} id - ID local de la tarea.
 * @returns {Promise<boolean>} true si se elimino correctamente.
 */
async function deleteTarea(id) {
    try {
        const respuesta = await localApi.tareas.eliminar(Number(id));

        if (!respuesta.success) {
            throw new Error(respuesta.message || "Error al eliminar tarea.");
        }

        return true;
    } catch (error) {
        throw new Error(error.message || "Error al eliminar tarea.");
    }
}

/**
 * Obtiene catalogo de tareas para selects (mismo que getTareas).
 * @returns {Promise<Array>} Lista de tareas con shape { id, value, label, nombre }.
 */
async function getCatalogoTareas() {
    try {
        const tareas = await getTareas();
        return tareas.map((t) => ({
            id: t.id,
            value: String(t.id),
            label: t.nombre,
            nombre: t.nombre,
            categoria: t.categoria,
            duracionEstimada: t.duracionEstimada,
            descripcion: t.descripcion,
        }));
    } catch (error) {
        return [];
    }
}

/*
//////////////////////////////////////////////////////////
EXPORTACIONES
//////////////////////////////////////////////////////////
*/

export const tareasService = {
    getTareas,
    getTareaById,
    createTarea,
    updateTarea,
    deleteTarea,
    getCatalogoTareas,
};

// Alias para compatibilidad con codigo existente
export const obtenerTareas = getTareas;
export const obtenerTareaPorId = getTareaById;
export const crearTarea = createTarea;
export const actualizarTarea = updateTarea;
export const eliminarTarea = deleteTarea;
export const obtenerCatalogoTareas = getCatalogoTareas;
/**
 * ============================================================
 * SERVICIO: tareasService
 * ============================================================
 * Módulo: Mantenimiento de Equipos - Tareas
 *
 * Servicio CRUD para tareas operando sobre SQLite local (Offline-First).
 * Convierte entre el formato snake_case de la BD local y el
 * shape camelCase del frontend.
 * ============================================================
 */

import { localApi } from "../../../database/local/localApi.service";
import { obtenerCamposAuditoria } from "../../../shared/utils/sessionUtils";

// ─── MAPEO DE DATOS ─────────────────────────────────────────────

const ESTADO_LOCAL_A_FRONTEND = {
  Pendiente: "no_iniciada",
  "En proceso": "en_ejecucion",
  Finalizada: "finalizada",
  Cancelada: "cancelada",
};

const ESTADO_FRONTEND_A_LOCAL = {
  no_iniciada: "Pendiente",
  pendiente: "Pendiente",
  en_ejecucion: "En proceso",
  en_proceso: "En proceso",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

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

function mapTareaLocal(data) {
  if (!data) return {};

  return {
    id: data.id,
    servidorId: data.servidor_id,
    uuid: data.uuid,
    nombre: data.nombre || "",
    descripcion: data.descripcion || "",
    categoria: (data.categoria || "").toLowerCase(),
    duracionEstimada: Number(data.horas) || 0,
    estado: ESTADO_LOCAL_A_FRONTEND[data.estado] || "no_iniciada",
    codigoTarea: data.codigo_tarea || "",
    value: String(data.id),
    label: data.nombre || "",
    colaboradorId: data.creado_por_colaborador_id || data.colaborador_id,
    equipoId: data.equipo_id,
    createdAt: data.fecha_creacion,
    updatedAt: data.fecha_actualizacion,
    sincronizado: Boolean(data.sincronizado),
    pendienteSync: Boolean(data.pendiente_sync),
  };
}

function mapTareaALocal(data) {
  const estadoFrontend = data.estado || "no_iniciada";

  return {
    nombre: (data.nombre || "").trim(),
    descripcion: (data.descripcion || "").trim(),
    categoria: CATEGORIA_A_LOCAL[data.categoria] || data.categoria || "Preventivo",
    horas: Number(data.duracionEstimada ?? data.horas) || 0,
    estado: ESTADO_FRONTEND_A_LOCAL[String(estadoFrontend).toLowerCase()] || "Pendiente",
    codigo_tarea: data.codigo || data.codigoTarea || `TAR-${String(Date.now()).slice(-6)}`,
  };
}

// ─── FUNCIONES PRINCIPALES ──────────────────────────────────────

/**
 * Obtiene todas las tareas activas de SQLite local.
 */
async function getTareas(filtros = {}) {
  try {
    const respuesta = await localApi.tareas.obtenerTodos();
    if (!respuesta.success) {
      return [];
    }

    let data = (respuesta.data || []).map(mapTareaLocal);

    if (filtros && filtros.categoria) {
      const filtroCat = String(filtros.categoria || "").toLowerCase();
      data = data.filter((t) => String(t.categoria || "").toLowerCase() === filtroCat);
    }
    if (filtros && filtros.estado) {
      data = data.filter((t) => t.estado === filtros.estado);
    }

    return data;
  } catch (error) {
    throw new Error(error.message || "No se pudieron obtener las tareas");
  }
}

/**
 * Obtiene una tarea por su ID de SQLite local.
 */
async function getTareaById(id) {
  try {
    const respuesta = await localApi.tareas.obtenerPorId(Number(id));
    if (!respuesta.success || !respuesta.data) {
      throw new Error("No se pudo obtener la tarea");
    }
    return mapTareaLocal(respuesta.data);
  } catch (error) {
    throw new Error(error.message || "No se pudo obtener la tarea");
  }
}

/**
 * Crea una nueva tarea en SQLite local.
 */
async function createTarea(data) {
  try {
    const auditoria = await obtenerCamposAuditoria();
    const payload = {
      ...mapTareaALocal(data),
      ...auditoria,
    };

    // Validar duplicados de nombre o código de tarea
    const tareasExistentes = await getTareas();
    const nombreNormalizado = (payload.nombre || "").trim().toLowerCase();
    const duplicado = tareasExistentes.find(
      (t) => (t.nombre || "").trim().toLowerCase() === nombreNormalizado
    );
    if (duplicado) {
      throw new Error(`Ya existe una tarea con el nombre "${payload.nombre}"`);
    }

    const respuesta = await localApi.tareas.crear(payload);
    if (!respuesta.success) {
      const msg = respuesta.error ? `${respuesta.message} (${respuesta.error})` : respuesta.message;
      throw new Error(msg || "No se pudo crear la tarea");
    }

    return mapTareaLocal(respuesta.data);
  } catch (error) {
    throw new Error(error.message || "No se pudo crear la tarea");
  }
}

/**
 * Actualiza una tarea existente en SQLite local.
 */
async function updateTarea(id, data) {
  try {
    const payload = mapTareaALocal(data);
    const targetId = Number(id);

    // Validar duplicados de nombre al editar
    const tareasExistentes = await getTareas();
    const nombreNormalizado = (payload.nombre || "").trim().toLowerCase();
    const duplicado = tareasExistentes.find(
      (t) => (t.nombre || "").trim().toLowerCase() === nombreNormalizado && Number(t.id) !== targetId
    );
    if (duplicado) {
      throw new Error(`Ya existe otra tarea con el nombre "${payload.nombre}"`);
    }

    const respuesta = await localApi.tareas.actualizar(targetId, payload);
    if (!respuesta.success) {
      const msg = respuesta.error ? `${respuesta.message} (${respuesta.error})` : respuesta.message;
      throw new Error(msg || "No se pudo actualizar la tarea");
    }

    return mapTareaLocal(respuesta.data);
  } catch (error) {
    throw new Error(error.message || "No se pudo actualizar la tarea");
  }
}

/**
 * Elimina (borrado lógico) una tarea en SQLite local.
 */
async function deleteTarea(id) {
  try {
    const respuesta = await localApi.tareas.eliminar(Number(id));
    if (!respuesta.success) {
      throw new Error(respuesta.message || "No se pudo eliminar la tarea");
    }
    return true;
  } catch (error) {
    throw new Error(error.message || "No se pudo eliminar la tarea");
  }
}

/**
 * Obtiene catálogo de tareas para selects desde SQLite local.
 */
async function getCatalogoTareas() {
  try {
    const tareas = await getTareas();
    return tareas.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      value: String(t.id),
      label: t.nombre,
      categoria: t.categoria,
      duracionEstimada: t.duracionEstimada,
      descripcion: t.descripcion,
    }));
  } catch (error) {
    return [];
  }
}

// ─── EXPORTACIÓN ────────────────────────────────────────────────

export const tareasService = {
  getTareas,
  getTareaById,
  createTarea,
  updateTarea,
  deleteTarea,
  getCatalogoTareas,
};

// Alias para compatibilidad con código existente
export const obtenerTareas = getTareas;
export const obtenerTareaPorId = getTareaById;
export const crearTarea = createTarea;
export const actualizarTarea = updateTarea;
export const eliminarTarea = deleteTarea;
export const obtenerCatalogoTareas = getCatalogoTareas;
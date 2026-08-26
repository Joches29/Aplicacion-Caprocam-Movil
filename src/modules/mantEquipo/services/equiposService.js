/**
 * ============================================================
 * SERVICIO: equiposService
 * ============================================================
 *
 * Servicio con operaciones CRUD para equipos.
 * Conectado a la base de datos local SQLite (Offline-First).
 * Permite listar, obtener por ID, crear, actualizar, eliminar,
 * y cambiar estado operativo de equipos localmente para su posterior
 * sincronización con la API principal.
 * ============================================================
 */

import { localApi } from "../../../database/local/localApi.service";
import { obtenerCamposAuditoria } from "../../../shared/utils/sessionUtils";

// ============================================================
// CONSTANTES
// ============================================================

export const TIPOS_EQUIPO = [
  { label: "Aireación", value: "aireacion", prefijo: "20" },
  { label: "Bombeo", value: "bombeo", prefijo: "10" },
  { label: "Alimentación", value: "alimentacion", prefijo: "30" },
  { label: "Monitoreo", value: "monitoreo", prefijo: "40" },
  { label: "Mantenimiento", value: "mantenimiento", prefijo: "50" },
  { label: "Otro", value: "otro", prefijo: "99" },
];

const TIPO_BACKEND_A_FRONTEND = {
  Aireacion: "aireacion",
  Bombeo: "bombeo",
  Alimentacion: "alimentacion",
  Monitoreo: "monitoreo",
  Mantenimiento: "mantenimiento",
  Otro: "otro",
};

const TIPO_FRONTEND_A_BACKEND = {
  aireacion: "Aireacion",
  bombeo: "Bombeo",
  alimentacion: "Alimentacion",
  monitoreo: "Monitoreo",
  mantenimiento: "Mantenimiento",
  otro: "Otro",
};

const ESTADO_OPERATIVO_BACKEND_A_FRONTEND = {
  Activo: "activo",
  Inactivo: "inactivo",
  Mantenimiento: "mantenimiento",
};

const ESTADO_OPERATIVO_FRONTEND_A_BACKEND = {
  activo: "Activo",
  inactivo: "Inactivo",
  mantenimiento: "Mantenimiento",
};

// ============================================================
// FUNCIONES AUXILIARES DE MAPEO
// ============================================================

function fechaFormularioABackend(fecha) {
  if (!fecha) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  const str = String(fecha).trim();
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(str)) {
    const [dia, mes, anio] = str.split(/[\/-]/);
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }
  return str;
}

function fechaBackendAFormulario(fecha) {
  if (!fecha) return "";
  const partes = String(fecha).split("-");
  if (partes.length === 3) {
    const [anio, mes, dia] = partes;
    return `${dia}/${mes}/${anio}`;
  }
  return String(fecha);
}

/**
 * Mapea la respuesta local SQLite (snake_case)
 * al shape que espera el frontend (camelCase).
 */
function mapEquipoLocal(equipo) {
  if (!equipo) return null;

  const encendido = equipo.estado === "Encendido";
  let horasUso = Number(equipo.horas_actuales || 0);

  return {
    id: equipo.id,
    servidorId: equipo.servidor_id,
    uuid: equipo.uuid,

    // Identificación
    codigo: equipo.identificador,
    codigoInterno: equipo.identificador,

    nombre: equipo.nombre_equipo,
    descripcion: equipo.descripcion,

    // Tipo
    tipo: TIPO_BACKEND_A_FRONTEND[equipo.tipo_equipo] || "otro",

    fechaInstalacion: fechaBackendAFormulario(equipo.fecha_instalacion),
    funcionEquipo: equipo.funcion_equipo,

    // Ubicación
    estanqueId: equipo.estanque_id,
    ubicacion: equipo.estanque_id,

    // Horas
    horasMantenimiento: equipo.horas_mantenimiento,
    horasUso,
    horasActuales: horasUso,
    horasBase: horasUso,
    fechaUltimoEncendido: equipo.fecha_ultimo_encendido || null,

    // Estado operativo: activo / inactivo / mantenimiento
    estado: ESTADO_OPERATIVO_BACKEND_A_FRONTEND[equipo.estado_operativo] || "activo",

    // Encendido / Apagado
    encendido,

    activo: Boolean(equipo.activo),
    sincronizado: Boolean(equipo.sincronizado),
    pendienteSync: Boolean(equipo.pendiente_sync),
  };
}

function mapEquiposLocal(lista) {
  return (lista || []).map(mapEquipoLocal).filter(Boolean);
}

/**
 * Mapea los datos del formulario frontend al formato snake_case para SQLite local.
 */
function mapEquipoFrontendALocal(data) {
  const payload = {
    identificador: (data.codigo || data.codigoInterno || "").trim(),
    nombre_equipo: (data.nombre || "").trim(),
    descripcion: (data.descripcion || "").trim(),
    tipo_equipo: TIPO_FRONTEND_A_BACKEND[data.tipo] || data.tipoEquipo || "Otro",
    fecha_instalacion: fechaFormularioABackend(data.fechaInstalacion),
    funcion_equipo: (data.funcionEquipo || "").trim(),
    estado_operativo: ESTADO_OPERATIVO_FRONTEND_A_BACKEND[data.estado] || data.estadoOperativo || "Activo",
  };

  if (data.estanqueId !== undefined || data.ubicacion !== undefined) {
    const estId = data.estanqueId || data.ubicacion;
    payload.estanque_id = estId ? Number(estId) : null;
  }

  if (data.horasMantenimiento !== undefined) {
    payload.horas_mantenimiento = data.horasMantenimiento
      ? Number(data.horasMantenimiento)
      : null;
  }

  if (data.estadoEncendido !== undefined) {
    payload.estado = data.estadoEncendido ? "Encendido" : "Apagado";
  }

  if (data.horasActuales !== undefined || data.horasUso !== undefined) {
    payload.horas_actuales = Number(data.horasActuales ?? data.horasUso ?? 0);
  }

  return payload;
}

function necesitaMantenimientoProximo(equipo, umbral = 100) {
  if (!equipo.horasMantenimiento) return false;
  const restantes = equipo.horasMantenimiento - equipo.horasUso;
  return restantes > 0 && restantes <= umbral;
}

// ============================================================
// EXPORTACIÓN DE FUNCIONES
// ============================================================

export const equiposService = {
  /**
   * Obtiene todos los equipos con filtros opcionales desde SQLite local.
   */
  async getEquipos(filtros = {}) {
    try {
      const dbFiltros = {};
      if (filtros.estanqueId) dbFiltros.estanque_id = filtros.estanqueId;

      const respuesta = await localApi.equipos.obtenerTodos(dbFiltros);
      if (!respuesta.success) {
        throw new Error(respuesta.message || "No se pudieron obtener los equipos");
      }

      let resultados = mapEquiposLocal(respuesta.data);

      if (filtros.tipo) {
        resultados = resultados.filter((e) => e.tipo === filtros.tipo);
      }
      if (filtros.estado) {
        resultados = resultados.filter((e) => e.estado === filtros.estado);
      }
      if (filtros.encendido !== undefined) {
        resultados = resultados.filter((e) => e.encendido === filtros.encendido);
      }
      if (filtros.busqueda) {
        const q = filtros.busqueda.toLowerCase();
        resultados = resultados.filter(
          (e) =>
            e.nombre.toLowerCase().includes(q) ||
            e.descripcion.toLowerCase().includes(q) ||
            e.codigo.toLowerCase().includes(q)
        );
      }

      resultados.sort((a, b) => a.nombre.localeCompare(b.nombre));
      return resultados;
    } catch (err) {
      throw new Error(err.message || "No se pudieron obtener los equipos");
    }
  },

  /**
   * Obtiene un equipo por su ID local de SQLite.
   */
  async getEquipoById(id) {
    try {
      const respuesta = await localApi.equipos.obtenerPorId(Number(id));
      if (!respuesta.success || !respuesta.data) {
        throw new Error("No se pudo encontrar el equipo");
      }
      return mapEquipoLocal(respuesta.data);
    } catch (err) {
      throw new Error(err.message || "No se pudo encontrar el equipo");
    }
  },

  /**
   * Crea un nuevo equipo localmente en SQLite.
   */
  async createEquipo(data) {
    try {
      const auditoria = await obtenerCamposAuditoria();
      const payloadLocal = mapEquipoFrontendALocal(data);

      // Validar que no exista un equipo activo con el mismo identificador (código)
      const identificador = payloadLocal.identificador;
      if (identificador) {
        const existentes = await localApi.equipos.obtenerTodos();
        if (existentes.success && Array.isArray(existentes.data)) {
          const duplicado = existentes.data.find(
            (e) => e.identificador === identificador && e.activo === 1
          );
          if (duplicado) {
            throw new Error(`Ya existe un equipo con el código "${identificador}"`);
          }
        }
      }

      // Regla de negocio: Si el equipo está en Mantenimiento o Inactivo, debe estar Apagado.
      let estadoEncendido = data.estadoEncendido !== undefined ? (data.estadoEncendido ? "Encendido" : "Apagado") : "Apagado";
      if (payloadLocal.estado_operativo === "Mantenimiento" || payloadLocal.estado_operativo === "Inactivo") {
        estadoEncendido = "Apagado";
      }

      const payload = {
        ...payloadLocal,
        ...auditoria,
        horas_actuales: Number(data.horasActuales ?? data.horasUso ?? 0),
        estado: estadoEncendido,
      };

      const respuesta = await localApi.equipos.crear(payload);
      if (!respuesta.success) {
        const detalleMsg = respuesta.error ? `${respuesta.message} (${respuesta.error})` : respuesta.message;
        throw new Error(detalleMsg || "No se pudo crear el equipo");
      }

      return mapEquipoLocal(respuesta.data);
    } catch (err) {
      throw new Error(err.message || "No se pudo crear el equipo");
    }
  },

  /**
   * Actualiza un equipo existente en SQLite local.
   */
  async updateEquipo(id, data) {
    try {
      const payload = mapEquipoFrontendALocal(data);
      const targetId = Number(id);

      // Validar código duplicado al editar (excluyendo el equipo actual)
      if (payload.identificador) {
        const existentes = await localApi.equipos.obtenerTodos();
        if (existentes.success && Array.isArray(existentes.data)) {
          const duplicado = existentes.data.find(
            (e) => e.identificador === payload.identificador && e.id !== targetId && e.activo === 1
          );
          if (duplicado) {
            throw new Error(`Ya existe otro equipo con el código "${payload.identificador}"`);
          }
        }
      }

      // Regla de negocio: Si se cambia el estado a Mantenimiento o Inactivo, se fuerza estado Apagado
      if (payload.estado_operativo === "Mantenimiento" || payload.estado_operativo === "Inactivo") {
        payload.estado = "Apagado";
      }

      if (data.horasActuales !== undefined || data.horasUso !== undefined) {
        payload.horas_actuales = Number(data.horasActuales ?? data.horasUso ?? 0);
      }

      const respuesta = await localApi.equipos.actualizar(targetId, payload);
      if (!respuesta.success) {
        const detalleMsg = respuesta.error ? `${respuesta.message} (${respuesta.error})` : respuesta.message;
        throw new Error(detalleMsg || "No se pudo actualizar el equipo");
      }

      return mapEquipoLocal(respuesta.data);
    } catch (err) {
      throw new Error(err.message || "No se pudo actualizar el equipo");
    }
  },

  /**
   * Elimina (lógicamente) un equipo en SQLite local.
   */
  async deleteEquipo(id) {
    try {
      const respuesta = await localApi.equipos.eliminar(Number(id));
      if (!respuesta.success) {
        throw new Error(respuesta.message || "No se pudo eliminar el equipo");
      }
      return true;
    } catch (err) {
      throw new Error(err.message || "No se pudo eliminar el equipo");
    }
  },

  /**
   * Cambia el estado de encendido/apagado de un equipo en SQLite local y acumula horas de uso.
   */
  async toggleEquipoEstado(id, equipoActual) {
    try {
      const targetId = Number(id);
      const resLocal = await localApi.equipos.obtenerPorId(targetId);
      const equipoDb = resLocal.data || {};

      const estabaEncendido = equipoDb.estado === "Encendido";
      let horasActuales = Number(equipoDb.horas_actuales || 0);
      let nuevoEstadoOperativo = equipoDb.estado_operativo;
      let nuevoEstado = "Encendido";
      let fechaUltimoEncendido = null;

      if (estabaEncendido) {
        const fechaInicio = equipoDb.fecha_ultimo_encendido || equipoDb.fecha_actualizacion;
        if (fechaInicio) {
          const msInicio = new Date(fechaInicio).getTime();
          if (!isNaN(msInicio)) {
            const msTranscurridos = Math.max(0, Date.now() - msInicio);
            const horasTranscurridas = msTranscurridos / (1000 * 60 * 60);
            horasActuales = parseFloat((horasActuales + horasTranscurridas).toFixed(2));
          }
        }
        nuevoEstado = "Apagado";
        fechaUltimoEncendido = null;

        const horasMant = Number(equipoDb.horas_mantenimiento || 0);
        if (horasMant > 0 && horasActuales >= horasMant) {
          nuevoEstadoOperativo = "Mantenimiento";
        }
      } else {
        if (equipoDb.estado_operativo === "Mantenimiento" || equipoDb.estado_operativo === "Inactivo") {
          throw new Error(`No se puede encender un equipo en estado ${equipoDb.estado_operativo.toLowerCase()}`);
        }
        nuevoEstado = "Encendido";
        fechaUltimoEncendido = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }

      const fechaActual = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const respuesta = await localApi.equipos.actualizar(targetId, {
        estado: nuevoEstado,
        estado_operativo: nuevoEstadoOperativo,
        horas_actuales: horasActuales,
        fecha_ultimo_encendido: fechaUltimoEncendido,
        fecha_actualizacion: fechaActual,
      });

      if (!respuesta.success) {
        throw new Error(respuesta.message || "No se pudo cambiar el estado del equipo");
      }

      return mapEquipoLocal(respuesta.data);
    } catch (err) {
      throw new Error(err.message || "No se pudo cambiar el estado del equipo");
    }
  },

  /**
   * Obtiene los equipos que están próximos a necesitar mantenimiento.
   */
  async getEquiposProximosMantenimiento(umbral = 100) {
    const equipos = await this.getEquipos();
    const activos = equipos.filter((e) => e.estado === "activo");
    const proximos = activos.filter((e) => necesitaMantenimientoProximo(e, umbral));

    proximos.sort(
      (a, b) =>
        (a.horasMantenimiento - a.horasUso) - (b.horasMantenimiento - b.horasUso)
    );
    return proximos;
  },

  /**
   * Obtiene estadísticas generales de equipos.
   */
  async getEstadisticasEquipos() {
    const equipos = await this.getEquipos();
    const total = equipos.length;
    const activos = equipos.filter((e) => e.estado === "activo").length;
    const mantenimiento = equipos.filter((e) => e.estado === "mantenimiento").length;
    const encendidos = equipos.filter((e) => e.encendido).length;
    const proximosMantenimiento = equipos.filter(
      (e) => e.estado === "activo" && necesitaMantenimientoProximo(e)
    ).length;

    return { total, activos, mantenimiento, encendidos, proximosMantenimiento };
  },

  /**
   * Obtiene los tipos de equipo disponibles
   */
  getTiposEquipo() {
    return TIPOS_EQUIPO;
  },

  /**
   * Obtiene la lista de estanques disponibles para asociar desde SQLite local.
   */
  async getEstanquesDisponibles() {
    try {
      const respuesta = await localApi.estanques.obtenerTodos();
      if (!respuesta.success) return [];
      return (respuesta.data || []).map((estanque) => ({
        label: `${estanque.codigo} (${estanque.tipo_estanque})`,
        value: String(estanque.id),
      }));
    } catch (err) {
      return [];
    }
  },

  /**
   * Formatea las horas de uso para mostrar
   */
  formatearHoras(horas) {
    if (horas < 1) {
      return `${Math.round(horas * 60)} min`;
    }
    return `${Math.round(horas)} h`;
  },
};

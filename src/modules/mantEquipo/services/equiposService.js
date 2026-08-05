/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: equiposService.js
Autor: Rodolfo
Fecha: 04/08/2026
Modulo: Mantenimiento de Equipos
Descripcion:
Servicio CRUD para equipos operando sobre SQLite local.
Convierte entre el formato snake_case de la BD local y el
shape camelCase que usa el frontend. Marca registros como
pendiente_sync para sincronizacion futura con el backend.
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
CONSTANTES
//////////////////////////////////////////////////////////
*/

export const TIPOS_EQUIPO = [
    { label: "Aireación", value: "aireacion", prefijo: "20" },
    { label: "Bombeo", value: "bombeo", prefijo: "10" },
    { label: "Alimentación", value: "alimentacion", prefijo: "30" },
    { label: "Monitoreo", value: "monitoreo", prefijo: "40" },
    { label: "Mantenimiento", value: "mantenimiento", prefijo: "50" },
    { label: "Otro", value: "otro", prefijo: "99" },
];

// Mapeo de tipo_equipo: SQLite/backend capitalizado → frontend minúscula
const TIPO_LOCAL_A_FRONTEND = {
    Aireacion: "aireacion",
    Bombeo: "bombeo",
    Alimentacion: "alimentacion",
    Monitoreo: "monitoreo",
    Mantenimiento: "mantenimiento",
    Otro: "otro",
};

// Mapeo de tipo: frontend minúscula → SQLite/backend capitalizado
const TIPO_FRONTEND_A_LOCAL = {
    aireacion: "Aireacion",
    bombeo: "Bombeo",
    alimentacion: "Alimentacion",
    monitoreo: "Monitoreo",
    mantenimiento: "Mantenimiento",
    otro: "Otro",
};

// Mapeo de estado_operativo: SQLite → frontend
const ESTADO_OPERATIVO_LOCAL_A_FRONTEND = {
    Activo: "activo",
    Inactivo: "inactivo",
    Mantenimiento: "mantenimiento",
};

// Mapeo de estado_operativo: frontend → SQLite
const ESTADO_OPERATIVO_FRONTEND_A_LOCAL = {
    activo: "Activo",
    inactivo: "Inactivo",
    mantenimiento: "Mantenimiento",
};

/*
//////////////////////////////////////////////////////////
FUNCIONES DE MAPEO
//////////////////////////////////////////////////////////
*/

/**
 * Convierte un registro local SQLite (snake_case) al shape frontend (camelCase).
 * @param {object} equipo - Registro SQLite.
 * @returns {object} Equipo en formato frontend.
 */
function mapEquipoLocal(equipo) {
    return {
        id: equipo.id,
        servidorId: equipo.servidor_id,
        uuid: equipo.uuid,

        // Identificacion
        codigo: equipo.identificador,
        codigoInterno: equipo.identificador,

        nombre: equipo.nombre_equipo,
        descripcion: equipo.descripcion,

        // Tipo
        tipo: TIPO_LOCAL_A_FRONTEND[equipo.tipo_equipo] || "otro",

        fechaInstalacion: equipo.fecha_instalacion || "",
        funcionEquipo: equipo.funcion_equipo,

        // Ubicacion
        estanqueId: equipo.estanque_id,
        ubicacion: equipo.estanque_id,

        // Horas
        horasMantenimiento: equipo.horas_mantenimiento,
        horasUso: Number(equipo.horas_actuales || 0),

        // Estado operativo
        estado: ESTADO_OPERATIVO_LOCAL_A_FRONTEND[equipo.estado_operativo] || "activo",

        // Encendido / Apagado
        encendido: equipo.estado === "Encendido",

        activo: Boolean(equipo.activo),

        // Campos sync
        sincronizado: Boolean(equipo.sincronizado),
        pendienteSync: Boolean(equipo.pendiente_sync),
    };
}

/**
 * Convierte el shape frontend al formato snake_case para SQLite.
 * @param {object} data - Datos del formulario frontend.
 * @returns {object} Datos para SQLite.
 */
function mapEquipoALocal(data) {
    const today = new Date();
    const defaultDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const payload = {
        identificador: (data.codigo || data.codigoInterno || "").trim(),
        nombre_equipo: (data.nombre || "").trim(),
        descripcion: (data.descripcion || "").trim(),
        tipo_equipo: TIPO_FRONTEND_A_LOCAL[data.tipo] || data.tipoEquipo || "Otro",
        fecha_instalacion: data.fechaInstalacion || defaultDate,
        funcion_equipo: (data.funcionEquipo || "").trim(),
        estado_operativo: ESTADO_OPERATIVO_FRONTEND_A_LOCAL[data.estado] || data.estadoOperativo || "Activo",
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

/**
 * Determina si el equipo necesita mantenimiento proximo.
 * @param {object} equipo - Equipo en formato frontend.
 * @param {number} umbral - Horas de anticipacion.
 * @returns {boolean}
 */
function necesitaMantenimientoProximo(equipo, umbral = 100) {
    if (!equipo.horasMantenimiento) return false;
    const restantes = equipo.horasMantenimiento - equipo.horasUso;
    return restantes > 0 && restantes <= umbral;
}

/*
//////////////////////////////////////////////////////////
SERVICIO PRINCIPAL
//////////////////////////////////////////////////////////
*/

export const equiposService = {
    /**
     * Obtiene todos los equipos con filtros opcionales desde SQLite.
     */
    async getEquipos(filtros = {}) {
        try {
            const dbFiltros = {};
            if (filtros.estanqueId) dbFiltros.estanque_id = filtros.estanqueId;

            const respuesta = await localApi.equipos.obtenerTodos(dbFiltros);

            if (!respuesta.success) {
                throw new Error(respuesta.message || "Error al obtener equipos.");
            }

            let resultados = (respuesta.data || []).map(mapEquipoLocal);

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
                        (e.nombre || "").toLowerCase().includes(q) ||
                        (e.descripcion || "").toLowerCase().includes(q) ||
                        (e.codigo || "").toLowerCase().includes(q)
                );
            }

            resultados.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
            return resultados;
        } catch (err) {
            throw new Error(err.message || "No se pudieron obtener los equipos.");
        }
    },

    /**
     * Obtiene un equipo por su ID local.
     */
    async getEquipoById(id) {
        try {
            const respuesta = await localApi.equipos.obtenerPorId(Number(id));

            if (!respuesta.success || !respuesta.data) {
                throw new Error("Equipo no encontrado.");
            }

            return mapEquipoLocal(respuesta.data);
        } catch (err) {
            throw new Error(err.message || "Equipo no encontrado.");
        }
    },

    /**
     * Crea un nuevo equipo en SQLite local.
     */
    async createEquipo(data) {
        try {
            const auditoria = await obtenerCamposAuditoria();
            const payload = {
                ...mapEquipoALocal(data),
                ...auditoria,
                horas_actuales: Number(data.horasActuales ?? data.horasUso ?? 0),
                estado: data.estadoEncendido ? "Encendido" : "Apagado",
            };

            const respuesta = await localApi.equipos.crear(payload);

            if (!respuesta.success) {
                const detalleMsg = respuesta.error ? `${respuesta.message} (${respuesta.error})` : respuesta.message;
                throw new Error(detalleMsg || "No se pudo crear el equipo.");
            }

            return mapEquipoLocal(respuesta.data);
        } catch (err) {
            throw new Error(err.message || "No se pudo crear el equipo.");
        }
    },

    /**
     * Actualiza un equipo existente en SQLite local.
     */
    async updateEquipo(id, data) {
        try {
            const payload = mapEquipoALocal(data);

            const respuesta = await localApi.equipos.actualizar(Number(id), payload);

            if (!respuesta.success) {
                throw new Error(respuesta.message || "No se pudo actualizar el equipo.");
            }

            return mapEquipoLocal(respuesta.data);
        } catch (err) {
            throw new Error(err.message || "No se pudo actualizar el equipo.");
        }
    },

    /**
     * Elimina logicamente un equipo en SQLite local (soft delete).
     */
    async deleteEquipo(id) {
        try {
            const respuesta = await localApi.equipos.eliminar(Number(id));

            if (!respuesta.success) {
                throw new Error(respuesta.message || "No se pudo eliminar el equipo.");
            }

            return true;
        } catch (err) {
            throw new Error(err.message || "No se pudo eliminar el equipo.");
        }
    },

    /**
     * Cambia el estado de encendido/apagado de un equipo en SQLite local.
     */
    async toggleEquipoEstado(id, equipoActual) {
        try {
            const nuevoEstado = equipoActual.encendido ? "Apagado" : "Encendido";

            const respuesta = await localApi.equipos.actualizar(Number(id), {
                estado: nuevoEstado,
            });

            if (!respuesta.success) {
                throw new Error(respuesta.message || "No se pudo cambiar el estado del equipo.");
            }

            return mapEquipoLocal(respuesta.data);
        } catch (err) {
            throw new Error(err.message || "No se pudo cambiar el estado del equipo.");
        }
    },

    /**
     * Obtiene equipos proximos a mantenimiento — calculado en cliente.
     */
    async getEquiposProximosMantenimiento(umbral = 100) {
        const equipos = await this.getEquipos();
        const activos = equipos.filter((e) => e.estado === "activo");
        const proximos = activos.filter((e) => necesitaMantenimientoProximo(e, umbral));

        proximos.sort(
            (a, b) =>
                (a.horasMantenimiento - a.horasUso) -
                (b.horasMantenimiento - b.horasUso)
        );
        return proximos;
    },

    /**
     * Obtiene estadisticas generales de equipos — calculado en cliente.
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
     * Obtiene los tipos de equipo disponibles.
     */
    getTiposEquipo() {
        return TIPOS_EQUIPO;
    },

    /**
     * Obtiene estanques disponibles para asociar desde SQLite local.
     */
    async getEstanquesDisponibles() {
        try {
            const respuesta = await localApi.estanques.obtenerTodos();

            if (!respuesta.success) return [];

            return (respuesta.data || []).map((estanque) => ({
                label: `${estanque.codigo} (${estanque.tipo_estanque})`,
                value: String(estanque.id),
            }));
        } catch {
            return [];
        }
    },

    /**
     * Formatea las horas de uso para mostrar.
     */
    formatearHoras(horas) {
        if (horas < 1) {
            return `${Math.round(horas * 60)} min`;
        }
        return `${Math.round(horas)} h`;
    },
};
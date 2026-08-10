/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: localApi.service.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 10/08/2026
Modulo: Database Local
Descripcion:
Expone una API local para consultar SQLite con una forma
similar a los servicios HTTP del backend. Permite usar CRUD
local por tabla y funciones base para sincronizacion.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import {
    inicializarBaseLocal,
    obtenerTodosLocal,
    obtenerPorIdLocal,
    obtenerPorServidorIdLocal,
    crearLocal,
    actualizarLocal,
    eliminarLocal,
    guardarDesdeServidorLocal,
    obtenerPendientesSyncLocal,
    marcarSincronizadoLocal,
    contarRegistrosLocal
} from "./localCrud.service";

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

/**
 * Crea un servicio local estandar para una tabla.
 * @param {string} tabla - Nombre de tabla local.
 * @returns {object} Servicio local de tabla.
 */
const crearServicioTabla = (tabla) => {
    return {
        obtenerTodos: (filtros = {}) => {
            return obtenerTodosLocal(tabla, filtros);
        },

        obtenerPorId: (id) => {
            return obtenerPorIdLocal(tabla, id);
        },

        obtenerPorServidorId: (servidorId) => {
            return obtenerPorServidorIdLocal(tabla, servidorId);
        },

        crear: (datos) => {
            return crearLocal(tabla, datos);
        },

        actualizar: (id, datos) => {
            return actualizarLocal(tabla, id, datos);
        },

        eliminar: (id) => {
            return eliminarLocal(tabla, id);
        },

        guardarDesdeServidor: (registros = []) => {
            return guardarDesdeServidorLocal(tabla, registros);
        },

        marcarSincronizado: (id, servidorId = null) => {
            return marcarSincronizadoLocal(tabla, id, servidorId);
        },

        contar: () => {
            return contarRegistrosLocal(tabla);
        }
    };
};

/*
//////////////////////////////////////////////////////////
API LOCAL
//////////////////////////////////////////////////////////
*/

export const localApi = {
    inicializar: () => {
        return inicializarBaseLocal();
    },

    sync: {
        obtenerPendientes: () => {
            return obtenerPendientesSyncLocal();
        },

        marcarSincronizado: (tabla, id, servidorId = null) => {
            return marcarSincronizadoLocal(tabla, id, servidorId);
        },

        guardarDesdeServidor: (tabla, registros = []) => {
            return guardarDesdeServidorLocal(tabla, registros);
        }
    },

    gruposDatos: crearServicioTabla("grupos_datos"),
    usuarios: crearServicioTabla("usuarios"),

    fincas: crearServicioTabla("fincas"),
    colaboradores: crearServicioTabla("colaboradores"),
    estanques: crearServicioTabla("estanques"),

    equipos: crearServicioTabla("equipos"),
    tareas: crearServicioTabla("tareas"),
    mantenimientoEquipo: crearServicioTabla("mantenimiento_equipo"),
    mantenimientoEquipoTareas: crearServicioTabla("mantenimiento_equipo_tareas"),
    mantenimientoEquipoProductos: crearServicioTabla("mantenimiento_equipo_productos"),

    proveedores: crearServicioTabla("proveedores"),
    productos: crearServicioTabla("productos"),
    inventario: crearServicioTabla("inventario"),
    movimientosInventario: crearServicioTabla("movimientos_inventario"),

    laboratorios: crearServicioTabla("laboratorios"),
    procedencias: crearServicioTabla("procedencias"),
    proveedoresLarva: crearServicioTabla("proveedores_larva"),
    lotesLarva: crearServicioTabla("lotes_larva"),

    precrias: crearServicioTabla("precrias"),
    siembras: crearServicioTabla("siembras"),

    crecimientos: crearServicioTabla("crecimientos"),
    calculosCrecimiento: crearServicioTabla("calculos_crecimiento"),

    compradores: crearServicioTabla("compradores"),
    ventas: crearServicioTabla("ventas"),

    parasitologias: crearServicioTabla("parasitologias"),
    enfermedades: crearServicioTabla("enfermedades"),
    alimentaciones: crearServicioTabla("alimentaciones"),

    densidadPoblacional: crearServicioTabla("densidad_poblacional"),
    densidadDetalleTiros: crearServicioTabla("densidad_detalle_tiros"),

    raleos: crearServicioTabla("raleos"),

    fisicoQuimico: crearServicioTabla("fisico_quimico"),
    fisicoQuimicoDetalle: crearServicioTabla("fisico_quimico_detalle"),

    trazabilidad: crearServicioTabla("trazabilidad"),

    configuracionLocal: crearServicioTabla("configuracion_local"),
    alertasLocales: crearServicioTabla("alertas_locales")
};
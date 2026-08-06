/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: TrazabilidadSync.service.js
Modulo: Trazabilidad (Movil)
Descripcion:
Sincroniza Trazabilidad con el backend real, en dos vias:

1. descargarHistorialTrazabilidad(): trae el historial de
   movimientos (GET /registrosTrazabilidad) y lo guarda en
   SQLite. Segun la respuesta del profesor (05/08/2026), solo
   hay un colaborador por finca haciendo estos registros, asi
   que lo que devuelve este endpoint ya es, en la practica, el
   historial de ese colaborador/finca -- no hace falta pedir
   "todo" ni filtrar del lado del cliente.
   SUPUESTO A CONFIRMAR CON BACKEND (Gerald/equipo): que
   /registrosTrazabilidad ya viene acotado por la sesion
   autenticada (igual que el resto de catalogos, via
   grupo_datos/finca), y no devuelve el historial de TODAS las
   fincas sin filtrar. Si no es asi, hay que agregar un
   parametro de query antes de usar esto en produccion.

2. sincronizarTrazabilidadPendientes(): sube los registros
   creados localmente que aun no se subieron. NO usa el motor
   generico de ENDPOINTS_SYNC (ese tiene un bug: apunta a
   "/trazabilidad" en vez de "/registrosTrazabilidad", y ademas
   ya no es el patron que se esta usando -- Raleo, Finca,
   Siembra, etc. ya migraron a un Sync service propio por
   modulo). Este archivo sigue ese mismo patron.

IMPORTANTE: a diferencia de RaleoSync/fisicoQuimicaSync, este
service NO llama eliminarRegistroLocalDespuesSync tras subir
con exito. Llama marcarSincronizado en su lugar, para
conservar el historial local (necesario para el listado
offline y para validar "estanque ocupado"). Ver cabecera de
TrazabilidadLocal.service.js para la justificacion completa.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import api from "../../../api/api";
import { localApi } from "../../../database/local/localApi.service";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const TABLA_TRAZABILIDAD = "trazabilidad";
const ENDPOINT_TRAZABILIDAD = "/registrosTrazabilidad";

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

const obtenerValor = (objeto, llaves, valorDefecto = null) => {
    if (!objeto) {
        return valorDefecto;
    }

    for (let i = 0; i < llaves.length; i += 1) {
        const llave = llaves[i];

        if (
            Object.prototype.hasOwnProperty.call(objeto, llave) &&
            objeto[llave] !== undefined &&
            objeto[llave] !== null
        ) {
            return objeto[llave];
        }
    }

    return valorDefecto;
};

/**
 * Mapea un registro local (snake_case) al payload que
 * espera el backend real (camelCase), igual que hace
 * AgregarTrazabilidadService con el formulario.
 * @param {object} registro - Fila local de trazabilidad.
 * @returns {object} Payload para POST /registrosTrazabilidad.
 */
const mapearRegistroParaBackend = (registro) => {
    return {
        fincaId: obtenerValor(registro, ["finca_id", "fincaId"]),
        estanqueOrigenId: obtenerValor(registro, ["estanque_origen_id", "estanqueOrigenId"]),
        estanqueDestinoId: obtenerValor(registro, ["estanque_destino_id", "estanqueDestinoId"]),
        fecha: obtenerValor(registro, ["fecha"]),
        tamano: obtenerValor(registro, ["tamano"]),
        dias: obtenerValor(registro, ["dias"]),
        pl: obtenerValor(registro, ["pl"])
    };
};

/**
 * Obtiene, de la lista general de pendientes de sincronizar,
 * solo los que pertenecen a la tabla trazabilidad.
 * @returns {Promise<Array<object>>} Pendientes de trazabilidad.
 */
const obtenerPendientesTrazabilidad = async () => {
    const respuesta = await localApi.sync.obtenerPendientes();
    const pendientes = respuesta && respuesta.success ? respuesta.data : [];

    return (Array.isArray(pendientes) ? pendientes : []).filter(
        (item) => item.tabla === TABLA_TRAZABILIDAD
    );
};

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Descarga el historial de trazabilidad del backend y lo
 * guarda/actualiza en SQLite (upsert por uuid/servidor_id,
 * ver guardarDesdeServidorLocal). No borra nada local: los
 * registros pendientes de subir se mantienen intactos.
 * @returns {Promise<object>} {exito, total, mensaje}.
 */
export async function descargarHistorialTrazabilidad() {
    try {
        await localApi.inicializar();

        const response = await api.get(ENDPOINT_TRAZABILIDAD);
        const registrosServidor = response?.data?.data ?? [];

        const respuesta = await localApi.trazabilidad.guardarDesdeServidor(
            registrosServidor
        );

        if (!respuesta || respuesta.success !== true) {
            return {
                exito: false,
                total: 0,
                mensaje: respuesta?.message || "No se pudo guardar el historial local."
            };
        }

        return {
            exito: true,
            total: registrosServidor.length,
            mensaje: "Historial de trazabilidad descargado correctamente."
        };
    } catch (error) {
        return {
            exito: false,
            total: 0,
            mensaje:
                error?.response?.data?.message ||
                error?.message ||
                "Error al descargar el historial de trazabilidad."
        };
    }
}

/**
 * Sube a el backend los registros de trazabilidad creados
 * localmente y pendientes de sincronizar. Trazabilidad es
 * CREATE-only: si por alguna razon aparece un pendiente con
 * accion UPDATE o DELETE (no deberia ocurrir nunca, ver
 * TrazabilidadLocal.service.js), se reporta como error en vez
 * de intentar mandarlo a un endpoint que no existe.
 * @returns {Promise<object>} {total, sincronizados, errores}.
 */
export async function sincronizarTrazabilidadPendientes() {
    const resultado = {
        total: 0,
        sincronizados: 0,
        errores: []
    };

    await localApi.inicializar();

    const pendientes = await obtenerPendientesTrazabilidad();

    resultado.total = pendientes.length;

    for (let i = 0; i < pendientes.length; i += 1) {
        const pendiente = pendientes[i];
        const registro = pendiente.registro;

        try {
            if (pendiente.accion !== "CREATE") {
                throw new Error(
                    `Accion '${pendiente.accion}' no soportada para ` +
                    "trazabilidad (modulo historico, solo CREATE)."
                );
            }

            const payload = mapearRegistroParaBackend(registro);
            const response = await api.post(ENDPOINT_TRAZABILIDAD, payload);
            const servidorId = response?.data?.data?.id ?? null;

            // A diferencia de Raleo/Fisico-Quimica, aqui NO se borra el
            // residuo local: se marca sincronizado para conservarlo.
            await localApi.trazabilidad.marcarSincronizado(registro.id, servidorId);

            resultado.sincronizados += 1;
        } catch (error) {
            resultado.errores.push({
                id: registro?.id ?? null,
                accion: pendiente.accion,
                mensaje:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Error al sincronizar el registro de trazabilidad."
            });
        }
    }

    return resultado;
}

/*
//////////////////////////////////////////////////////////
EXPORT
//////////////////////////////////////////////////////////
*/

const TrazabilidadSyncService = {
    descargarHistorialTrazabilidad,
    sincronizarTrazabilidadPendientes
};

export default TrazabilidadSyncService;
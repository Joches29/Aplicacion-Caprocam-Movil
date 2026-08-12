/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE RALEOS
 * ============================================================
 *
 * Sincroniza los registros locales de raleo con el backend.
 *
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro se elimina fisicamente de SQLite.
 *
 * ACTUALIZADO: el mapeo hacia el backend (mapearRaleoParaBackend)
 * ahora usa los campos del schema nuevo de raleos (kg_retirados,
 * biomasa_restante, biomasa_estimada, siembra_id). Se eliminaron
 * objetivo, metodo, pesoEstimado y colaboradorId porque ya no
 * existen como columnas en la tabla local `raleos`.
 */

import RaleoService from "./Raleo.service";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_RALEOS = "raleos";

/*
============================================================
HELPERS
============================================================
*/

const obtenerDataRespuesta = (respuesta) =>
    respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
        ? respuesta.data
        : respuesta;

const convertirNumero = (valor, valorDefecto = 0) => {
    const numero = Number(valor);
    return Number.isNaN(numero) ? valorDefecto : numero;
};

const obtenerValor = (objeto, llaves, valorDefecto = null) => {
    if (!objeto) return valorDefecto;

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

/*
============================================================
OBTENER PENDIENTES
============================================================
*/

const obtenerPendientesRaleos = async () => {
    const respuesta = await localApi.sync.obtenerPendientes();
    const data = obtenerDataRespuesta(respuesta);
    const pendientes = Array.isArray(data) ? data : [];

    return pendientes.filter((item) => item.tabla === TABLA_RALEOS);
};

/*
============================================================
MAPEAR SQLITE -> BACKEND
============================================================
*/

const mapearRaleoParaBackend = (registro) => {
    return {
        fincaId: convertirNumero(
            obtenerValor(registro, ["finca_id", "fincaId"], null),
            null
        ),
        estanqueId: convertirNumero(
            obtenerValor(registro, ["estanque_id", "estanqueId"], null),
            null
        ),
        siembraId: obtenerValor(registro, ["siembra_id", "siembraId"], null) !== null
            ? convertirNumero(obtenerValor(registro, ["siembra_id", "siembraId"], null), null)
            : null,
        fecha: obtenerValor(registro, ["fecha"], ""),
        porcentaje: convertirNumero(
            obtenerValor(registro, ["porcentaje"], 0), 0
        ),
        kgRetirados: convertirNumero(
            obtenerValor(registro, ["kg_retirados", "kgRetirados"], 0), 0
        ),
        biomasaRestante: convertirNumero(
            obtenerValor(registro, ["biomasa_restante", "biomasaRestante"], 0), 0
        ),
        biomasaEstimada: convertirNumero(
            obtenerValor(registro, ["biomasa_estimada", "biomasaEstimada"], 0), 0
        ),
        observaciones: obtenerValor(registro, ["observaciones"], ""),
    };
};

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
    const payload = mapearRaleoParaBackend(registro);
    return await RaleoService.create(payload);
};

const sincronizarUpdate = async (registro) => {
    const servidorId =
        obtenerValor(registro, ["servidor_id", "servidorId"], null);
    const payload =
        mapearRaleoParaBackend(registro);

    return servidorId
        ? await RaleoService.update(servidorId, payload)
        : await RaleoService.create(payload);
};

const sincronizarDelete = async (registro) => {
    const servidorId =
        obtenerValor(registro, ["servidor_id", "servidorId"], null);

    return servidorId
        ? await RaleoService.deleteById(servidorId)
        : { eliminadoSoloLocal: true };
};

const sincronizarRegistro = async (pendiente) => {
    const accion =
        pendiente.accion;
    const registro =
        pendiente.registro;

    if (accion === "DELETE") {
        return await sincronizarDelete(registro);
    }

    if (accion === "UPDATE") {
        return await sincronizarUpdate(registro);
    }

    return await sincronizarCreate(registro);
};

/*
============================================================
FUNCION PRINCIPAL
============================================================
*/

async function sincronizarRaleosPendientes() {
    const resultado = {
        total: 0,
        sincronizados: 0,
        errores: [],
    };

    await localApi.inicializar();

    const pendientes =
        await obtenerPendientesRaleos();

    resultado.total = pendientes.length;

    for (let i = 0; i < pendientes.length; i += 1) {
        const pendiente = pendientes[i];
        const registro = pendiente.registro;

        try {
            await sincronizarRegistro(pendiente);

            await eliminarRegistroLocalDespuesSync(
                TABLA_RALEOS,
                registro.id
            );

            resultado.sincronizados += 1;
        } catch (error) {
            resultado.errores.push({
                id: registro?.id ?? null,
                accion: pendiente.accion,
                mensaje: error?.response?.data?.message || error?.message || "Error al sincronizar raleo.",
            });
        }
    }

    return resultado;
}

/*
============================================================
EXPORT
============================================================
*/

const RaleoSyncService = {
    sincronizarRaleosPendientes,
};

export default RaleoSyncService;
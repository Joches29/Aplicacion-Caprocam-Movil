/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE ENFERMEDADES
 * ============================================================
 *
 * Sincroniza los registros locales de enfermedades con el
 * backend.
 *
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro se elimina fisicamente de SQLite.
 */

import EnfermedadesService from "./EnfermedadesService";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_ENFERMEDADES = "enfermedades";

/*
============================================================
HELPERS
============================================================
*/

const obtenerDataRespuesta = (respuesta) => {
    if (respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")) {
        return respuesta.data;
    }

    return respuesta;
};

const convertirNumero = (valor, valorDefecto = 0) => {
    if (valor === undefined || valor === null || valor === "") {
        return valorDefecto;
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        return valorDefecto;
    }

    return numero;
};

function obtenerValor(objeto, llaves, valorDefecto = null) {
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
}

const extraerMensajeError = (error, mensajeGenerico) => {
    if (error?.response?.data?.message) {
        return error.response.data.message;
    }

    if (error?.response?.data?.error) {
        return error.response.data.error;
    }

    if (error?.message) {
        return error.message;
    }

    return mensajeGenerico;
};

const obtenerPendientesEnfermedades = async () => {
    const respuesta = await localApi.sync.obtenerPendientes();
    const data = obtenerDataRespuesta(respuesta);
    const pendientes = Array.isArray(data) ? data : [];

    return pendientes.filter((item) => {
        return item.tabla === TABLA_ENFERMEDADES;
    });
};

const mapearEnfermedadParaBackend = (registro) => {
    return {
        fincaId: convertirNumero(
            obtenerValor(registro, ["finca_id", "fincaId"], null),
            null
        ),

        estanqueId: convertirNumero(
            obtenerValor(registro, ["estanque_id", "estanqueId"], null),
            null
        ),

        fechaReporte: obtenerValor(
            registro,
            ["fecha_reporte", "fechaReporte", "fecha"],
            ""
        ),

        enfermedad: obtenerValor(registro, ["enfermedad"], ""),

        severidad: obtenerValor(registro, ["severidad"], ""),

        reporte: obtenerValor(registro, ["reporte"], null),
    };
};

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
    const payload = mapearEnfermedadParaBackend(registro);

    return await EnfermedadesService.create(payload);
};

const sincronizarUpdate = async (registro) => {
    const servidorId = obtenerValor(
        registro,
        ["servidor_id", "servidorId"],
        null
    );

    const payload = mapearEnfermedadParaBackend(registro);

    if (servidorId) {
        return await EnfermedadesService.update(servidorId, payload);
    }

    return await EnfermedadesService.create(payload);
};

const sincronizarDelete = async (registro) => {
    const servidorId = obtenerValor(
        registro,
        ["servidor_id", "servidorId"],
        null
    );

    if (servidorId) {
        return await EnfermedadesService.deleteById(servidorId);
    }

    return {
        eliminadoSoloLocal: true,
    };
};

const sincronizarRegistro = async (pendiente) => {
    const accion = pendiente.accion;
    const registro = pendiente.registro;

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

async function sincronizarEnfermedadesPendientes() {
    const resultado = {
        total: 0,
        sincronizados: 0,
        errores: [],
    };

    await localApi.inicializar();

    const pendientes = await obtenerPendientesEnfermedades();

    resultado.total = pendientes.length;

    for (let i = 0; i < pendientes.length; i += 1) {
        const pendiente = pendientes[i];
        const registro = pendiente.registro;

        try {
            await sincronizarRegistro(pendiente);

            await eliminarRegistroLocalDespuesSync(
                TABLA_ENFERMEDADES,
                registro.id
            );

            resultado.sincronizados += 1;
        } catch (error) {
            resultado.errores.push({
                id: registro?.id ?? null,
                accion: pendiente.accion,
                mensaje: extraerMensajeError(
                    error,
                    "Error al sincronizar enfermedad."
                ),
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

const EnfermedadesSyncService = {
    sincronizarEnfermedadesPendientes,
};

export default EnfermedadesSyncService;
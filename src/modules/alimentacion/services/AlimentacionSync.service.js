/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE ALIMENTACION
 * ============================================================
 *
 * Sincroniza los registros locales de alimentacion con el backend.
 *
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro se elimina fisicamente de SQLite.
 */

import AlimentacionService from "./Alimentacion.service";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_ALIMENTACIONES = "alimentaciones";

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

const obtenerPendientesAlimentaciones = async () => {
    const respuesta = await localApi.sync.obtenerPendientes();
    const data = obtenerDataRespuesta(respuesta);
    const pendientes = Array.isArray(data) ? data : [];

    return pendientes.filter(
        (item) => item.tabla === TABLA_ALIMENTACIONES
    );
};

/*
============================================================
MAPEAR SQLITE -> BACKEND
============================================================
*/

const mapearAlimentacionParaBackend = (registro) => {
    return {
        fincaId: convertirNumero(
        obtenerValor(registro,["finca_id","fincaId"],null),
        null
        ),
        estanqueId: convertirNumero(
        obtenerValor(registro,["estanque_id","estanqueId"],null),
        null
        ),
        colaboradorId: convertirNumero(
        obtenerValor(registro,["colaborador_id","colaboradorId"],null),
        null
        ),
        proveedorId: convertirNumero(
        obtenerValor(registro,["proveedor_id","proveedorId"],null),
        null
        ),
        productoId: convertirNumero(
        obtenerValor(registro,["producto_id","productoId"],null),null
        ),
        fecha: obtenerValor(registro,["fecha"],""
        ),
        hora: obtenerValor(registro,["hora"],""
        ),
        metodo: obtenerValor(registro,["metodo"],""
        ),
        cantidadKg: convertirNumero(
        obtenerValor(registro,["cantidad_kg","cantidadKg"],0),0
        ),
        presentacion:obtenerValor(registro,["presentacion"],""
        ),
        proveedor:obtenerValor(registro,["proveedor"],""
        ),
        tipoAlimento:obtenerValor(registro,["tipo_alimento","tipoAlimento"],""
        ),
        observaciones:obtenerValor(registro,["observaciones"],""
        ),
    };
};

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
    const payload =
        mapearAlimentacionParaBackend(registro);

    return await AlimentacionService.create(payload);
};

const sincronizarUpdate = async (registro) => {
    const servidorId =
        obtenerValor(
            registro,["servidor_id","servidorId"],null);

    const payload =
        mapearAlimentacionParaBackend(registro);

    return servidorId
        ? await AlimentacionService.update(servidorId, payload)
        : await AlimentacionService.create(payload);
};

const sincronizarDelete = async (registro) => {
    const servidorId =
        obtenerValor(
            registro,["servidor_id","servidorId"],null);

    return servidorId
        ? await AlimentacionService.deleteById(servidorId)
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

async function sincronizarAlimentacionesPendientes() {

    const resultado = {
        total: 0,
        sincronizados: 0,
        errores: [],
    };

    await localApi.inicializar();

    const pendientes =
        await obtenerPendientesAlimentaciones();

    resultado.total =
        pendientes.length;

    for (let i = 0; i < pendientes.length; i += 1) {

        const pendiente =
            pendientes[i];

        const registro =
            pendiente.registro;

        try {

            await sincronizarRegistro(
                pendiente
            );

            await eliminarRegistroLocalDespuesSync(
                TABLA_ALIMENTACIONES,
                registro.id
            );

            resultado.sincronizados += 1;

        } catch(error) {

            resultado.errores.push({
                id: registro?.id ?? null,
                accion: pendiente.accion,
                mensaje:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Error al sincronizar alimentacion.",
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

const AlimentacionSyncService = {
    sincronizarAlimentacionesPendientes,
};

export default AlimentacionSyncService;
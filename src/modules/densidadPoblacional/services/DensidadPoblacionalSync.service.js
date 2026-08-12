/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE DENSIDAD POBLACIONAL
 * ============================================================
 *
 * Sincroniza los registros locales de densidad poblacional con el
 * backend, incluyendo el detalle de tiros de atarraya.
 *
 * NUEVO ARCHIVO: no existia en la version "web" (tampoco existia
 * el service local). Reconstruido con el mismo patron que
 * RaleoSync.service.js / AlimentacionSync.service.js.
 *
 * DIFERENCIA con esos dos: aqui un registro no es una sola fila.
 * Antes de mandarlo al backend hay que releer sus tiros desde
 * `densidad_detalle_tiros` (localApi.densidadDetalleTiros) y
 * armar el arreglo `tiros` que espera el DTO del backend
 * (densidadPoblacionalService.create/update), porque el backend
 * recalcula el resto (promedio, densidad, poblacion, supervivencia)
 * a partir de ese detalle, igual que el service local.
 *
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro (y sus tiros) se eliminan
 * fisicamente de SQLite.
 */

import DensidadPoblacionalService from "./DensidadPoblacional.service";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_DENSIDAD = "densidad_poblacional";
const TABLA_TIROS = "densidad_detalle_tiros";

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

const obtenerPendientesDensidad = async () => {
    const respuesta = await localApi.sync.obtenerPendientes();
    const data = obtenerDataRespuesta(respuesta);
    const pendientes = Array.isArray(data) ? data : [];

    return pendientes.filter((item) => item.tabla === TABLA_DENSIDAD);
};

/*
============================================================
TIROS DEL REGISTRO
============================================================
*/

const obtenerTirosOrdenados = async (densidadId) => {
    const respuesta = await localApi.densidadDetalleTiros.obtenerTodos();
    const data = obtenerDataRespuesta(respuesta);
    const registros = Array.isArray(data) ? data : [];

    return registros
        .filter((tiro) => Number(obtenerValor(tiro, ["densidad_id", "densidadId"], null)) === Number(densidadId))
        .sort(
            (a, b) =>
                Number(obtenerValor(a, ["numero_tiro", "numeroTiro"], 0)) -
                Number(obtenerValor(b, ["numero_tiro", "numeroTiro"], 0))
        )
        .map((tiro) => convertirNumero(obtenerValor(tiro, ["cantidad_camarones", "cantidadCamarones"], 0), 0));
};

/*
============================================================
MAPEAR SQLITE -> BACKEND
============================================================
*/

const mapearDensidadParaBackend = async (registro) => {
    const densidadId = obtenerValor(registro, ["id"], null);
    const tiros = densidadId ? await obtenerTirosOrdenados(densidadId) : [];

    return {
        idFinca: convertirNumero(obtenerValor(registro, ["finca_id", "fincaId"], null), null),
        idEstanque: convertirNumero(obtenerValor(registro, ["estanque_id", "estanqueId"], null), null),
        fecha: obtenerValor(registro, ["fecha"], ""),
        tiros,
        areaAtarraya: convertirNumero(obtenerValor(registro, ["area_atarraya", "areaAtarraya"], 0), 0),
        notasConteo: obtenerValor(registro, ["notas_conteo", "notasConteo"], ""),
        cantidadSiembra: convertirNumero(obtenerValor(registro, ["cantidad_siembra", "cantidadSiembra"], 0), 0),
        areaEstanque: convertirNumero(obtenerValor(registro, ["area_estanque", "areaEstanque"], 0), 0),
    };
};

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
    const payload = await mapearDensidadParaBackend(registro);
    return await DensidadPoblacionalService.create(payload);
};

const sincronizarUpdate = async (registro) => {
    const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
    const payload = await mapearDensidadParaBackend(registro);

    return servidorId
        ? await DensidadPoblacionalService.update(servidorId, payload)
        : await DensidadPoblacionalService.create(payload);
};

const sincronizarDelete = async (registro) => {
    const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

    return servidorId
        ? await DensidadPoblacionalService.deleteById(servidorId)
        : { eliminadoSoloLocal: true };
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
LIMPIEZA LOCAL DE TIROS TRAS SYNC
============================================================
*/

const eliminarTirosLocalesDelRegistro = async (densidadId) => {
    const respuesta = await localApi.densidadDetalleTiros.obtenerTodos();
    const data = obtenerDataRespuesta(respuesta);
    const registros = Array.isArray(data) ? data : [];

    const tirosDelRegistro = registros.filter(
        (tiro) => Number(obtenerValor(tiro, ["densidad_id", "densidadId"], null)) === Number(densidadId)
    );

    for (let i = 0; i < tirosDelRegistro.length; i += 1) {
        await eliminarRegistroLocalDespuesSync(TABLA_TIROS, obtenerValor(tirosDelRegistro[i], ["id"], null));
    }
};

/*
============================================================
FUNCION PRINCIPAL
============================================================
*/

async function sincronizarDensidadPendiente() {
    const resultado = {
        total: 0,
        sincronizados: 0,
        errores: [],
    };

    await localApi.inicializar();

    const pendientes = await obtenerPendientesDensidad();

    resultado.total = pendientes.length;

    for (let i = 0; i < pendientes.length; i += 1) {
        const pendiente = pendientes[i];
        const registro = pendiente.registro;

        try {
            await sincronizarRegistro(pendiente);

            // Los tiros del registro no tienen su propio "pendiente
            // de sync": viajan junto con el padre. Se limpian de
            // SQLite en el mismo momento que el padre.
            await eliminarTirosLocalesDelRegistro(registro.id);
            await eliminarRegistroLocalDespuesSync(TABLA_DENSIDAD, registro.id);

            resultado.sincronizados += 1;
        } catch (error) {
            resultado.errores.push({
                id: registro?.id ?? null,
                accion: pendiente.accion,
                mensaje:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Error al sincronizar densidad poblacional.",
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

const DensidadPoblacionalSyncService = {
    sincronizarDensidadPendiente,
};

export default DensidadPoblacionalSyncService;
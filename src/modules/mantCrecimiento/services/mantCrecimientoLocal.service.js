/**
 * ============================================================
 * SERVICE LOCAL DE CRECIMIENTOS (SQLite)
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de crecimientos
 * usando SQLite.
 *
 * Mantiene una API similar al service HTTP para que los hooks
 * puedan trabajar con datos locales sin cambiar la pantalla.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { localApi } from "../../../database/local/localApi.service";

/*
============================================================
CONSTANTES
============================================================
*/

const STORAGE_COLABORADOR_ACTUAL = "caprocam_colaborador_actual";
const STORAGE_GRUPO_DATOS = "caprocam_grupo_datos";

const METODOS_LOCAL_API = {
    obtenerTodos: ["obtenerTodos", "getAll", "listar"],
    obtenerPorId: ["obtenerPorId", "getById", "buscarPorId"],
    crear: ["crear", "create"],
    actualizar: ["actualizar", "update"],
    eliminar: ["eliminar", "deleteById", "remove"],
};

const obtenerDataRespuesta = (respuesta) =>
    respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
        ? respuesta.data
        : respuesta;

const convertirNumero = (valor, valorDefecto = 0) => {
    const numero = Number(valor);
    return Number.isNaN(numero) ? valorDefecto : numero;
};

const convertirTexto = (valor, valorDefecto = "") =>
    valor === undefined || valor === null ? valorDefecto : String(valor);

const extraerError = (error) =>
    error?.message ? error.message : "Error desconocido";

/*
============================================================
HELPERS
============================================================
*/

function obtenerValor(objeto, llaves, valorDefecto = null) {
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
}

async function obtenerJsonStorage(llave) {
    try {
        const valor = await AsyncStorage.getItem(llave);
        return valor ? JSON.parse(valor) : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function obtenerContextoLocal() {
    const colaborador = await obtenerJsonStorage(STORAGE_COLABORADOR_ACTUAL);
    const grupoStorage = await AsyncStorage.getItem(STORAGE_GRUPO_DATOS);
    const grupoColaborador = obtenerValor(colaborador, ["grupoDatos", "grupo_datos"], null);
    const grupoDatos = grupoColaborador || grupoStorage || 1;
    const colaboradorId = obtenerValor(colaborador, ["id", "colaboradorId", "colaborador_id"], null);

    return {
        grupoDatos: convertirNumero(grupoDatos, 1),
        colaboradorId: colaboradorId,
    };
}

async function ejecutarMetodoCrecimientos(tipoMetodo, argumentos = []) {
    const apiCrecimientos = localApi.crecimientos;
    if (!apiCrecimientos) {
        throw new Error("localApi.crecimientos no está disponible.");
    }
    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];
    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];
        if (typeof apiCrecimientos[nombreMetodo] === "function") {
            return await apiCrecimientos[nombreMetodo](...argumentos);
        }
    }
    throw new Error(`No existe método local para crecimientos: ${tipoMetodo}`);
}

/*
============================================================
MAPEO LOCAL A BACKEND
============================================================
*/

function mapearCrecimientoDesdeLocal(registro) {
    return registro
        ? {
            id: obtenerValor(registro, ["id"], null),
            servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
            uuid: obtenerValor(registro, ["uuid"], ""),
            grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),
            finca: obtenerValor(registro, ["finca_id", "fincaId", "finca"], null),
            estanque: obtenerValor(registro, ["estanque_id", "estanqueId", "estanque"], null),
            colaborador: obtenerValor(registro, ["colaborador_id", "colaboradorId", "colaborador"], null),
            pesoActual: obtenerValor(registro, ["peso_actual", "pesoActual"], 0),
            fechaRegistro: obtenerValor(registro, ["fecha_registro", "fechaRegistro", "fecha"], ""),
            activo: obtenerValor(registro, ["activo"], 1),
            sincronizado: obtenerValor(registro, ["sincronizado"], 0),
            pendienteSync: obtenerValor(registro, ["pendiente_sync", "pendienteSync"], 1),
            accionSync: obtenerValor(registro, ["accion_sync", "accionSync"], null),
            fechaSync: obtenerValor(registro, ["fecha_sync", "fechaSync"], null),
            fechaCreacion: obtenerValor(registro, ["fecha_creacion", "fechaCreacion"], null),
            fechaActualizacion: obtenerValor(registro, ["fecha_actualizacion", "fechaActualizacion"], null),
        }
        : null;
}

async function mapearCrecimientoParaLocal(crecimientoDTO) {
    const contexto = await obtenerContextoLocal();
    const grupoDatos = obtenerValor(crecimientoDTO, ["grupoDatos", "grupo_datos"], contexto.grupoDatos);
    const fincaId = obtenerValor(crecimientoDTO, ["finca", "fincaId", "finca_id"], null);
    const estanqueId = obtenerValor(crecimientoDTO, ["estanque", "estanqueId", "estanque_id"], null);
    const colaboradorId = obtenerValor(crecimientoDTO, ["colaborador", "colaboradorId", "colaborador_id"], contexto.colaboradorId);
    const pesoActual = obtenerValor(crecimientoDTO, ["pesoActual", "peso_actual"], 0);
    const fechaRegistro = obtenerValor(crecimientoDTO, ["fechaRegistro", "fecha_registro", "fecha"], "");

    return {
        grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
        finca_id: convertirNumero(fincaId, null),
        estanque_id: convertirNumero(estanqueId, null),
        colaborador_id: colaboradorId ? convertirNumero(colaboradorId, null) : null,
        peso_actual: Number(pesoActual),
        fecha_registro: convertirTexto(fechaRegistro),
        creado_por_colaborador_id: contexto.colaboradorId,
    };
}

/*
============================================================
FUNCION PRINCIPAL
============================================================
*/

async function getAll(filtros = {}) {
    try {
        const respuesta = await ejecutarMetodoCrecimientos("obtenerTodos");
        const data = obtenerDataRespuesta(respuesta);
        const registros = Array.isArray(data) ? data : [];
        return registros
            .map(mapearCrecimientoDesdeLocal)
            .filter(Boolean)
            .filter((item) => {
                const coincideFinca = filtros.finca ? Number(item.finca) === Number(filtros.finca) : true;
                const coincideEstanque = filtros.estanque ? Number(item.estanque) === Number(filtros.estanque) : true;
                return coincideFinca && coincideEstanque;
            });
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function getById(id) {
    try {
        const respuesta = await ejecutarMetodoCrecimientos("obtenerPorId", [id]);
        return mapearCrecimientoDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function create(crecimientoDTO) {
    try {
        const datosLocales = await mapearCrecimientoParaLocal(crecimientoDTO);
        const respuesta = await ejecutarMetodoCrecimientos("crear", [datosLocales]);
        return mapearCrecimientoDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function update(id, crecimientoDTO) {
    try {
        const datosLocales = await mapearCrecimientoParaLocal(crecimientoDTO);
        const respuesta = await ejecutarMetodoCrecimientos("actualizar", [id, datosLocales]);
        return mapearCrecimientoDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function deleteById(id) {
    try {
        const respuesta = await ejecutarMetodoCrecimientos("eliminar", [id]);
        return mapearCrecimientoDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/*
============================================================
EXPORT
============================================================
*/

const CrecimientosLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
};

export default CrecimientosLocalService;
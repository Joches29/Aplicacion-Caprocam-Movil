/**
 * ============================================================
 * SERVICE LOCAL DE SIEMBRA
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de siembra
 * usando SQLite.
 *
 * Mantiene una API similar al service HTTP (siembra.service.js)
 * para que los hooks puedan trabajar con datos locales sin
 * cambiar la pantalla. Sigue el mismo patron que
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

/*
============================================================
HELPERS GENERALES
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

const convertirTexto = (valor, valorDefecto = "") =>
    valor === undefined || valor === null ? valorDefecto : String(valor);

const extraerError = (error) =>
    error?.message ? error.message : "Error desconocido";

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
        console.error("Error al leer storage local", error);
        return null;
    }
}

async function obtenerContextoLocal() {
    const colaborador = await obtenerJsonStorage(STORAGE_COLABORADOR_ACTUAL);
    const grupoStorage = await AsyncStorage.getItem(STORAGE_GRUPO_DATOS);

    const grupoColaborador = obtenerValor(
        colaborador,
        ["grupoDatos", "grupo_datos"],
        null
    );

    const grupoDatos = grupoColaborador || grupoStorage || 1;

    const colaboradorId = obtenerValor(
        colaborador,
        ["id", "colaboradorId", "colaborador_id"],
        null
    );

    return {
        grupoDatos: convertirNumero(grupoDatos, 1),
        colaboradorId: colaboradorId,
    };
}

async function ejecutarMetodoSiembras(tipoMetodo, argumentos = []) {
    const apiSiembras = localApi.siembras;

    if (!apiSiembras) {
        throw new Error("localApi.siembras no esta disponible.");
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (typeof apiSiembras[nombreMetodo] === "function") {
            return await apiSiembras[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local para siembras: ${tipoMetodo}`);
}

/*
============================================================
MAPEADORES
============================================================
*/

function mapearSiembraDesdeLocal(registro) {
    return registro
        ? {
            id: obtenerValor(registro, ["id"], null),
            servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
            uuid: obtenerValor(registro, ["uuid"], ""),
            grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

            loteLarvaId: obtenerValor(registro, ["lote_larva_id", "loteLarvaId"], null),
            precriaId: obtenerValor(registro, ["precria_id", "precriaId"], null),
            fincaId: obtenerValor(registro, ["finca_id", "fincaId"], null),
            estanqueId: obtenerValor(registro, ["estanque_id", "estanqueId"], null),

            fechaSiembra: obtenerValor(
                registro,
                ["fecha_siembra", "fechaSiembra"],
                ""
            ),

            tecnicaCultivo: obtenerValor(registro, ["tecnica_cultivo", "tecnicaCultivo"], ""),

            densidadPoblacional: obtenerValor(
                registro,
                ["densidad_poblacional", "densidadPoblacional"],
                null
            ),

            cantidadSembrada: obtenerValor(
                registro,
                ["cantidad_sembrada", "cantidadSembrada"],
                0
            ),

            plSiembra: obtenerValor(registro, ["pl_siembra", "plSiembra"], null),
            duracionCiclo: obtenerValor(registro, ["duracion_ciclo", "duracionCiclo"], null),
            estado: obtenerValor(registro, ["estado"], "Activa"),
            produccionKg: obtenerValor(registro, ["produccion_kg", "produccionKg"], 0),

            activo: obtenerValor(registro, ["activo"], 1),
            sincronizado: obtenerValor(registro, ["sincronizado"], 0),
            pendienteSync: obtenerValor(registro, ["pendiente_sync", "pendienteSync"], 1),
            accionSync: obtenerValor(registro, ["accion_sync", "accionSync"], null),
            fechaSync: obtenerValor(registro, ["fecha_sync", "fechaSync"], null),

            fechaCreacion: obtenerValor(
                registro,
                ["fecha_creacion", "fechaCreacion"],
                null
            ),

            fechaActualizacion: obtenerValor(
                registro,
                ["fecha_actualizacion", "fechaActualizacion"],
                null
            ),
        }
        : null;
}

async function mapearSiembraParaLocal(siembraDTO) {
    const contexto = await obtenerContextoLocal();

    const grupoDatos = obtenerValor(
        siembraDTO,
        ["grupoDatos", "grupo_datos"],
        contexto.grupoDatos
    );

    const loteLarvaId = obtenerValor(
        siembraDTO,
        ["loteLarvaId", "lote_larva_id"],
        null
    );

    const precriaId = obtenerValor(
        siembraDTO,
        ["precriaId", "precria_id"],
        null
    );

    const fincaId = obtenerValor(
        siembraDTO,
        ["fincaId", "finca_id"],
        null
    );

    const estanqueId = obtenerValor(
        siembraDTO,
        ["estanqueId", "estanque_id"],
        null
    );

    const fechaSiembra = obtenerValor(
        siembraDTO,
        ["fechaSiembra", "fecha_siembra"],
        ""
    );

    const densidadPoblacional = obtenerValor(
        siembraDTO,
        ["densidadPoblacional", "densidad_poblacional"],
        null
    );

    const cantidadSembrada = obtenerValor(
        siembraDTO,
        ["cantidadSembrada", "cantidad_sembrada"],
        0
    );

    const produccionKg = obtenerValor(
        siembraDTO,
        ["produccionKg", "produccion_kg"],
        0
    );

    const plSiembra = obtenerValor(
        siembraDTO,
        ["plSiembra", "pl_siembra"],
        null
    );

    const duracionCiclo = obtenerValor(
        siembraDTO,
        ["duracionCiclo", "duracion_ciclo"],
        null
    );

    const creadoPorColaboradorId = obtenerValor(
        siembraDTO,
        ["creadoPorColaboradorId", "creado_por_colaborador_id"],
        contexto.colaboradorId
    );

    const creadoPorUsuarioId = obtenerValor(
        siembraDTO,
        ["creadoPorUsuarioId", "creado_por_usuario_id"],
        null
    );

    return {
        grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
        lote_larva_id: convertirNumero(loteLarvaId, null),
        precria_id: precriaId !== null && precriaId !== "" ? convertirNumero(precriaId, null) : null,
        finca_id: convertirNumero(fincaId, null),
        estanque_id: convertirNumero(estanqueId, null),
        fecha_siembra: convertirTexto(fechaSiembra),
        tecnica_cultivo: convertirTexto(siembraDTO.tecnicaCultivo || siembraDTO.tecnica_cultivo, null) || null,
        densidad_poblacional:
            densidadPoblacional !== null && densidadPoblacional !== ""
                ? convertirNumero(densidadPoblacional, null)
                : null,
        cantidad_sembrada: convertirNumero(cantidadSembrada, 0),
        pl_siembra: plSiembra !== null && plSiembra !== "" ? convertirNumero(plSiembra, null) : null,
        duracion_ciclo:
            duracionCiclo !== null && duracionCiclo !== ""
                ? convertirNumero(duracionCiclo, null)
                : null,
        estado: convertirTexto(siembraDTO.estado, "Activa"),
        produccion_kg: convertirNumero(produccionKg, 0),
        creado_por_usuario_id: creadoPorUsuarioId,
        creado_por_colaborador_id: creadoPorColaboradorId,
    };
}

function aplicarFiltros(registros, filtros = {}) {
    const fincaId = obtenerValor(filtros, ["fincaId", "finca_id"], null);
    const estanqueId = obtenerValor(filtros, ["estanqueId", "estanque_id"], null);
    const estado = obtenerValor(filtros, ["estado"], null);
    const precriaId = obtenerValor(filtros, ["precriaId", "precria_id"], null);

    return registros.filter((item) => {
        const coincideFinca = fincaId ? Number(item.fincaId) === Number(fincaId) : true;
        const coincideEstanque = estanqueId ? Number(item.estanqueId) === Number(estanqueId) : true;
        const coincideEstado = estado ? String(item.estado) === String(estado) : true;
        const coincidePrecria = precriaId ? Number(item.precriaId) === Number(precriaId) : true;

        return coincideFinca && coincideEstanque && coincideEstado && coincidePrecria;
    });
}

/*
============================================================
OPERACIONES LOCALES
============================================================
*/

async function getAll(filtros = {}) {
    try {
        const respuesta = await ejecutarMetodoSiembras("obtenerTodos");
        const data = obtenerDataRespuesta(respuesta);
        const registros = Array.isArray(data) ? data : [];

        return aplicarFiltros(
            registros.map(mapearSiembraDesdeLocal).filter(Boolean),
            filtros
        );
    } catch (error) {
        console.error("Error al obtener siembras locales", extraerError(error));
        throw error;
    }
}

async function getById(id) {
    try {
        const respuesta = await ejecutarMetodoSiembras("obtenerPorId", [id]);

        return mapearSiembraDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al obtener la siembra local", extraerError(error));
        throw error;
    }
}

async function create(siembraDTO) {
    try {
        const datosLocales = await mapearSiembraParaLocal(siembraDTO);
        const respuesta = await ejecutarMetodoSiembras("crear", [datosLocales]);

        return mapearSiembraDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al crear la siembra local", extraerError(error));
        throw error;
    }
}

async function update(id, siembraDTO) {
    try {
        const datosLocales = await mapearSiembraParaLocal(siembraDTO);
        const respuesta = await ejecutarMetodoSiembras("actualizar", [
            id,
            datosLocales,
        ]);

        return mapearSiembraDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al actualizar la siembra local", extraerError(error));
        throw error;
    }
}

async function deleteById(id) {
    try {
        const respuesta = await ejecutarMetodoSiembras("eliminar", [id]);

        return mapearSiembraDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al eliminar la siembra local", extraerError(error));
        throw error;
    }
}

async function finalizar(id) {
    try {
        // Obtener raleos asociados a la siembra para sumar kg_retirados
        const raleosRespuesta = await localApi.raleos.obtenerTodos({ siembra_id: id });
        const raleos = obtenerDataRespuesta(raleosRespuesta) || [];
        
        const produccionKg = raleos.reduce((total, raleo) => {
            return total + (Number(raleo.kg_retirados) || 0);
        }, 0);

        const respuesta = await ejecutarMetodoSiembras("actualizar", [
            id,
            { estado: "Finalizada", produccion_kg: produccionKg },
        ]);

        return mapearSiembraDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al finalizar la siembra local", extraerError(error));
        throw error;
    }
}

/*
============================================================
EXPORT
============================================================
*/

const SiembraLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
    finalizar,
};

export default SiembraLocalService;
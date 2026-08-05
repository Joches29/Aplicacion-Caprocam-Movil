/**
 * ============================================================
 * SERVICE LOCAL DE RALEO
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de raleo
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

const OBJETIVO_RALEO = [
    "Comercializacion",
    "Reduccion de densidad",
    "Resiembra en otro estanque",
]

const METODO_EXTRACCION = [
    "Atarraya",
    "Red de arrastre",
    "Boleo",
    "Trampa selectiva",
]

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

async function ejecutarMetodoRaleo(tipoMetodo, argumentos = []) {
    const apiRaleos = localApi.raleos;

    if (!apiRaleos) {
        throw new Error("localApi.raleos no esta disponible.");
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (typeof apiRaleos[nombreMetodo] === "function") {
            return await apiRaleos[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local para raleos: ${tipoMetodo}`);
}

/*
============================================================
MAPEADORES
============================================================
*/

function mapearRaleoDesdeLocal(registro) {
    return registro
        ? {
            id: obtenerValor(registro, ["id"], null),
            servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
            uuid: obtenerValor(registro, ["uuid"], ""),

            grupoDatos: obtenerValor(registro,["grupo_datos", "grupoDatos"],null),
            fincaId: obtenerValor(registro,["finca_id", "fincaId"],null),
            estanqueId: obtenerValor(registro,["estanque_id", "estanqueId"],null),
            colaboradorId: obtenerValor(registro,["colaborador_id", "colaboradorId"],null),
            fecha: obtenerValor(registro,["fecha"],""),
            porcentaje: obtenerValor(registro,["porcentaje"],null),
            pesoEstimado: obtenerValor(registro,["peso_estimado", "pesoEstimado"],0),
            biomasaEstimada: obtenerValor(registro,["biomasa_estimada", "biomasaEstimada"],0),

            objetivo: obtenerValor(registro,["objetivo"],""),
            metodo: obtenerValor(registro,["metodos", "metodo"],""),

            observaciones: obtenerValor(registro,["observaciones"],""),

            activo: obtenerValor(registro,["activo"],1),
            sincronizado: obtenerValor(registro,["sincronizado"],0),
            pendienteSync: obtenerValor(registro,["pendiente_sync", "pendienteSync"],1),
            accionSync: obtenerValor(registro,["accion_sync", "accionSync"],null),
            fechaSync: obtenerValor(registro,["fecha_sync", "fechaSync"],null),
            fechaCreacion: obtenerValor( registro,["fecha_creacion", "fechaCreacion"],null),
            fechaActualizacion: obtenerValor(registro,["fecha_actualizacion", "fechaActualizacion"],null),
        }
        : null;
}

async function mapearRaleoParaLocal(raleoDTO) {
    const contexto = await obtenerContextoLocal();

    const grupoDatos = obtenerValor(
        raleoDTO,
        ["grupoDatos", "grupo_datos"],
        contexto.grupoDatos
    );

    const fincaId = obtenerValor(
        raleoDTO,
        ["fincaId", "finca_id", "idFinca"],
        null
    );

    const estanqueId = obtenerValor(
        raleoDTO,
        ["estanqueId", "estanque_id", "idEstanque"],
        null
    );

    const colaboradorId = obtenerValor(
        raleoDTO,
        ["colaboradorId","colaborador_id","idColaborador"],
        contexto.colaboradorId
    );

    const fecha = obtenerValor(
        raleoDTO,
        ["fecha"],
        ""
    );

    const creadoPorColaboradorId = obtenerValor(
        raleoDTO,
        ["creadoPorColaboradorId","creado_por_colaborador_id"],
        contexto.colaboradorId
    );

    const creadoPorUsuarioId = obtenerValor(
        raleoDTO,
        ["creadoPorUsuarioId","creado_por_usuario_id"],
        null
    );

    return {
        grupo_datos: convertirNumero(grupoDatos,contexto.grupoDatos),
        finca_id: convertirNumero(fincaId,null),
        estanque_id: convertirNumero(estanqueId,null),
        colaborador_id: convertirNumero(colaboradorId,null),
        fecha: convertirTexto(fecha),
        porcentaje: convertirTexto(obtenerValor(raleoDTO,["porcentaje","porcentajeRaleo"],"")),
        peso_estimado: convertirNumero(obtenerValor(raleoDTO,["pesoEstimado","peso_estimado","pesoPromedio"],0),0),
        biomasa_estimada: convertirNumero(obtenerValor(raleoDTO,["biomasaEstimada","biomasa_estimada","biomasaActual"],0),0),
        objetivo: convertirTexto(obtenerValor(raleoDTO,["objetivo"],"")),
        metodos: convertirTexto(obtenerValor(raleoDTO,["metodo","metodos"],"")),
        observaciones: convertirTexto(obtenerValor(raleoDTO,["observaciones"],"")).trim(),
        creado_por_usuario_id: creadoPorUsuarioId,
        creado_por_colaborador_id: creadoPorColaboradorId,
    };
}

function aplicarFiltros(registros, filtros = {}) {
    const fincaId = obtenerValor(filtros,["fincaId", "finca_id"],null);
    const estanqueId = obtenerValor(filtros,["estanqueId", "estanque_id"],null);
    const colaboradorId = obtenerValor(filtros,["colaboradorId", "colaborador_id"],null);
    const objetivo = obtenerValor(filtros,["objetivo"],null);
    const metodo = obtenerValor(filtros,["metodo","metodos"],null);

    return registros.filter((item) => {
        const coincideFinca =fincaId? Number(item.fincaId) === Number(fincaId): true;
        const coincideEstanque =estanqueId? Number(item.estanqueId) === Number(estanqueId): true;
        const coincideColaborador =colaboradorId? Number(item.colaboradorId) === Number(colaboradorId): true
        const coincideObjetivo =objetivo? String(item.objetivo) === String(objetivo): true;
        const coincideMetodo =metodo? String(item.metodo) === String(metodo): true;

        return (coincideFinca &&coincideEstanque &&coincideColaborador &&coincideObjetivo &&coincideMetodo);
    });
}

/*
============================================================
OPERACIONES LOCALES
============================================================
*/

async function getAll(filtros = {}) {
    try {
        const respuesta = await ejecutarMetodoRaleo("obtenerTodos");
        const data = obtenerDataRespuesta(respuesta);
        const registros =Array.isArray(data)? data: [];

        return aplicarFiltros(
            registros.map(mapearRaleoDesdeLocal).filter(Boolean),
            filtros
        );
    } catch (error) {
        console.error("Error al obtener raleos locales",extraerError(error));
        throw error;
    }
}

async function getById(id) {
    try {
        const respuesta = await ejecutarMetodoRaleo("obtenerPorId",[id]);

        return mapearRaleoDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al obtener el raleo local",extraerError(error));
        throw error;
    }
}

async function create(raleoDTO) {
    try {
        const datosLocales =await mapearRaleoParaLocal(raleoDTO);
        const respuesta =await ejecutarMetodoRaleo("crear",[datosLocales]);
        return mapearRaleoDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch(error) {
        console.error("Error al crear el raleo local",extraerError(error));
        throw error;
    }
}

async function update(id, raleoDTO) {
    try {
        const datosLocales = await mapearRaleoParaLocal(raleoDTO);
        const respuesta = await ejecutarMetodoRaleo("actualizar",[
            id,
            datosLocales
        ]);

        return mapearRaleoDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch(error) {
        console.error("Error al actualizar el raleo local",extraerError(error));
        throw error;
    }
}

async function deleteById(id) {
    try {
        const respuesta =await ejecutarMetodoRaleo("eliminar",[id]);

        return mapearRaleoDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch(error) {
        console.error("Error al eliminar el raleo local",extraerError(error));
        throw error;
    }
}

async function getObjetivos() {
    return OBJETIVO_RALEO;
}

async function getMetodos() {
    return METODO_EXTRACCION;
}

/*
============================================================
EXPORT
============================================================
*/

const RaleosLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
    getObjetivos,
    getMetodos,
};

export default RaleosLocalService;
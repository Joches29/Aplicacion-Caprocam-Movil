/**
 * ============================================================
 * SERVICE LOCAL DE LOTE DE LARVA
 * ============================================================
 *
 * Centraliza las operaciones locales del Lote de Larva usando
 * SQLite. El Lote de Larva se crea siempre primero, antes de
 * una Siembra o Pre-Cria, porque ambas dependen de su id
 * (lote_larva_id).
 *
 * Sigue el mismo patron que EnfermedadesLocal.service.js /
 * SiembraLocal.services.js.
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

async function ejecutarMetodoLotes(tipoMetodo, argumentos = []) {
    const apiLotes = localApi.lotesLarva;

    if (!apiLotes) {
        throw new Error("localApi.lotesLarva no esta disponible.");
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (typeof apiLotes[nombreMetodo] === "function") {
            return await apiLotes[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local para lotes_larva: ${tipoMetodo}`);
}

/*
============================================================
MAPEADORES
============================================================
*/

function mapearLoteDesdeLocal(registro) {
    return registro
        ? {
            id: obtenerValor(registro, ["id"], null),
            servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
            uuid: obtenerValor(registro, ["uuid"], ""),
            grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

            codigoLote: obtenerValor(registro, ["codigo_lote", "codigoLote"], ""),
            proveedorLarvaId: obtenerValor(
                registro,
                ["proveedor_larva_id", "proveedorLarvaId"],
                null
            ),
            laboratorioId: obtenerValor(registro, ["laboratorio_id", "laboratorioId"], null),
            procedenciaId: obtenerValor(registro, ["procedencia_id", "procedenciaId"], null),
            certificadoLarva: obtenerValor(
                registro,
                ["certificado_larva", "certificadoLarva"],
                ""
            ),
            plInicial: obtenerValor(registro, ["pl_inicial", "plInicial"], null),
            cantidadInicial: obtenerValor(
                registro,
                ["cantidad_inicial", "cantidadInicial"],
                0
            ),
            fechaIngreso: obtenerValor(registro, ["fecha_ingreso", "fechaIngreso"], ""),
            estadoLote: obtenerValor(registro, ["estado_lote", "estadoLote"], "Disponible"),

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

async function mapearLoteParaLocal(loteDTO) {
    const contexto = await obtenerContextoLocal();

    const grupoDatos = obtenerValor(
        loteDTO,
        ["grupoDatos", "grupo_datos"],
        contexto.grupoDatos
    );

    const proveedorLarvaId = obtenerValor(
        loteDTO,
        ["proveedorLarvaId", "proveedor_larva_id", "proveedorLarva", "proveedor_id"],
        null
    );

    const laboratorioId = obtenerValor(
        loteDTO,
        ["laboratorioId", "laboratorio_id", "laboratorioLarva", "laboratorio"],
        null
    );

    const procedenciaId = obtenerValor(
        loteDTO,
        ["procedenciaId", "procedencia_id", "procedenciaLarva", "procedencia"],
        null
    );

    const plInicial = obtenerValor(
        loteDTO,
        ["plInicial", "pl_inicial"],
        null
    );

    const cantidadInicial = obtenerValor(
        loteDTO,
        ["cantidadInicial", "cantidad_inicial"],
        0
    );

    const fechaIngreso = obtenerValor(
        loteDTO,
        ["fechaIngreso", "fecha_ingreso"],
        ""
    );

    const creadoPorColaboradorId = obtenerValor(
        loteDTO,
        ["creadoPorColaboradorId", "creado_por_colaborador_id"],
        contexto.colaboradorId
    );

    const creadoPorUsuarioId = obtenerValor(
        loteDTO,
        ["creadoPorUsuarioId", "creado_por_usuario_id"],
        null
    );

    return {
        grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
        codigo_lote: convertirTexto(loteDTO.codigoLote || loteDTO.codigo_lote).trim(),
        proveedor_larva_id: proveedorLarvaId !== null && proveedorLarvaId !== "" ? convertirNumero(proveedorLarvaId, null) : null,
        laboratorio_id: laboratorioId !== null && laboratorioId !== "" ? convertirNumero(laboratorioId, null) : null,
        procedencia_id: procedenciaId !== null && procedenciaId !== "" ? convertirNumero(procedenciaId, null) : null,
        certificado_larva: convertirTexto(loteDTO.certificadoLarva || loteDTO.certificado_larva).trim(),
        pl_inicial: plInicial !== null && plInicial !== "" ? convertirNumero(plInicial, null) : null,
        cantidad_inicial: convertirNumero(cantidadInicial, 0),
        fecha_ingreso: convertirTexto(fechaIngreso),
        estado_lote: convertirTexto(loteDTO.estadoLote || loteDTO.estado_lote, "Disponible"),
        creado_por_usuario_id: creadoPorUsuarioId,
        creado_por_colaborador_id: creadoPorColaboradorId,
    };
}

/*
============================================================
OPERACIONES LOCALES
============================================================
*/

async function getAll() {
    try {
        const respuesta = await ejecutarMetodoLotes("obtenerTodos");
        const data = obtenerDataRespuesta(respuesta);
        const registros = Array.isArray(data) ? data : [];

        return registros.map(mapearLoteDesdeLocal).filter(Boolean);
    } catch (error) {
        console.error("Error al obtener lotes de larva locales", extraerError(error));
        throw error;
    }
}

async function getById(id) {
    try {
        const respuesta = await ejecutarMetodoLotes("obtenerPorId", [id]);

        return mapearLoteDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al obtener el lote de larva local", extraerError(error));
        throw error;
    }
}

async function create(loteDTO) {
    try {
        const datosLocales = await mapearLoteParaLocal(loteDTO);
        const respuesta = await ejecutarMetodoLotes("crear", [datosLocales]);

        return mapearLoteDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al crear el lote de larva local", extraerError(error));
        throw error;
    }
}

async function update(id, loteDTO) {
    try {
        const datosLocales = await mapearLoteParaLocal(loteDTO);
        const respuesta = await ejecutarMetodoLotes("actualizar", [
            id,
            datosLocales,
        ]);

        return mapearLoteDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al actualizar el lote de larva local", extraerError(error));
        throw error;
    }
}

async function deleteById(id) {
    try {
        const respuesta = await ejecutarMetodoLotes("eliminar", [id]);

        return mapearLoteDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al eliminar el lote de larva local", extraerError(error));
        throw error;
    }
}

/*
============================================================
EXPORT
============================================================
*/

const LoteLarvaLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
};

export default LoteLarvaLocalService;
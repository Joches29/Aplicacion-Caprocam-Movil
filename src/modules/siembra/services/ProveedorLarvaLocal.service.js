/**
 * ============================================================
 * SERVICE LOCAL DE PROVEEDOR DE LARVA
 * ============================================================
 *
 * Centraliza las operaciones locales del catalogo de
 * procedencias usando SQLite. Reemplaza el uso directo del
 * backend real (proveedorLarva.service.js) para que el modal
 * "Agregar nuevo" de DatosLarvaSection funcione tambien offline.
 *
 * Sigue el mismo patron que LoteLarvaLocal.service.js /
 * EnfermedadesLocal.service.js.
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

async function ejecutarMetodoProveedoresLarva(tipoMetodo, argumentos = []) {
    const apiProveedoresLarva = localApi.proveedoresLarva;

    if (!apiProveedoresLarva) {
        throw new Error("localApi.proveedoresLarva no esta disponible.");
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (typeof apiProveedoresLarva[nombreMetodo] === "function") {
            return await apiProveedoresLarva[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local para proveedores_larva: ${tipoMetodo}`);
}

/*
============================================================
MAPEADORES
============================================================
*/

function mapearProveedorLarvaDesdeLocal(registro) {
    return registro
        ? {
            id: obtenerValor(registro, ["id"], null),
            servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
            uuid: obtenerValor(registro, ["uuid"], ""),
            grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

            // El backend real devuelve {id, nombre}; los Select del
            // proyecto y useCatalogoModal esperan poder mapear a
            // {label, value} a partir de "nombre"/"id" (ver mapCatalogo
            // en useNuevaSiembra.js).
            nombre: obtenerValor(registro, ["nombre"], ""),
            descripcion: obtenerValor(registro, ["descripcion"], ""),

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

async function mapearProveedorLarvaParaLocal(proveedorLarvaDTO) {
    const contexto = await obtenerContextoLocal();

    const grupoDatos = obtenerValor(
        proveedorLarvaDTO,
        ["grupoDatos", "grupo_datos"],
        contexto.grupoDatos
    );

    const nombre = obtenerValor(proveedorLarvaDTO, ["nombre"], "");
    const descripcion = obtenerValor(proveedorLarvaDTO, ["descripcion"], "");

    const creadoPorColaboradorId = obtenerValor(
        proveedorLarvaDTO,
        ["creadoPorColaboradorId", "creado_por_colaborador_id"],
        contexto.colaboradorId
    );

    const creadoPorUsuarioId = obtenerValor(
        proveedorLarvaDTO,
        ["creadoPorUsuarioId", "creado_por_usuario_id"],
        null
    );

    return {
        grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
        nombre: convertirTexto(nombre).trim(),
        descripcion: convertirTexto(descripcion).trim(),
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
        const respuesta = await ejecutarMetodoProveedoresLarva("obtenerTodos");
        const data = obtenerDataRespuesta(respuesta);
        const registros = Array.isArray(data) ? data : [];

        return registros.map(mapearProveedorLarvaDesdeLocal).filter(Boolean);
    } catch (error) {
        console.error("Error al obtener proveedores de larva locales", extraerError(error));
        throw error;
    }
}

async function getById(id) {
    try {
        const respuesta = await ejecutarMetodoProveedoresLarva("obtenerPorId", [id]);

        return mapearProveedorLarvaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al obtener el proveedor de larva local", extraerError(error));
        throw error;
    }
}

async function create(proveedorLarvaDTO) {
    try {
        // Compatibilidad: useNuevaSiembra llama a createProveedorLarva(nombre)
        // con un string suelto (ver services/proveedorLarva.service.js), no
        // un DTO. Se acepta cualquiera de las dos formas.
        const datosOrigen =
            typeof proveedorLarvaDTO === "string"
                ? { nombre: proveedorLarvaDTO }
                : proveedorLarvaDTO;

        const datosLocales = await mapearProveedorLarvaParaLocal(datosOrigen);
        const respuesta = await ejecutarMetodoProveedoresLarva("crear", [datosLocales]);

        return mapearProveedorLarvaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al crear el proveedor de larva local", extraerError(error));
        throw error;
    }
}

async function update(id, proveedorLarvaDTO) {
    try {
        const datosOrigen =
            typeof proveedorLarvaDTO === "string"
                ? { nombre: proveedorLarvaDTO }
                : proveedorLarvaDTO;

        const datosLocales = await mapearProveedorLarvaParaLocal(datosOrigen);
        const respuesta = await ejecutarMetodoProveedoresLarva("actualizar", [
            id,
            datosLocales,
        ]);

        return mapearProveedorLarvaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al actualizar el proveedor de larva local", extraerError(error));
        throw error;
    }
}

async function deleteById(id) {
    try {
        const respuesta = await ejecutarMetodoProveedoresLarva("eliminar", [id]);

        return mapearProveedorLarvaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al eliminar el proveedor de larva local", extraerError(error));
        throw error;
    }
}

/*
============================================================
EXPORT
============================================================
*/

const ProveedorLarvaLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
};

export default ProveedorLarvaLocalService;
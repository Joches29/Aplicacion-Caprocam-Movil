/**
 * ============================================================
 * SERVICE LOCAL DE VENTAS (SQLite)
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de ventas
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

async function ejecutarMetodoVentas(tipoMetodo, argumentos = []) {
    const apiVentas = localApi.ventas;

    if (!apiVentas) {
        throw new Error("localApi.ventas no está disponible.");
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];
        if (typeof apiVentas[nombreMetodo] === "function") {
            return await apiVentas[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe método local para ventas: ${tipoMetodo}`);
}

/*
============================================================
MAPEO LOCAL A BACKEND
============================================================
*/
function mapearVentaDesdeLocal(registro) {
    return registro
        ? {
            id: obtenerValor(registro, ["id"], null),
            servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
            uuid: obtenerValor(registro, ["uuid"], ""),
            grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

            finca: obtenerValor(registro, ["finca_id", "fincaId"], null),
            estanque: obtenerValor(registro, ["estanque_id", "estanqueId"], null),
            colaborador: obtenerValor(registro, ["colaborador_id", "colaboradorId"], null),
            comprador: obtenerValor(registro, ["comprador_id", "compradorId"], null),

            pesoPromedio: obtenerValor(registro, ["peso_promedio", "pesoPromedio"], 0),
            tamanoPromedio: obtenerValor(registro, ["tamano_promedio", "tamanoPromedio"], 0),
            cantVendida: obtenerValor(registro, ["cantidad_vendida", "cantVendida"], 0),
            precioKilo: obtenerValor(registro, ["precio_kilo", "precioKilo"], 0),
            total: obtenerValor(registro, ["total"], 0),
            fecha: obtenerValor(registro, ["fecha"], ""),

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

async function mapearVentaParaLocal(ventaDTO) {
    const contexto = await obtenerContextoLocal();

    const grupoDatos = obtenerValor(ventaDTO, ["grupoDatos", "grupo_datos"], contexto.grupoDatos);
    const fincaId = obtenerValor(ventaDTO, ["finca", "fincaId", "finca_id"], null);
    const estanqueId = obtenerValor(ventaDTO, ["estanque", "estanqueId", "estanque_id"], null);
    const colaboradorId = obtenerValor(ventaDTO, ["colaborador", "colaboradorId", "colaborador_id"], contexto.colaboradorId);
    const compradorId = obtenerValor(ventaDTO, ["comprador", "compradorId", "comprador_id"], null);

    const cantVendida = obtenerValor(ventaDTO, ["cantVendida", "cantidad_vendida"], 0);
    const precioKilo = obtenerValor(ventaDTO, ["precioKilo", "precio_kilo"], 0);

    return {
        grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
        finca_id: convertirNumero(fincaId, null),
        estanque_id: convertirNumero(estanqueId, null),
        colaborador_id: colaboradorId ? convertirNumero(colaboradorId, null) : null,
        comprador_id: compradorId ? convertirNumero(compradorId, null) : null,
        peso_promedio: Number(obtenerValor(ventaDTO, ["pesoPromedio", "peso_promedio"], 0)),
        tamano_promedio: Number(obtenerValor(ventaDTO, ["tamanoPromedio", "tamano_promedio"], 0)),
        cantidad_vendida: Number(cantVendida),
        precio_kilo: Number(precioKilo),
        total: Number(cantVendida) * Number(precioKilo),
        fecha: convertirTexto(ventaDTO.fecha),
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
        const respuesta = await ejecutarMetodoVentas("obtenerTodos");
        const data = obtenerDataRespuesta(respuesta);
        const registros = Array.isArray(data) ? data : [];

        // Filtro local simple en memoria por Finca y Estanque si se requiere
        return registros
            .map(mapearVentaDesdeLocal)
            .filter(Boolean)
            .filter((item) => {
                const coincideFinca = filtros.finca ? Number(item.finca) === Number(filtros.finca) : true;
                const coincideEstanque = filtros.estanque ? Number(item.estanque) === Number(filtros.estanque) : true;
                return coincideFinca && coincideEstanque;
            });
    } catch (error) {
        console.error("Error al obtener ventas locales", extraerError(error));
        throw error;
    }
}

async function getById(id) {
    try {
        const respuesta = await ejecutarMetodoVentas("obtenerPorId", [id]);
        return mapearVentaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al obtener venta local por ID", extraerError(error));
        throw error;
    }
}

async function create(ventaDTO) {
    try {
        const datosLocales = await mapearVentaParaLocal(ventaDTO);
        const respuesta = await ejecutarMetodoVentas("crear", [datosLocales]);
        return mapearVentaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al crear venta local", extraerError(error));
        throw error;
    }
}

async function update(id, ventaDTO) {
    try {
        const datosLocales = await mapearVentaParaLocal(ventaDTO);
        const respuesta = await ejecutarMetodoVentas("actualizar", [id, datosLocales]);
        return mapearVentaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al actualizar venta local", extraerError(error));
        throw error;
    }
}

async function deleteById(id) {
    try {
        const respuesta = await ejecutarMetodoVentas("eliminar", [id]);
        return mapearVentaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al eliminar venta local", extraerError(error));
        throw error;
    }
}

/*
============================================================
EXPORT
============================================================
*/

const VentasLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
};

export default VentasLocalService;
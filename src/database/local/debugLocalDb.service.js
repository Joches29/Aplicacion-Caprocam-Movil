/**
 * ============================================================
 * SERVICE DEBUG DE BASE LOCAL
 * ============================================================
 *
 * Permite revisar en consola que tablas existen en SQLite,
 * que columnas tienen y que registros hay dentro.
 *
 * Este archivo es solo para pruebas/debug.
 */

import { obtenerBaseLocal } from "./sqlite.database";
import { exitoLocal, errorLocal } from "./respuestaLocal";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const TABLAS_SISTEMA = [
    "sqlite_sequence",
    "android_metadata",
];

const CAMPOS_SENSIBLES = [
    "password_hash",
    "pin_hash",
    "token",
    "refresh_token",
];

/*
//////////////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////////////
*/

const esTablaValida = (tabla) => {
    return /^[a-zA-Z0-9_]+$/.test(String(tabla));
};

const ocultarValorSensible = (llave, valor) => {
    if (CAMPOS_SENSIBLES.includes(String(llave).toLowerCase()) && valor) {
        return "********";
    }

    return valor;
};

const limpiarRegistro = (registro) => {
    const limpio = {};

    Object.keys(registro).forEach((llave) => {
        limpio[llave] = ocultarValorSensible(llave, registro[llave]);
    });

    return limpio;
};

const limpiarRegistros = (registros) => {
    if (!Array.isArray(registros)) {
        return [];
    }

    return registros.map((registro) => {
        return limpiarRegistro(registro);
    });
};

/*
//////////////////////////////////////////////////////////
CONSULTAS BASE
//////////////////////////////////////////////////////////
*/

export const obtenerTablasLocalesDebug = async () => {
    try {
        const db = await obtenerBaseLocal();

        const tablas = await db.getAllAsync(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name ASC
        `);

        const resultado = tablas
            .map((item) => {
                return item.name;
            })
            .filter((nombre) => {
                return !TABLAS_SISTEMA.includes(nombre);
            })
            .filter((nombre) => {
                return !String(nombre).startsWith("sqlite_");
            });

        return exitoLocal("Tablas locales obtenidas correctamente.", resultado);
    } catch (error) {
        return errorLocal("Error al obtener tablas locales.", error);
    }
};

export const obtenerColumnasTablaDebug = async (tabla) => {
    try {
        if (!esTablaValida(tabla)) {
            return errorLocal("Nombre de tabla no valido.", tabla);
        }

        const db = await obtenerBaseLocal();

        const columnas = await db.getAllAsync(`PRAGMA table_info(${tabla})`);

        return exitoLocal("Columnas de tabla obtenidas correctamente.", columnas);
    } catch (error) {
        return errorLocal("Error al obtener columnas de la tabla.", error);
    }
};

export const obtenerRegistrosTablaDebug = async (tabla, limite = 10) => {
    try {
        if (!esTablaValida(tabla)) {
            return errorLocal("Nombre de tabla no valido.", tabla);
        }

        const db = await obtenerBaseLocal();
        const limiteSeguro = Number(limite) > 0 ? Number(limite) : 10;

        const registros = await db.getAllAsync(
            `SELECT * FROM ${tabla} ORDER BY id DESC LIMIT ?`,
            [limiteSeguro]
        );

        return exitoLocal(
            "Registros de tabla obtenidos correctamente.",
            limpiarRegistros(registros)
        );
    } catch (error) {
        return errorLocal("Error al obtener registros de la tabla.", error);
    }
};

export const contarRegistrosTablaDebug = async (tabla) => {
    try {
        if (!esTablaValida(tabla)) {
            return errorLocal("Nombre de tabla no valido.", tabla);
        }

        const db = await obtenerBaseLocal();

        const resultado = await db.getFirstAsync(
            `SELECT COUNT(*) AS total FROM ${tabla}`
        );

        return exitoLocal("Total de registros obtenido correctamente.", {
            tabla: tabla,
            total: resultado?.total ?? 0,
        });
    } catch (error) {
        return errorLocal("Error al contar registros de la tabla.", error);
    }
};

/*
//////////////////////////////////////////////////////////
RESUMEN COMPLETO
//////////////////////////////////////////////////////////
*/

export const obtenerResumenBaseLocalDebug = async (
    limitePorTabla = 5,
    soloConRegistros = false
) => {
    try {
        const tablasRespuesta = await obtenerTablasLocalesDebug();

        if (!tablasRespuesta.success) {
            return tablasRespuesta;
        }

        const tablas = tablasRespuesta.data;
        const resumen = [];

        for (let i = 0; i < tablas.length; i += 1) {
            const tabla = tablas[i];

            const columnasRespuesta = await obtenerColumnasTablaDebug(tabla);
            const totalRespuesta = await contarRegistrosTablaDebug(tabla);
            const totalRegistros = totalRespuesta.data?.total ?? 0;

            if (soloConRegistros && totalRegistros === 0) {
                continue;
            }

            const registrosRespuesta = await obtenerRegistrosTablaDebug(
                tabla,
                limitePorTabla
            );

            resumen.push({
                tabla: tabla,
                totalRegistros: totalRegistros,
                columnas: columnasRespuesta.success
                    ? columnasRespuesta.data.map((columna) => {
                        return columna.name;
                    })
                    : [],
                registros: registrosRespuesta.success
                    ? registrosRespuesta.data
                    : [],
            });
        }

        return exitoLocal(
            soloConRegistros
                ? "Resumen de tablas con registros obtenido correctamente."
                : "Resumen de base local obtenido correctamente.",
            resumen
        );
    } catch (error) {
        return errorLocal("Error al obtener resumen de base local.", error);
    }
};

export const obtenerPendientesSyncDebug = async () => {
    try {
        const tablasRespuesta = await obtenerTablasLocalesDebug();

        if (!tablasRespuesta.success) {
            return tablasRespuesta;
        }

        const db = await obtenerBaseLocal();
        const tablas = tablasRespuesta.data;
        const pendientes = [];

        for (let i = 0; i < tablas.length; i += 1) {
            const tabla = tablas[i];

            const columnasRespuesta = await obtenerColumnasTablaDebug(tabla);
            const columnas = columnasRespuesta.success
                ? columnasRespuesta.data.map((columna) => {
                    return columna.name;
                })
                : [];

            if (!columnas.includes("pendiente_sync")) {
                continue;
            }

            const registros = await db.getAllAsync(
                `SELECT * FROM ${tabla} WHERE pendiente_sync = 1 ORDER BY id DESC`
            );

            if (registros.length > 0) {
                pendientes.push({
                    tabla: tabla,
                    total: registros.length,
                    registros: limpiarRegistros(registros),
                });
            }
        }

        return exitoLocal(
            "Pendientes de sincronizacion obtenidos correctamente.",
            pendientes
        );
    } catch (error) {
        return errorLocal("Error al obtener pendientes de sincronizacion.", error);
    }
};

/*
//////////////////////////////////////////////////////////
IMPRESION EN CONSOLA
//////////////////////////////////////////////////////////
*/

export const imprimirBaseLocalDebug = async (limitePorTabla = 5) => {
    const respuesta = await obtenerResumenBaseLocalDebug(limitePorTabla);

    console.log("======================================");
    console.log("DEBUG SQLITE LOCAL");
    console.log("======================================");
    console.log(JSON.stringify(respuesta, null, 2));
    console.log("======================================");

    return respuesta;
};

export const imprimirBaseLocalConRegistrosDebug = async (limitePorTabla = 5) => {
    const respuesta = await obtenerResumenBaseLocalDebug(limitePorTabla, true);

    console.log("======================================");
    console.log("DEBUG SQLITE LOCAL - SOLO TABLAS CON REGISTROS");
    console.log("======================================");
    console.log(JSON.stringify(respuesta, null, 2));
    console.log("======================================");

    return respuesta;
};

export const imprimirPendientesSyncDebug = async () => {
    const respuesta = await obtenerPendientesSyncDebug();

    console.log("======================================");
    console.log("DEBUG PENDIENTES SYNC");
    console.log("======================================");
    console.log(JSON.stringify(respuesta, null, 2));
    console.log("======================================");

    return respuesta;
};

/*
//////////////////////////////////////////////////////////
EXPORT DEFAULT
//////////////////////////////////////////////////////////
*/

const DebugLocalDbService = {
    obtenerTablasLocalesDebug,
    obtenerColumnasTablaDebug,
    obtenerRegistrosTablaDebug,
    contarRegistrosTablaDebug,
    obtenerResumenBaseLocalDebug,
    obtenerPendientesSyncDebug,
    imprimirBaseLocalDebug,
    imprimirBaseLocalConRegistrosDebug,
    imprimirPendientesSyncDebug,
};

export default DebugLocalDbService;
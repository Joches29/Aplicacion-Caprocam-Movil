/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: respuestaLocal.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 03/08/2026
Modulo: Database Local
Descripcion:
Helper para respuestas locales estandarizadas de SQLite
usando el mismo formato de respuesta del backend.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Respuesta exitosa local.
 * @param {string} message - Mensaje descriptivo del resultado.
 * @param {*} data - Datos de respuesta.
 * @returns {object} Respuesta estandar local.
 */
export const exitoLocal = (message, data = null) => {
    return {
        success: true,
        message: message,
        data: data
    };
};

/**
 * Respuesta de error local.
 * @param {string} message - Mensaje descriptivo del error.
 * @param {*} err - Error capturado o texto descriptivo.
 * @returns {object} Respuesta estandar local.
 */
export const errorLocal = (message, err = null) => {
    let detalleError = err;

    if (err && err.message) {
        detalleError = err.message;
    }

    console.error(`[SQLite Error] ${message}:`, err || "");

    return {
        success: false,
        message: message,
        error: detalleError
    };
};
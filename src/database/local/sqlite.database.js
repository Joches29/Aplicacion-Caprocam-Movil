/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: sqlite.database.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 03/08/2026
Modulo: Database Local
Descripcion:
Configura la conexion local a SQLite para la app movil.
Centraliza la apertura de la base de datos local que se
usara para trabajar sin conexion.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import * as SQLite from "expo-sqlite";

/*
//////////////////////////////////////////////////////////
VARIABLES GLOBALES
//////////////////////////////////////////////////////////
*/

let database = null;

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Obtiene la instancia local de SQLite.
 * @returns {Promise<object>} Instancia de base de datos SQLite.
 */
export const obtenerBaseLocal = async () => {
    if (database) {
        return database;
    }

    database = await SQLite.openDatabaseAsync("caprocam_movil_local.db");

    await database.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = OFF;
    `);

    return database;
};

/**
 * Cierra la conexion local si existe.
 * @returns {Promise<void>} No retorna datos.
 */
export const cerrarBaseLocal = async () => {
    if (!database) {
        return;
    }

    await database.closeAsync();

    database = null;
};
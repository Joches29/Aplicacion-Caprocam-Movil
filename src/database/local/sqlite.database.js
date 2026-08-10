/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: sqlite.database.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 10/08/2026
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
CONSTANTES
//////////////////////////////////////////////////////////
*/

const NOMBRE_BASE_LOCAL = "caprocam_movil_local.db";

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
 * @returns {Promise} Instancia de base de datos SQLite.
 */
export const obtenerBaseLocal = async () => {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync(NOMBRE_BASE_LOCAL);

  await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = OFF;
  `);

  return database;
};

/**
 * Cierra la conexion local si existe.
 * @returns {Promise} No retorna datos.
 */
export const cerrarBaseLocal = async () => {
  if (!database) {
    return;
  }

  await database.closeAsync();

  database = null;
};

/**
 * Elimina la base SQLite local completa.
 * Uso temporal para actualizar el schema local durante pruebas.
 * @returns {Promise} No retorna datos.
 */
export const eliminarBaseLocal = async () => {
  try {
    if (database) {
      await database.closeAsync();
    }
  } catch (error) {
    console.log("No se pudo cerrar la base local antes de eliminar:", error);
  }

  database = null;

  await SQLite.deleteDatabaseAsync(NOMBRE_BASE_LOCAL);
};
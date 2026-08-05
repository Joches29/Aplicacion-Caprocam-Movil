/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: sessionUtils.js
Autor: Rodolfo
Fecha: 04/08/2026
Modulo: Shared / Utils
Descripcion:
Helper para leer los datos de sesion offline del colaborador
activo almacenados en AsyncStorage. Provee grupo_datos y
creado_por_colaborador_id para los services locales.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import AsyncStorage from "@react-native-async-storage/async-storage";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const STORAGE_COLABORADOR_ACTUAL = "caprocam_colaborador_actual";
const STORAGE_GRUPO_DATOS = "caprocam_grupo_datos";
const STORAGE_FINCA_ID = "caprocam_finca_id";

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Obtiene el grupo_datos de la sesion offline activa.
 * @returns {Promise<number|null>} grupo_datos o null.
 */
export const obtenerGrupoDatosSesion = async () => {
    try {
        const valor = await AsyncStorage.getItem(STORAGE_GRUPO_DATOS);
        return valor !== null ? Number(valor) : null;
    } catch {
        return null;
    }
};

/**
 * Obtiene el id del colaborador activo en sesion offline.
 * @returns {Promise<number|null>} id del colaborador o null.
 */
export const obtenerColaboradorIdSesion = async () => {
    try {
        const json = await AsyncStorage.getItem(STORAGE_COLABORADOR_ACTUAL);
        if (!json) return null;
        const colaborador = JSON.parse(json);
        return colaborador?.id ?? null;
    } catch {
        return null;
    }
};

/**
 * Obtiene la finca_id del colaborador activo en sesion offline.
 * @returns {Promise<number|null>} finca_id o null.
 */
export const obtenerFincaIdSesion = async () => {
    try {
        const valor = await AsyncStorage.getItem(STORAGE_FINCA_ID);
        return valor !== null ? Number(valor) : null;
    } catch {
        return null;
    }
};

/**
 * Retorna los campos de auditoria para inserciones locales.
 * Incluye grupo_datos y creado_por_colaborador_id desde la sesion activa.
 * @returns {Promise<object>} Campos de auditoria.
 */
export const obtenerCamposAuditoria = async () => {
    const grupoDatos = await obtenerGrupoDatosSesion();
    const colaboradorId = await obtenerColaboradorIdSesion();

    return {
        grupo_datos: grupoDatos || 1,
        creado_por_colaborador_id: colaboradorId || null,
        creado_por_usuario_id: null,
    };
};

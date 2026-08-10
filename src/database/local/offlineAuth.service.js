/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: offlineAuth.service.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 10/08/2026
Modulo: Database Local
Descripcion:
Servicio para manejar el login movil offline mediante
colaboradores guardados localmente en SQLite y sesion
persistida en AsyncStorage.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from "./localApi.service";
import { exitoLocal, errorLocal } from "./respuestaLocal";

import AsyncStorage from "@react-native-async-storage/async-storage";
import bcrypt from "bcryptjs";

import { obtenerBaseLocal } from "./sqlite.database";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const STORAGE_COLABORADOR_ACTUAL = "caprocam_colaborador_actual";
const STORAGE_GRUPO_DATOS = "caprocam_grupo_datos";
const STORAGE_FINCA_ID = "caprocam_finca_id";
const STORAGE_MODO_OFFLINE = "caprocam_modo_offline";
const STORAGE_FECHA_LOGIN = "caprocam_fecha_login";

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

/**
 * Normaliza texto para busquedas locales.
 * @param {string} valor - Valor recibido.
 * @returns {string} Texto normalizado.
 */
const normalizarTexto = (valor) => {
    if (!valor) {
        return "";
    }

    return String(valor).trim().toLowerCase();
};

/**
 * Limpia datos sensibles antes de guardar sesion.
 * @param {object} colaborador - Colaborador local.
 * @returns {object} Colaborador seguro.
 */
const prepararColaboradorSesion = (colaborador) => {
    const colaboradorSesion = {
        ...colaborador
    };

    delete colaboradorSesion.pin_hash;
    delete colaboradorSesion.password_hash;

    return colaboradorSesion;
};

/**
 * Prepara un colaborador para mostrarse en el login offline.
 * @param {object} colaborador - Colaborador local.
 * @returns {object} Colaborador seguro para UI.
 */
const prepararColaboradorLogin = (colaborador) => {
    const colaboradorLogin = prepararColaboradorSesion(colaborador);
    const nombreCompleto = `${colaboradorLogin.nombre || ""} ${colaboradorLogin.apellidos || ""}`.trim();

    return {
        ...colaboradorLogin,
        nombre_completo: nombreCompleto,
        texto_busqueda: normalizarTexto(`${nombreCompleto} ${colaboradorLogin.cedula || ""} ${colaboradorLogin.nombre_usuario || ""}`)
    };
};

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Obtiene la lista de colaboradores almacenados en SQLite para el login offline.
 *
 * @returns {Promise} Respuesta local estandarizada con array de colaboradores.
 */
export const obtenerColaboradoresLoginOffline = async () => {
    try {
        if (localApi?.inicializar) {
            await localApi.inicializar();
        }

        const resultado = await localApi.colaboradores.obtenerTodos();

        if (!resultado || !resultado.success) {
            return exitoLocal("Sin colaboradores locales guardados.", []);
        }

        const colaboradores = Array.isArray(resultado.data)
            ? resultado.data.map((colaborador) => {
                return prepararColaboradorLogin(colaborador);
            })
            : [];

        return exitoLocal("Colaboradores locales obtenidos correctamente.", colaboradores);
    } catch (err) {
        const mensaje = String(err?.message || err);

        if (mensaje.includes("no such table") || mensaje.includes("prepareAsync")) {
            return exitoLocal("Base de datos inicial. Lista vacia.", []);
        }

        return errorLocal("Error al obtener colaboradores para login offline.", err);
    }
};

/**
 * Busca un colaborador por id local.
 * @param {number} colaboradorId - ID local del colaborador.
 * @returns {Promise} Respuesta local.
 */
export const obtenerColaboradorLoginPorId = async (colaboradorId) => {
    try {
        if (!colaboradorId) {
            return errorLocal("Debe seleccionar un colaborador.", "Colaborador requerido.");
        }

        const db = await obtenerBaseLocal();

        const colaborador = await db.getFirstAsync(
            `
            SELECT *
            FROM colaboradores
            WHERE id = ?
            AND activo = 1
            AND deleted_at IS NULL
            `,
            [colaboradorId]
        );

        if (!colaborador) {
            return errorLocal("Colaborador no encontrado.", "No existe el colaborador seleccionado.");
        }

        return exitoLocal("Colaborador obtenido correctamente.", colaborador);
    } catch (err) {
        return errorLocal("Error al obtener colaborador local.", err);
    }
};

/**
 * Valida el PIN del colaborador contra el pin_hash local.
 * @param {number} colaboradorId - ID local del colaborador.
 * @param {string} pin - PIN digitado.
 * @returns {Promise} Respuesta local.
 */
export const validarPinOffline = async (colaboradorId, pin) => {
    try {
        if (!pin || String(pin).trim().length === 0) {
            return errorLocal("Debe ingresar el PIN.", "PIN requerido.");
        }

        const respuestaColaborador = await obtenerColaboradorLoginPorId(colaboradorId);

        if (!respuestaColaborador.success) {
            return respuestaColaborador;
        }

        const colaborador = respuestaColaborador.data;

        if (!colaborador.pin_hash) {
            return errorLocal("El colaborador no tiene PIN configurado.", "PIN no configurado.");
        }

        const pinValido = await bcrypt.compare(String(pin), colaborador.pin_hash);

        if (!pinValido) {
            return errorLocal("PIN incorrecto.", "Credenciales invalidas.");
        }

        const colaboradorSesion = prepararColaboradorSesion(colaborador);

        await AsyncStorage.setItem(STORAGE_COLABORADOR_ACTUAL, JSON.stringify(colaboradorSesion));
        await AsyncStorage.setItem(STORAGE_GRUPO_DATOS, String(colaborador.grupo_datos));
        await AsyncStorage.setItem(STORAGE_MODO_OFFLINE, "true");
        await AsyncStorage.setItem(STORAGE_FECHA_LOGIN, new Date().toISOString());

        if (colaborador.finca_id !== null && colaborador.finca_id !== undefined) {
            await AsyncStorage.setItem(STORAGE_FINCA_ID, String(colaborador.finca_id));
        } else {
            await AsyncStorage.removeItem(STORAGE_FINCA_ID);
        }

        return exitoLocal("Login offline realizado correctamente.", colaboradorSesion);
    } catch (err) {
        return errorLocal("Error al validar PIN offline.", err);
    }
};

/**
 * Obtiene la sesion offline guardada.
 * @returns {Promise} Respuesta local.
 */
export const obtenerSesionOffline = async () => {
    try {
        const colaboradorJson = await AsyncStorage.getItem(STORAGE_COLABORADOR_ACTUAL);
        const grupoDatos = await AsyncStorage.getItem(STORAGE_GRUPO_DATOS);
        const fincaId = await AsyncStorage.getItem(STORAGE_FINCA_ID);
        const modoOffline = await AsyncStorage.getItem(STORAGE_MODO_OFFLINE);
        const fechaLogin = await AsyncStorage.getItem(STORAGE_FECHA_LOGIN);

        if (!colaboradorJson) {
            return exitoLocal("No hay sesion offline activa.", null);
        }

        const colaborador = JSON.parse(colaboradorJson);

        return exitoLocal("Sesion offline obtenida correctamente.", {
            colaborador: colaborador,
            grupoDatos: grupoDatos ? Number(grupoDatos) : null,
            fincaId: fincaId ? Number(fincaId) : null,
            modoOffline: modoOffline === "true",
            fechaLogin: fechaLogin
        });
    } catch (err) {
        return errorLocal("Error al obtener sesion offline.", err);
    }
};

/**
 * Cierra la sesion offline actual.
 * @returns {Promise} Respuesta local.
 */
export const cerrarSesionOffline = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_COLABORADOR_ACTUAL);
        await AsyncStorage.removeItem(STORAGE_GRUPO_DATOS);
        await AsyncStorage.removeItem(STORAGE_FINCA_ID);
        await AsyncStorage.removeItem(STORAGE_MODO_OFFLINE);
        await AsyncStorage.removeItem(STORAGE_FECHA_LOGIN);

        return exitoLocal("Sesion offline cerrada correctamente.", true);
    } catch (err) {
        return errorLocal("Error al cerrar sesion offline.", err);
    }
};

/**
 * Verifica si existe sesion offline activa.
 * @returns {Promise} Respuesta local.
 */
export const haySesionOffline = async () => {
    try {
        const colaboradorJson = await AsyncStorage.getItem(STORAGE_COLABORADOR_ACTUAL);

        if (!colaboradorJson) {
            return exitoLocal("No hay sesion offline activa.", false);
        }

        return exitoLocal("Existe sesion offline activa.", true);
    } catch (err) {
        return errorLocal("Error al verificar sesion offline.", err);
    }
};
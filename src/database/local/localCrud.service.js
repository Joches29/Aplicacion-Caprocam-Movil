/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: localCrud.service.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 03/08/2026
Modulo: Database Local
Descripcion:
Servicio CRUD generico para consultar, crear, actualizar
y eliminar datos locales en SQLite. Tambien prepara los
registros para futura sincronizacion con la base principal.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { obtenerBaseLocal } from "./sqlite.database";
import {
    DEFINICIONES_TABLAS,
    SENTENCIAS_SCHEMA,
    TABLAS_LOCALES,
    TABLAS_SINCRONIZABLES
} from "./sqlite.schema";
import { exitoLocal, errorLocal } from "./respuestaLocal";

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

/**
 * Genera un UUID simple para registros locales.
 * @returns {string} UUID generado.
 */
const generarUuid = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (caracter) => {
        const numero = Math.random() * 16 | 0;
        let valor = numero;

        if (caracter === "y") {
            valor = numero & 0x3 | 0x8;
        }

        return valor.toString(16);
    });
};

/**
 * Obtiene la fecha actual en formato ISO.
 * @returns {string} Fecha actual.
 */
const obtenerFechaActual = () => {
    return new Date().toISOString();
};

/**
 * Valida que una tabla exista en el esquema local.
 * @param {string} tabla - Nombre de tabla.
 */
const validarTabla = (tabla) => {
    if (!TABLAS_LOCALES.includes(tabla)) {
        throw new Error("Tabla local no permitida.");
    }
};

/**
 * Valida que una tabla sea sincronizable.
 * @param {string} tabla - Nombre de tabla.
 */
const validarTablaSincronizable = (tabla) => {
    if (!TABLAS_SINCRONIZABLES.includes(tabla)) {
        throw new Error("Tabla local no sincronizable.");
    }
};

/**
 * Filtra los datos para evitar insertar o actualizar columnas inexistentes.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} datos - Datos recibidos.
 * @returns {object} Datos filtrados.
 */
const filtrarDatosPermitidos = (tabla, datos = {}) => {
    const columnasPermitidas = DEFINICIONES_TABLAS[tabla];
    const datosFiltrados = {};

    Object.keys(datos).forEach((campo) => {
        if (columnasPermitidas.includes(campo)) {
            datosFiltrados[campo] = datos[campo];
        }
    });

    return datosFiltrados;
};

/**
 * Prepara datos base para crear registros locales.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} datos - Datos originales.
 * @returns {object} Datos preparados.
 */
const prepararDatosCreacion = (tabla, datos = {}) => {
    const fechaActual = obtenerFechaActual();

    const datosPreparados = {
        ...datos
    };

    if (!datosPreparados.uuid) {
        datosPreparados.uuid = generarUuid();
    }

    if (datosPreparados.activo === undefined) {
        datosPreparados.activo = 1;
    }

    if (!datosPreparados.fecha_creacion) {
        datosPreparados.fecha_creacion = fechaActual;
    }

    if (!datosPreparados.fecha_actualizacion) {
        datosPreparados.fecha_actualizacion = fechaActual;
    }

    if (!datosPreparados.version) {
        datosPreparados.version = 1;
    }

    if (datosPreparados.sincronizado === undefined) {
        datosPreparados.sincronizado = 0;
    }

    if (datosPreparados.pendiente_sync === undefined) {
        datosPreparados.pendiente_sync = 1;
    }

    if (!datosPreparados.accion_sync) {
        datosPreparados.accion_sync = "CREATE";
    }

    return filtrarDatosPermitidos(tabla, datosPreparados);
};

/**
 * Prepara datos base para insertar registros que vienen del backend.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} datos - Datos del backend.
 * @returns {object} Datos preparados.
 */
const prepararDatosDesdeServidor = (tabla, datos = {}) => {
    const fechaActual = obtenerFechaActual();

    const datosPreparados = {
        ...datos
    };

    if (datos.id && !datos.servidor_id) {
        datosPreparados.servidor_id = datos.id;
    }

    delete datosPreparados.id;

    if (!datosPreparados.uuid) {
        datosPreparados.uuid = generarUuid();
    }

    if (datosPreparados.activo === undefined) {
        datosPreparados.activo = 1;
    }

    if (!datosPreparados.fecha_creacion) {
        datosPreparados.fecha_creacion = fechaActual;
    }

    if (!datosPreparados.fecha_actualizacion) {
        datosPreparados.fecha_actualizacion = fechaActual;
    }

    if (!datosPreparados.version) {
        datosPreparados.version = 1;
    }

    datosPreparados.sincronizado = 1;
    datosPreparados.pendiente_sync = 0;
    datosPreparados.accion_sync = null;
    datosPreparados.fecha_sync = fechaActual;

    return filtrarDatosPermitidos(tabla, datosPreparados);
};

/**
 * Construye un WHERE dinamico con filtros permitidos.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} filtros - Filtros recibidos.
 * @returns {object} WHERE y valores.
 */
const construirWhere = (tabla, filtros = {}) => {
    const columnasPermitidas = DEFINICIONES_TABLAS[tabla];
    const condiciones = [];
    const valores = [];

    if (!filtros.incluirInactivos) {
        condiciones.push("activo = ?");
        valores.push(1);

        condiciones.push("deleted_at IS NULL");
    }

    Object.keys(filtros).forEach((campo) => {
        if (campo !== "incluirInactivos" && columnasPermitidas.includes(campo)) {
            condiciones.push(`${campo} = ?`);
            valores.push(filtros[campo]);
        }
    });

    let where = "";

    if (condiciones.length > 0) {
        where = `WHERE ${condiciones.join(" AND ")}`;
    }

    return {
        where: where,
        valores: valores
    };
};

/**
 * Construye SQL de insercion.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} datos - Datos preparados.
 * @returns {object} SQL y valores.
 */
const construirInsert = (tabla, datos) => {
    const columnas = Object.keys(datos);
    const placeholders = columnas.map(() => "?");
    const valores = columnas.map((campo) => datos[campo]);

    const sql = `
        INSERT INTO ${tabla} (${columnas.join(", ")})
        VALUES (${placeholders.join(", ")})
    `;

    return {
        sql: sql,
        valores: valores
    };
};

/**
 * Construye SQL de actualizacion.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} id - ID local.
 * @param {object} datos - Datos preparados.
 * @returns {object} SQL y valores.
 */
const construirUpdate = (tabla, id, datos) => {
    const columnas = Object.keys(datos);
    const asignaciones = columnas.map((campo) => `${campo} = ?`);
    const valores = columnas.map((campo) => datos[campo]);

    valores.push(id);

    const sql = `
        UPDATE ${tabla}
        SET ${asignaciones.join(", ")},
            version = version + 1
        WHERE id = ?
    `;

    return {
        sql: sql,
        valores: valores
    };
};

/**
 * Busca un registro por uuid local.
 * @param {object} db - Instancia SQLite.
 * @param {string} tabla - Nombre de tabla.
 * @param {string} uuid - UUID.
 * @returns {Promise<object|null>} Registro encontrado.
 */
const buscarPorUuid = async (db, tabla, uuid) => {
    if (!uuid) {
        return null;
    }

    return await db.getFirstAsync(
        `SELECT * FROM ${tabla} WHERE uuid = ?`,
        [uuid]
    );
};

/**
 * Busca un registro por id del servidor.
 * @param {object} db - Instancia SQLite.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} servidorId - ID del backend.
 * @returns {Promise<object|null>} Registro encontrado.
 */
const buscarPorServidorId = async (db, tabla, servidorId) => {
    if (!servidorId) {
        return null;
    }

    return await db.getFirstAsync(
        `SELECT * FROM ${tabla} WHERE servidor_id = ?`,
        [servidorId]
    );
};

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Inicializa la base local creando tablas e indices.
 * @returns {Promise<object>} Respuesta local.
 */
export const inicializarBaseLocal = async () => {
    try {
        const db = await obtenerBaseLocal();

        for (const sentencia of SENTENCIAS_SCHEMA) {
            await db.execAsync(sentencia);
        }

        return exitoLocal("Base local inicializada correctamente.", true);
    } catch (err) {
        return errorLocal("Error al inicializar la base local.", err);
    }
};

/**
 * Obtiene todos los registros de una tabla.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} filtros - Filtros opcionales.
 * @returns {Promise<object>} Respuesta local.
 */
export const obtenerTodosLocal = async (tabla, filtros = {}) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const whereData = construirWhere(tabla, filtros);

        const registros = await db.getAllAsync(
            `SELECT * FROM ${tabla} ${whereData.where} ORDER BY id DESC`,
            whereData.valores
        );

        return exitoLocal("Consulta local realizada correctamente.", registros);
    } catch (err) {
        return errorLocal("Error al consultar datos locales.", err);
    }
};

/**
 * Obtiene un registro por id local.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} id - ID local.
 * @returns {Promise<object>} Respuesta local.
 */
export const obtenerPorIdLocal = async (tabla, id) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();

        const registro = await db.getFirstAsync(
            `SELECT * FROM ${tabla} WHERE id = ? AND activo = 1 AND deleted_at IS NULL`,
            [id]
        );

        return exitoLocal("Registro local obtenido correctamente.", registro);
    } catch (err) {
        return errorLocal("Error al obtener el registro local.", err);
    }
};

/**
 * Obtiene un registro por id del servidor.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} servidorId - ID del backend.
 * @returns {Promise<object>} Respuesta local.
 */
export const obtenerPorServidorIdLocal = async (tabla, servidorId) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();

        const registro = await db.getFirstAsync(
            `SELECT * FROM ${tabla} WHERE servidor_id = ? AND activo = 1 AND deleted_at IS NULL`,
            [servidorId]
        );

        return exitoLocal("Registro local obtenido correctamente.", registro);
    } catch (err) {
        return errorLocal("Error al obtener el registro local por servidor.", err);
    }
};

/**
 * Crea un registro local pendiente de sincronizar.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} datos - Datos a insertar.
 * @returns {Promise<object>} Respuesta local.
 */
export const crearLocal = async (tabla, datos) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const datosPreparados = prepararDatosCreacion(tabla, datos);
        const insertData = construirInsert(tabla, datosPreparados);

        const resultado = await db.runAsync(insertData.sql, insertData.valores);

        const registro = await db.getFirstAsync(
            `SELECT * FROM ${tabla} WHERE id = ?`,
            [resultado.lastInsertRowId]
        );

        return exitoLocal("Registro local creado correctamente.", registro);
    } catch (err) {
        return errorLocal("Error al crear el registro local.", err);
    }
};

/**
 * Actualiza un registro local y lo marca pendiente de sincronizar.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} id - ID local.
 * @param {object} datos - Datos a actualizar.
 * @returns {Promise<object>} Respuesta local.
 */
export const actualizarLocal = async (tabla, id, datos) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();

        const actual = await db.getFirstAsync(
            `SELECT * FROM ${tabla} WHERE id = ?`,
            [id]
        );

        if (!actual) {
            return errorLocal("Registro local no encontrado.", "No existe el registro solicitado.");
        }

        const datosPreparados = filtrarDatosPermitidos(tabla, datos);

        delete datosPreparados.id;

        datosPreparados.fecha_actualizacion = obtenerFechaActual();
        datosPreparados.sincronizado = 0;
        datosPreparados.pendiente_sync = 1;

        if (actual.accion_sync === "CREATE") {
            datosPreparados.accion_sync = "CREATE";
        } else {
            datosPreparados.accion_sync = "UPDATE";
        }

        const updateData = construirUpdate(tabla, id, datosPreparados);

        await db.runAsync(updateData.sql, updateData.valores);

        const registro = await db.getFirstAsync(
            `SELECT * FROM ${tabla} WHERE id = ?`,
            [id]
        );

        return exitoLocal("Registro local actualizado correctamente.", registro);
    } catch (err) {
        return errorLocal("Error al actualizar el registro local.", err);
    }
};

/**
 * Elimina logicamente un registro local.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} id - ID local.
 * @returns {Promise<object>} Respuesta local.
 */
export const eliminarLocal = async (tabla, id) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();

        const actual = await db.getFirstAsync(
            `SELECT * FROM ${tabla} WHERE id = ?`,
            [id]
        );

        if (!actual) {
            return errorLocal("Registro local no encontrado.", "No existe el registro solicitado.");
        }

        const fechaActual = obtenerFechaActual();

        let accionSync = "DELETE";

        if (actual.accion_sync === "CREATE") {
            accionSync = "CREATE";
        }

        await db.runAsync(
            `
            UPDATE ${tabla}
            SET activo = 0,
                deleted_at = ?,
                fecha_actualizacion = ?,
                version = version + 1,
                sincronizado = 0,
                pendiente_sync = 1,
                accion_sync = ?
            WHERE id = ?
            `,
            [fechaActual, fechaActual, accionSync, id]
        );

        return exitoLocal("Registro local eliminado correctamente.", true);
    } catch (err) {
        return errorLocal("Error al eliminar el registro local.", err);
    }
};

/**
 * Inserta o actualiza datos descargados desde el backend.
 * @param {string} tabla - Nombre de tabla.
 * @param {Array<object>} registros - Registros del backend.
 * @returns {Promise<object>} Respuesta local.
 */
export const guardarDesdeServidorLocal = async (tabla, registros = []) => {
    try {
        validarTablaSincronizable(tabla);

        const db = await obtenerBaseLocal();
        let totalGuardados = 0;

        for (const registroServidor of registros) {
            const datosServidor = prepararDatosDesdeServidor(tabla, registroServidor);

            let registroLocal = await buscarPorUuid(db, tabla, datosServidor.uuid);

            if (!registroLocal && datosServidor.servidor_id) {
                registroLocal = await buscarPorServidorId(db, tabla, datosServidor.servidor_id);
            }

            if (registroLocal) {
                const datosActualizacion = {
                    ...datosServidor
                };

                delete datosActualizacion.id;

                const updateData = construirUpdate(tabla, registroLocal.id, datosActualizacion);

                await db.runAsync(updateData.sql, updateData.valores);
            } else {
                const insertData = construirInsert(tabla, datosServidor);

                await db.runAsync(insertData.sql, insertData.valores);
            }

            totalGuardados += 1;
        }

        return exitoLocal("Datos del servidor guardados localmente.", {
            tabla: tabla,
            total: totalGuardados
        });
    } catch (err) {
        return errorLocal("Error al guardar datos del servidor.", err);
    }
};

/**
 * Obtiene todos los registros pendientes de sincronizacion.
 * @returns {Promise<object>} Respuesta local.
 */
export const obtenerPendientesSyncLocal = async () => {
    try {
        const db = await obtenerBaseLocal();
        const pendientes = [];

        for (const tabla of TABLAS_SINCRONIZABLES) {
            const registros = await db.getAllAsync(
                `SELECT * FROM ${tabla} WHERE pendiente_sync = 1`,
                []
            );

            registros.forEach((registro) => {
                pendientes.push({
                    tabla: tabla,
                    accion: registro.accion_sync,
                    registro: registro
                });
            });
        }

        return exitoLocal("Pendientes de sincronizacion obtenidos correctamente.", pendientes);
    } catch (err) {
        return errorLocal("Error al obtener pendientes de sincronizacion.", err);
    }
};

/**
 * Marca un registro local como sincronizado.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} id - ID local.
 * @param {number|null} servidorId - ID devuelto por el backend.
 * @returns {Promise<object>} Respuesta local.
 */
export const marcarSincronizadoLocal = async (tabla, id, servidorId = null) => {
    try {
        validarTablaSincronizable(tabla);

        const db = await obtenerBaseLocal();
        const fechaActual = obtenerFechaActual();

        await db.runAsync(
            `
            UPDATE ${tabla}
            SET servidor_id = COALESCE(?, servidor_id),
                sincronizado = 1,
                pendiente_sync = 0,
                accion_sync = NULL,
                fecha_sync = ?,
                fecha_actualizacion = ?
            WHERE id = ?
            `,
            [servidorId, fechaActual, fechaActual, id]
        );

        return exitoLocal("Registro marcado como sincronizado.", true);
    } catch (err) {
        return errorLocal("Error al marcar registro como sincronizado.", err);
    }
};

/**
 * Cuenta registros por tabla.
 * @param {string} tabla - Nombre de tabla.
 * @returns {Promise<object>} Respuesta local.
 */
export const contarRegistrosLocal = async (tabla) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();

        const resultado = await db.getFirstAsync(
            `SELECT COUNT(*) AS total FROM ${tabla}`,
            []
        );

        return exitoLocal("Conteo local realizado correctamente.", resultado);
    } catch (err) {
        return errorLocal("Error al contar registros locales.", err);
    }
};
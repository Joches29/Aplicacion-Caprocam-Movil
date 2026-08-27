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

import AsyncStorage from "@react-native-async-storage/async-storage";

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
CONSTANTES
//////////////////////////////////////////////////////////
*/

const STORAGE_GRUPO_DATOS = "caprocam_grupo_datos";
const TABLAS_VISIBLES_SIN_GRUPO = ["colaboradores"];

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
 * Obtiene el grupo de datos activo guardado en AsyncStorage.
 * @returns {Promise<number|null>} Grupo de datos activo.
 */
const obtenerGrupoDatosActivo = async () => {
    try {
        const grupoDatos = await AsyncStorage.getItem(STORAGE_GRUPO_DATOS);

        if (!grupoDatos) {
            return null;
        }

        const numero = Number(grupoDatos);

        return Number.isNaN(numero) ? null : numero;
    } catch (error) {
        return null;
    }
};

/**
 * Valida si una tabla contiene columna grupo_datos.
 * @param {string} tabla - Nombre de tabla.
 * @returns {boolean} true si usa grupo_datos.
 */
const tablaUsaGrupoDatos = (tabla) => {
    return DEFINICIONES_TABLAS[tabla]?.includes("grupo_datos");
};

/**
 * Obtiene el grupo de datos de un registro recibido.
 * @param {object} registro - Registro local o del backend.
 * @returns {number|null} Grupo de datos normalizado.
 */
const obtenerGrupoDatosRegistro = (registro = {}) => {
    const grupoDatos = registro.grupo_datos ?? registro.grupoDatos ?? null;

    if (grupoDatos === null || grupoDatos === undefined || grupoDatos === "") {
        return null;
    }

    const numero = Number(grupoDatos);

    return Number.isNaN(numero) ? null : numero;
};

/**
 * Valida el grupo activo antes de escribir en una tabla con grupo_datos.
 * @param {string} tabla - Nombre de tabla.
 * @param {number|null} grupoDatosActivo - Grupo activo.
 */
const validarGrupoDatosParaEscritura = (tabla, grupoDatosActivo) => {
    if (tablaUsaGrupoDatos(tabla) && grupoDatosActivo === null) {
        throw new Error(
            "No existe un grupo de datos activo para realizar la operacion local."
        );
    }
};

/**
 * Agrega el grupo activo a un registro local y evita cruces entre grupos.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} datos - Datos del registro.
 * @param {number|null} grupoDatosActivo - Grupo activo.
 * @returns {object} Datos con grupo validado.
 */
const aplicarGrupoDatosActivo = (
    tabla,
    datos = {},
    grupoDatosActivo = null
) => {
    if (!tablaUsaGrupoDatos(tabla)) {
        return {
            ...datos
        };
    }

    validarGrupoDatosParaEscritura(tabla, grupoDatosActivo);

    const grupoRegistro = obtenerGrupoDatosRegistro(datos);

    if (
        grupoRegistro !== null &&
        grupoRegistro !== grupoDatosActivo
    ) {
        throw new Error(
            "El registro pertenece a un grupo de datos diferente al grupo activo."
        );
    }

    const datosPreparados = {
        ...datos,
        grupo_datos: grupoDatosActivo
    };

    delete datosPreparados.grupoDatos;

    return datosPreparados;
};

/**
 * Construye un WHERE dinamico con filtros permitidos.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} filtros - Filtros recibidos.
 * @param {number|null} grupoDatosActivo - Grupo de datos activo.
 * @returns {object} WHERE y valores.
 */
const construirWhere = (
    tabla,
    filtros = {},
    grupoDatosActivo = null
) => {
    const columnasPermitidas = DEFINICIONES_TABLAS[tabla];
    const condiciones = [];
    const valores = [];

    if (!filtros.incluirInactivos) {
        condiciones.push("activo = ?");
        valores.push(1);

        condiciones.push("deleted_at IS NULL");
    }

    if (tablaUsaGrupoDatos(tabla)) {
        if (grupoDatosActivo === null) {
            if (!TABLAS_VISIBLES_SIN_GRUPO.includes(tabla)) {
                condiciones.push("1 = 0");
            }
        } else {
            condiciones.push("grupo_datos = ?");
            valores.push(grupoDatosActivo);
        }
    }

    Object.keys(filtros).forEach((campo) => {
        if (
            campo === "grupoDatos" ||
            campo === "grupo_datos"
        ) {
            return;
        }

        if (
            campo !== "incluirInactivos" &&
            columnasPermitidas.includes(campo)
        ) {
            condiciones.push(`${campo} = ?`);
            valores.push(filtros[campo]);
        }
    });

    let where = "";

    if (condiciones.length > 0) {
        where = `WHERE ${condiciones.join(" AND ")}`;
    }

    return {
        where,
        valores
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
        sql,
        valores
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
    const asignaciones = columnas.map(
        (campo) => `${campo} = ?`
    );
    const valores = columnas.map(
        (campo) => datos[campo]
    );

    valores.push(id);

    const sql = `
        UPDATE ${tabla}
        SET ${asignaciones.join(", ")},
            version = version + 1
        WHERE id = ?
    `;

    return {
        sql,
        valores
    };
};

/**
 * Busca un registro por uuid local.
 * @param {object} db - Instancia SQLite.
 * @param {string} tabla - Nombre de tabla.
 * @param {string} uuid - UUID.
 * @returns {Promise<object|null>} Registro encontrado.
 */
const buscarPorUuid = async (
    db,
    tabla,
    uuid,
    grupoDatosActivo = null
) => {
    if (!uuid) {
        return null;
    }

    if (tablaUsaGrupoDatos(tabla)) {
        if (grupoDatosActivo === null) {
            return null;
        }

        return await db.getFirstAsync(
            `
            SELECT *
            FROM ${tabla}
            WHERE uuid = ?
              AND grupo_datos = ?
            `,
            [uuid, grupoDatosActivo]
        );
    }

    return await db.getFirstAsync(
        `
        SELECT *
        FROM ${tabla}
        WHERE uuid = ?
        `,
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
const buscarPorServidorId = async (
    db,
    tabla,
    servidorId,
    grupoDatosActivo = null
) => {
    if (!servidorId) {
        return null;
    }

    if (tablaUsaGrupoDatos(tabla)) {
        if (grupoDatosActivo === null) {
            return null;
        }

        return await db.getFirstAsync(
            `
            SELECT *
            FROM ${tabla}
            WHERE servidor_id = ?
              AND grupo_datos = ?
            `,
            [servidorId, grupoDatosActivo]
        );
    }

    return await db.getFirstAsync(
        `
        SELECT *
        FROM ${tabla}
        WHERE servidor_id = ?
        `,
        [servidorId]
    );
};

/**
 * Marca como inactivos los registros sincronizados que ya no vienen
 * en una descarga completa del backend. Nunca toca pendientes locales.
 * @param {object} db - Instancia SQLite.
 * @param {string} tabla - Nombre de tabla.
 * @param {Array<object>} registrosServidor - Registros activos del backend.
 * @param {number|null} grupoDatosActivo - Grupo activo.
 * @returns {Promise<number>} Total de registros retirados localmente.
 */
const reconciliarRegistrosServidor = async (
    db,
    tabla,
    registrosServidor = [],
    grupoDatosActivo = null
) => {
    const fechaActual = obtenerFechaActual();
    const idsServidor = new Set();
    const uuidsServidor = new Set();

    registrosServidor.forEach((registro) => {
        const servidorId =
            registro.servidor_id ??
            registro.servidorId ??
            registro.id ??
            null;

        const uuid = registro.uuid ?? null;

        if (
            servidorId !== null &&
            servidorId !== undefined &&
            servidorId !== ""
        ) {
            idsServidor.add(String(servidorId));
        }

        if (uuid) {
            uuidsServidor.add(String(uuid));
        }
    });

    let registrosLocales = [];

    if (tablaUsaGrupoDatos(tabla)) {
        if (grupoDatosActivo === null) {
            return 0;
        }

        registrosLocales = await db.getAllAsync(
            `
            SELECT *
            FROM ${tabla}
            WHERE grupo_datos = ?
              AND servidor_id IS NOT NULL
              AND pendiente_sync = 0
              AND sincronizado = 1
              AND activo = 1
              AND deleted_at IS NULL
            `,
            [grupoDatosActivo]
        );
    } else {
        registrosLocales = await db.getAllAsync(
            `
            SELECT *
            FROM ${tabla}
            WHERE servidor_id IS NOT NULL
              AND pendiente_sync = 0
              AND sincronizado = 1
              AND activo = 1
              AND deleted_at IS NULL
            `,
            []
        );
    }

    let totalRetirados = 0;

    for (const registroLocal of registrosLocales) {
        const existePorId =
            registroLocal.servidor_id !== null &&
            registroLocal.servidor_id !== undefined &&
            idsServidor.has(
                String(registroLocal.servidor_id)
            );

        const existePorUuid =
            registroLocal.uuid &&
            uuidsServidor.has(
                String(registroLocal.uuid)
            );

        if (existePorId || existePorUuid) {
            continue;
        }

        await db.runAsync(
            `
            UPDATE ${tabla}
            SET activo = 0,
                deleted_at = ?,
                fecha_actualizacion = ?,
                sincronizado = 1,
                pendiente_sync = 0,
                accion_sync = NULL,
                fecha_sync = ?
            WHERE id = ?
              AND pendiente_sync = 0
            `,
            [
                fechaActual,
                fechaActual,
                fechaActual,
                registroLocal.id
            ]
        );

        totalRetirados += 1;
    }

    return totalRetirados;
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

        return exitoLocal(
            "Base local inicializada correctamente.",
            true
        );
    } catch (err) {
        return errorLocal(
            "Error al inicializar la base local.",
            err
        );
    }
};

/**
 * Obtiene todos los registros de una tabla.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} filtros - Filtros opcionales.
 * @returns {Promise<object>} Respuesta local.
 */
export const obtenerTodosLocal = async (
    tabla,
    filtros = {}
) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        const whereData = construirWhere(
            tabla,
            filtros,
            grupoDatosActivo
        );

        const registros = await db.getAllAsync(
            `
            SELECT *
            FROM ${tabla}
            ${whereData.where}
            ORDER BY id DESC
            `,
            whereData.valores
        );

        return exitoLocal(
            "Consulta local realizada correctamente.",
            registros
        );
    } catch (err) {
        return errorLocal(
            "Error al consultar datos locales.",
            err
        );
    }
};

/**
 * Obtiene un registro por id local.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} id - ID local.
 * @returns {Promise<object>} Respuesta local.
 */
export const obtenerPorIdLocal = async (
    tabla,
    id
) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        if (
            tablaUsaGrupoDatos(tabla) &&
            grupoDatosActivo === null
        ) {
            return exitoLocal(
                "No existe grupo de datos activo.",
                null
            );
        }

        let sql = `
            SELECT *
            FROM ${tabla}
            WHERE id = ?
              AND activo = 1
              AND deleted_at IS NULL
        `;

        const valores = [id];

        if (tablaUsaGrupoDatos(tabla)) {
            sql += " AND grupo_datos = ?";
            valores.push(grupoDatosActivo);
        }

        const registro = await db.getFirstAsync(
            sql,
            valores
        );

        return exitoLocal(
            "Registro local obtenido correctamente.",
            registro
        );
    } catch (err) {
        return errorLocal(
            "Error al obtener el registro local.",
            err
        );
    }
};

/**
 * Obtiene un registro por id del servidor.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} servidorId - ID del backend.
 * @returns {Promise<object>} Respuesta local.
 */
export const obtenerPorServidorIdLocal = async (
    tabla,
    servidorId
) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        if (
            tablaUsaGrupoDatos(tabla) &&
            grupoDatosActivo === null
        ) {
            return exitoLocal(
                "No existe grupo de datos activo.",
                null
            );
        }

        let sql = `
            SELECT *
            FROM ${tabla}
            WHERE servidor_id = ?
              AND activo = 1
              AND deleted_at IS NULL
        `;

        const valores = [servidorId];

        if (tablaUsaGrupoDatos(tabla)) {
            sql += " AND grupo_datos = ?";
            valores.push(grupoDatosActivo);
        }

        const registro = await db.getFirstAsync(
            sql,
            valores
        );

        return exitoLocal(
            "Registro local obtenido correctamente.",
            registro
        );
    } catch (err) {
        return errorLocal(
            "Error al obtener el registro local por servidor.",
            err
        );
    }
};

/**
 * Crea un registro local pendiente de sincronizar.
 * @param {string} tabla - Nombre de tabla.
 * @param {object} datos - Datos a insertar.
 * @returns {Promise<object>} Respuesta local.
 */
export const crearLocal = async (
    tabla,
    datos
) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        const datosConGrupo = aplicarGrupoDatosActivo(
            tabla,
            datos,
            grupoDatosActivo
        );

        const datosPreparados =
            prepararDatosCreacion(
                tabla,
                datosConGrupo
            );

        const insertData = construirInsert(
            tabla,
            datosPreparados
        );

        const resultado = await db.runAsync(
            insertData.sql,
            insertData.valores
        );

        const registro = await db.getFirstAsync(
            `
            SELECT *
            FROM ${tabla}
            WHERE id = ?
            `,
            [resultado.lastInsertRowId]
        );

        return exitoLocal(
            "Registro local creado correctamente.",
            registro
        );
    } catch (err) {
        return errorLocal(
            "Error al crear el registro local.",
            err
        );
    }
};

/**
 * Actualiza un registro local y lo marca pendiente de sincronizar.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} id - ID local.
 * @param {object} datos - Datos a actualizar.
 * @returns {Promise<object>} Respuesta local.
 */
export const actualizarLocal = async (
    tabla,
    id,
    datos
) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        validarGrupoDatosParaEscritura(
            tabla,
            grupoDatosActivo
        );

        let sqlActual = `
            SELECT *
            FROM ${tabla}
            WHERE id = ?
        `;

        const valoresActual = [id];

        if (tablaUsaGrupoDatos(tabla)) {
            sqlActual += " AND grupo_datos = ?";
            valoresActual.push(grupoDatosActivo);
        }

        const actual = await db.getFirstAsync(
            sqlActual,
            valoresActual
        );

        if (!actual) {
            return errorLocal(
                "Registro local no encontrado.",
                "No existe el registro solicitado."
            );
        }

        const datosConGrupo = aplicarGrupoDatosActivo(
            tabla,
            datos,
            grupoDatosActivo
        );

        const datosPreparados =
            filtrarDatosPermitidos(
                tabla,
                datosConGrupo
            );

        delete datosPreparados.id;

        datosPreparados.fecha_actualizacion =
            obtenerFechaActual();

        datosPreparados.sincronizado = 0;
        datosPreparados.pendiente_sync = 1;

        if (actual.accion_sync === "CREATE") {
            datosPreparados.accion_sync = "CREATE";
        } else {
            datosPreparados.accion_sync = "UPDATE";
        }

        const updateData = construirUpdate(
            tabla,
            id,
            datosPreparados
        );

        await db.runAsync(
            updateData.sql,
            updateData.valores
        );

        const registro = await db.getFirstAsync(
            `
            SELECT *
            FROM ${tabla}
            WHERE id = ?
            `,
            [id]
        );

        return exitoLocal(
            "Registro local actualizado correctamente.",
            registro
        );
    } catch (err) {
        return errorLocal(
            "Error al actualizar el registro local.",
            err
        );
    }
};

/**
 * Elimina logicamente un registro local.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} id - ID local.
 * @returns {Promise<object>} Respuesta local.
 */
export const eliminarLocal = async (
    tabla,
    id
) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        validarGrupoDatosParaEscritura(
            tabla,
            grupoDatosActivo
        );

        let sqlActual = `
            SELECT *
            FROM ${tabla}
            WHERE id = ?
        `;

        const valoresActual = [id];

        if (tablaUsaGrupoDatos(tabla)) {
            sqlActual += " AND grupo_datos = ?";
            valoresActual.push(grupoDatosActivo);
        }

        const actual = await db.getFirstAsync(
            sqlActual,
            valoresActual
        );

        if (!actual) {
            return errorLocal(
                "Registro local no encontrado.",
                "No existe el registro solicitado."
            );
        }

        const fechaActual =
            obtenerFechaActual();

        let accionSync = "DELETE";

        if (actual.accion_sync === "CREATE") {
            accionSync = "CREATE";
        }

        let sqlUpdate = `
            UPDATE ${tabla}
            SET activo = 0,
                deleted_at = ?,
                fecha_actualizacion = ?,
                version = version + 1,
                sincronizado = 0,
                pendiente_sync = 1,
                accion_sync = ?
            WHERE id = ?
        `;

        const valoresUpdate = [
            fechaActual,
            fechaActual,
            accionSync,
            id
        ];

        if (tablaUsaGrupoDatos(tabla)) {
            sqlUpdate += " AND grupo_datos = ?";
            valoresUpdate.push(grupoDatosActivo);
        }

        await db.runAsync(
            sqlUpdate,
            valoresUpdate
        );

        return exitoLocal(
            "Registro local eliminado correctamente.",
            true
        );
    } catch (err) {
        return errorLocal(
            "Error al eliminar el registro local.",
            err
        );
    }
};

/**
 * Inserta o actualiza datos descargados desde el backend.
 * @param {string} tabla - Nombre de tabla.
 * @param {Array<object>} registros - Registros del backend.
 * @param {object} opciones - Opciones adicionales.
 * @returns {Promise<object>} Respuesta local.
 */
export const guardarDesdeServidorLocal = async (
    tabla,
    registros = [],
    opciones = {}
) => {
    try {
        validarTablaSincronizable(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        const reconciliar =
            opciones.reconciliar === true;

        validarGrupoDatosParaEscritura(
            tabla,
            grupoDatosActivo
        );

        let totalGuardados = 0;
        const registrosValidos = [];

        for (const registroServidor of registros) {
            let registroConGrupo = {
                ...registroServidor
            };

            if (tablaUsaGrupoDatos(tabla)) {
                const grupoRegistro =
                    obtenerGrupoDatosRegistro(
                        registroServidor
                    );

                if (
                    grupoRegistro !== null &&
                    grupoRegistro !== grupoDatosActivo
                ) {
                    continue;
                }

                registroConGrupo = {
                    ...registroServidor,
                    grupo_datos: grupoDatosActivo
                };

                delete registroConGrupo.grupoDatos;
            }

            const datosServidor =
                prepararDatosDesdeServidor(
                    tabla,
                    registroConGrupo
                );

            registrosValidos.push(
                registroConGrupo
            );

            let registroLocal =
                await buscarPorUuid(
                    db,
                    tabla,
                    datosServidor.uuid,
                    grupoDatosActivo
                );

            if (
                !registroLocal &&
                datosServidor.servidor_id
            ) {
                registroLocal =
                    await buscarPorServidorId(
                        db,
                        tabla,
                        datosServidor.servidor_id,
                        grupoDatosActivo
                    );
            }

            if (registroLocal) {
                if (
                    Number(
                        registroLocal.pendiente_sync
                    ) === 1
                ) {
                    continue;
                }

                const datosActualizacion = {
                    ...datosServidor
                };

                delete datosActualizacion.id;

                const updateData =
                    construirUpdate(
                        tabla,
                        registroLocal.id,
                        datosActualizacion
                    );

                await db.runAsync(
                    updateData.sql,
                    updateData.valores
                );
            } else {
                const insertData =
                    construirInsert(
                        tabla,
                        datosServidor
                    );

                await db.runAsync(
                    insertData.sql,
                    insertData.valores
                );
            }

            totalGuardados += 1;
        }

        let totalRetirados = 0;

        if (reconciliar) {
            totalRetirados =
                await reconciliarRegistrosServidor(
                    db,
                    tabla,
                    registrosValidos,
                    grupoDatosActivo
                );
        }

        return exitoLocal(
            "Datos del servidor guardados localmente.",
            {
                tabla: tabla,
                total: totalGuardados,
                retirados: totalRetirados
            }
        );
    } catch (err) {
        return errorLocal(
            "Error al guardar datos del servidor.",
            err
        );
    }
};

/**
 * Obtiene todos los registros pendientes de sincronizacion.
 * @returns {Promise<object>} Respuesta local.
 */
export const obtenerPendientesSyncLocal = async () => {
    try {
        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        const pendientes = [];

        for (const tabla of TABLAS_SINCRONIZABLES) {
            const usaGrupoDatos =
                tablaUsaGrupoDatos(tabla);

            let registros = [];

            if (usaGrupoDatos) {
                if (grupoDatosActivo === null) {
                    continue;
                }

                registros = await db.getAllAsync(
                    `
                    SELECT *
                    FROM ${tabla}
                    WHERE pendiente_sync = 1
                      AND grupo_datos = ?
                    `,
                    [grupoDatosActivo]
                );
            } else {
                registros = await db.getAllAsync(
                    `
                    SELECT *
                    FROM ${tabla}
                    WHERE pendiente_sync = 1
                    `,
                    []
                );
            }

            registros.forEach((registro) => {
                pendientes.push({
                    tabla: tabla,
                    accion: registro.accion_sync,
                    registro: registro
                });
            });
        }

        return exitoLocal(
            "Pendientes de sincronizacion obtenidos correctamente.",
            pendientes
        );
    } catch (err) {
        return errorLocal(
            "Error al obtener pendientes de sincronizacion.",
            err
        );
    }
};

/**
 * Marca un registro local como sincronizado.
 * @param {string} tabla - Nombre de tabla.
 * @param {number} id - ID local.
 * @param {number|null} servidorId - ID devuelto por el backend.
 * @returns {Promise<object>} Respuesta local.
 */
export const marcarSincronizadoLocal = async (
    tabla,
    id,
    servidorId = null
) => {
    try {
        validarTablaSincronizable(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        const fechaActual =
            obtenerFechaActual();

        validarGrupoDatosParaEscritura(
            tabla,
            grupoDatosActivo
        );

        let sql = `
            UPDATE ${tabla}
            SET servidor_id = COALESCE(?, servidor_id),
                sincronizado = 1,
                pendiente_sync = 0,
                accion_sync = NULL,
                fecha_sync = ?,
                fecha_actualizacion = ?
            WHERE id = ?
        `;

        const valores = [
            servidorId,
            fechaActual,
            fechaActual,
            id
        ];

        if (tablaUsaGrupoDatos(tabla)) {
            sql += " AND grupo_datos = ?";
            valores.push(grupoDatosActivo);
        }

        await db.runAsync(
            sql,
            valores
        );

        return exitoLocal(
            "Registro marcado como sincronizado.",
            true
        );
    } catch (err) {
        return errorLocal(
            "Error al marcar registro como sincronizado.",
            err
        );
    }
};

/**
 * Elimina fisicamente un registro local despues de confirmar
 * que fue sincronizado correctamente con el backend.
 *
 * @param {string} tabla - Nombre de la tabla local.
 * @param {number} id - ID local del registro.
 * @returns {Promise<object>} Respuesta local estandar.
 */
export const eliminarRegistroLocalDespuesSync = async (
    tabla,
    id
) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        validarGrupoDatosParaEscritura(
            tabla,
            grupoDatosActivo
        );

        let sqlRegistro = `
            SELECT *
            FROM ${tabla}
            WHERE id = ?
        `;

        const valoresRegistro = [id];

        if (tablaUsaGrupoDatos(tabla)) {
            sqlRegistro += " AND grupo_datos = ?";
            valoresRegistro.push(grupoDatosActivo);
        }

        const registro = await db.getFirstAsync(
            sqlRegistro,
            valoresRegistro
        );

        if (!registro) {
            return exitoLocal(
                "El registro local ya no existe.",
                {
                    tabla,
                    id
                }
            );
        }

        if (
            Number(
                registro.pendiente_sync
            ) !== 1
        ) {
            return exitoLocal(
                "El registro local no esta pendiente de sincronizacion.",
                {
                    tabla,
                    id
                }
            );
        }

        let sqlDelete = `
            DELETE FROM ${tabla}
            WHERE id = ?
        `;

        const valoresDelete = [id];

        if (tablaUsaGrupoDatos(tabla)) {
            sqlDelete += " AND grupo_datos = ?";
            valoresDelete.push(grupoDatosActivo);
        }

        await db.runAsync(
            sqlDelete,
            valoresDelete
        );

        return exitoLocal(
            "Registro local eliminado despues de sincronizar correctamente.",
            {
                tabla,
                id
            }
        );
    } catch (error) {
        return errorLocal(
            "Error al eliminar el registro local despues de sincronizar.",
            error
        );
    }
};

/**
 * Cuenta registros por tabla.
 * @param {string} tabla - Nombre de tabla.
 * @returns {Promise<object>} Respuesta local.
 */
export const contarRegistrosLocal = async (
    tabla
) => {
    try {
        validarTabla(tabla);

        const db = await obtenerBaseLocal();
        const grupoDatosActivo =
            await obtenerGrupoDatosActivo();

        if (
            tablaUsaGrupoDatos(tabla) &&
            grupoDatosActivo === null
        ) {
            return exitoLocal(
                "Conteo local realizado correctamente.",
                {
                    total: 0
                }
            );
        }

        let sql = `
            SELECT COUNT(*) AS total
            FROM ${tabla}
        `;

        const valores = [];

        if (tablaUsaGrupoDatos(tabla)) {
            sql += " WHERE grupo_datos = ?";
            valores.push(grupoDatosActivo);
        }

        const resultado = await db.getFirstAsync(
            sql,
            valores
        );

        return exitoLocal(
            "Conteo local realizado correctamente.",
            resultado
        );
    } catch (err) {
        return errorLocal(
            "Error al contar registros locales.",
            err
        );
    }
};
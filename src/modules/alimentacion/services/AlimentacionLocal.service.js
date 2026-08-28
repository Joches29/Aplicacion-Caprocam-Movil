/**
 * ============================================================
 * SERVICE LOCAL DE ALIMENTACION
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de alimentacion
 * usando SQLite.
 *
 * Mantiene una API similar al service HTTP para que los hooks
 * puedan trabajar con datos locales sin modificar la pantalla.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { localApi } from "../../../database/local/localApi.service";
import { obtenerBaseLocal } from "../../../database/local/sqlite.database";

/*
============================================================
CONSTANTES
============================================================
*/

const STORAGE_COLABORADOR_ACTUAL = "caprocam_colaborador_actual";
const STORAGE_GRUPO_DATOS = "caprocam_grupo_datos";

const HORAS_ALIMENTACION = [
    "7:00 AM",
    "3:00 PM",
];

const TIPOS_ALIMENTO = [
    "Balanceador iniciador 35%",
    "Balanceador engorde 38%",
    "Balanceador premiun 40%",
    "Antibiótico",
];

const PRESENTACIONES_ALIMENTO = [
    "En polvo",
    "Granulado",
];

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

async function ejecutarMetodoAlimentacion(tipoMetodo, argumentos = []) {
    const apiAlimentaciones = localApi.alimentaciones;

    if (!apiAlimentaciones) {
        throw new Error("localApi.alimentaciones no esta disponible.");
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (
            typeof apiAlimentaciones[nombreMetodo] === "function") {
            return await apiAlimentaciones[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local para alimentaciones: ${tipoMetodo}`);
}
/*
============================================================
MAPEADORES
============================================================
*/

function mapearAlimentacionDesdeLocal(registro) {
    return registro
        ? {
            id: obtenerValor(registro, ["id"], null),
            servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
            uuid: obtenerValor(registro, ["uuid"], ""),
            grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),
            fincaId: obtenerValor(registro, ["finca_id", "fincaId"], null),
            estanqueId: obtenerValor(registro, ["estanque_id", "estanqueId"], null),
            colaboradorId: obtenerValor(registro, ["colaborador_id", "colaboradorId"], null),
            proveedorId: obtenerValor(registro, ["proveedor_id", "proveedorId"], null),
            productoId: obtenerValor(registro, ["producto_id", "productoId"], null),
            fecha: obtenerValor(registro, ["fecha"], ""),
            hora: obtenerValor(registro, ["hora"], ""),
            metodo: obtenerValor(registro, ["metodo"], ""),
            cantidadKg: obtenerValor(registro, ["cantidad_kg", "cantidadKg"], 0),
            presentacion: obtenerValor(registro, ["presentacion"], ""),
            proveedor: obtenerValor(registro, ["proveedor"], ""),
            tipoAlimento: obtenerValor(registro, ["tipo_alimento", "tipoAlimento"], ""),
            observaciones: obtenerValor(registro, ["observaciones"], ""),
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



async function mapearAlimentacionParaLocal(alimentacionDTO) {

    const contexto = await obtenerContextoLocal();
    const grupoDatos = obtenerValor(
        alimentacionDTO,
        ["grupoDatos", "grupo_datos"],
        contexto.grupoDatos
    );

    const fincaId = obtenerValor(
        alimentacionDTO,
        ["fincaId", "finca_id", "idFinca"],
        null
    );


    const estanqueId = obtenerValor(
        alimentacionDTO,
        ["estanqueId", "estanque_id", "idEstanque"],
        null
    );

    const colaboradorId = obtenerValor(
        alimentacionDTO,
        ["colaboradorId", "colaborador_id", "idColaborador"],
        contexto.colaboradorId
    );


    const creadoPorColaboradorId = obtenerValor(
        alimentacionDTO,
        ["creadoPorColaboradorId", "creado_por_colaborador_id"],
        contexto.colaboradorId
    );

    const creadoPorUsuarioId = obtenerValor(
        alimentacionDTO,
        ["creadoPorUsuarioId", "creado_por_usuario_id"],
        null
    );

    return {
        grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
        finca_id: convertirNumero(fincaId, null),
        estanque_id: convertirNumero(estanqueId, null),
        colaborador_id: convertirNumero(colaboradorId, null),
        proveedor_id: convertirNumero(obtenerValor(alimentacionDTO, ["proveedorId", "proveedor_id"], null), null),
        producto_id: convertirNumero(obtenerValor(alimentacionDTO, ["productoId", "producto_id"], null), null),
        fecha: convertirTexto(obtenerValor(alimentacionDTO, ["fecha"], "")),
        hora: convertirTexto(obtenerValor(alimentacionDTO, ["hora"], "")),
        metodo: convertirTexto(obtenerValor(alimentacionDTO, ["metodo"], "")),
        cantidad_kg: convertirNumero(obtenerValor(alimentacionDTO, ["cantidadKg", "cantidad_kg"], 0), 0),
        presentacion: convertirTexto(obtenerValor(alimentacionDTO, ["presentacion"], "")),
        proveedor: convertirTexto(obtenerValor(alimentacionDTO, ["proveedor"], "")),
        tipo_alimento: convertirTexto(obtenerValor(alimentacionDTO, ["tipoAlimento", "tipo_alimento"], "")),
        observaciones: convertirTexto(obtenerValor(alimentacionDTO, ["observaciones"], "")).trim(),
        creado_por_usuario_id: creadoPorUsuarioId,
        creado_por_colaborador_id: creadoPorColaboradorId,
    };
}
/*
============================================================
FILTROS
============================================================
*/

function aplicarFiltros(registros, filtros = {}) {
    const fincaId = obtenerValor(filtros, ["fincaId", "finca_id"], null);
    const estanqueId = obtenerValor(filtros, ["estanqueId", "estanque_id"], null);
    const colaboradorId = obtenerValor(filtros, ["colaboradorId", "colaborador_id"], null);
    const fecha = obtenerValor(filtros, ["fecha"], null);
    const hora = obtenerValor(filtros, ["hora"], null);
    const tipoAlimento = obtenerValor(filtros, ["tipoAlimento", "tipo_alimento"], null);
    const presentacion = obtenerValor(filtros, ["presentacion"], null);

    return registros.filter((item) => {
        const coincideFinca = fincaId ? Number(item.fincaId) === Number(fincaId) : true;
        const coincideEstanque = estanqueId ? Number(item.estanqueId) === Number(estanqueId) : true;
        const coincideColaborador = colaboradorId ? Number(item.colaboradorId) === Number(colaboradorId) : true;
        const coincideFecha = fecha ? String(item.fecha) === String(fecha) : true;
        const coincideHora = hora ? String(item.hora) === String(hora) : true;
        const coincideTipo = tipoAlimento ? String(item.tipoAlimento) === String(tipoAlimento) : true;
        const coincidePresentacion = presentacion ? String(item.presentacion) === String(presentacion) : true;

        return (coincideFinca && coincideEstanque && coincideColaborador && coincideFecha && coincideHora && coincideTipo && coincidePresentacion);
    });
}


/*
============================================================
OPERACIONES LOCALES
============================================================
*/


async function getAll(filtros = {}) {

    try {

        const respuesta =
            await ejecutarMetodoAlimentacion(
                "obtenerTodos"
            );


        const data =
            obtenerDataRespuesta(
                respuesta
            );


        const registros =
            Array.isArray(data)
                ? data
                : [];


        return aplicarFiltros(
            registros
                .map(mapearAlimentacionDesdeLocal)
                .filter(Boolean),
            filtros
        );


    } catch (error) {

        console.error(
            "Error al obtener alimentaciones locales",
            extraerError(error)
        );

        throw error;
    }
}



async function getById(id) {

    try {

        const respuesta =
            await ejecutarMetodoAlimentacion(
                "obtenerPorId",
                [
                    id
                ]
            );


        return mapearAlimentacionDesdeLocal(
            obtenerDataRespuesta(respuesta)
        );


    } catch (error) {

        console.error(
            "Error al obtener la alimentacion local",
            extraerError(error)
        );

        throw error;
    }
}



/**
 * Descuenta stock del inventario local y registra el movimiento de Salida.
 */
async function descontarStockAlimentacion(
    productoId,
    cantidadKg
) {
    if (
        !productoId ||
        !cantidadKg ||
        Number(cantidadKg) <= 0
    ) {
        return;
    }

    try {
        const productoLocalId =
            Number(productoId);

        const cantidad =
            Number(cantidadKg);

        const respuestaInventario =
            await localApi.inventario.obtenerTodos({
                incluirInactivos: false,
            });

        const inventario =
            respuestaInventario?.success &&
                Array.isArray(respuestaInventario.data)
                ? respuestaInventario.data
                : [];

        const inventarioItem =
            inventario.find((item) => {
                return (
                    Number(item.producto_id) ===
                    productoLocalId
                );
            });

        if (!inventarioItem) {
            return;
        }

        const cantidadActual =
            Number(inventarioItem.cantidad) || 0;

        const nuevaCantidad =
            Math.max(
                0,
                cantidadActual - cantidad
            );

        const db =
            await obtenerBaseLocal();

        await db.runAsync(
            `
            UPDATE inventario
            SET
                cantidad = ?,
                version = version + 1
            WHERE id = ?
            `,
            [
                nuevaCantidad,
                inventarioItem.id,
            ]
        );
    } catch (error) {
        console.warn(
            "Error al descontar stock en alimentacion:",
            error
        );
    }
}

/**
 * Restaura stock en el inventario local y registra el movimiento de Entrada.
 */
async function restaurarStockAlimentacion(
    productoId,
    cantidadKg
) {
    if (
        !productoId ||
        !cantidadKg ||
        Number(cantidadKg) <= 0
    ) {
        return;
    }

    try {
        const productoLocalId =
            Number(productoId);

        const cantidad =
            Number(cantidadKg);

        const respuestaInventario =
            await localApi.inventario.obtenerTodos({
                incluirInactivos: false,
            });

        const inventario =
            respuestaInventario?.success &&
                Array.isArray(respuestaInventario.data)
                ? respuestaInventario.data
                : [];

        const inventarioItem =
            inventario.find((item) => {
                return (
                    Number(item.producto_id) ===
                    productoLocalId
                );
            });

        if (!inventarioItem) {
            return;
        }

        const cantidadActual =
            Number(inventarioItem.cantidad) || 0;

        const nuevaCantidad =
            cantidadActual + cantidad;

        const db =
            await obtenerBaseLocal();

        await db.runAsync(
            `
            UPDATE inventario
            SET
                cantidad = ?,
                version = version + 1
            WHERE id = ?
            `,
            [
                nuevaCantidad,
                inventarioItem.id,
            ]
        );
    } catch (error) {
        console.warn(
            "Error al restaurar stock en alimentacion:",
            error
        );
    }
}

async function create(alimentacionDTO) {
    try {
        const datosLocales = await mapearAlimentacionParaLocal(alimentacionDTO);

        // Verificar duplicado local (estanque_id, fecha, hora)
        if (datosLocales.estanque_id && datosLocales.fecha && datosLocales.hora) {
            try {
                const db = await obtenerBaseLocal();
                const existente = await db.getFirstAsync(
                    `SELECT id FROM alimentaciones WHERE estanque_id = ? AND fecha = ? AND hora = ? AND activo = 1`,
                    [datosLocales.estanque_id, datosLocales.fecha, datosLocales.hora]
                );
                if (existente) {
                    throw new Error("Ya existe un registro de alimentación para ese estanque en esa fecha y hora.");
                }
            } catch (errDb) {
                if (errDb.message?.includes("Ya existe")) throw errDb;
            }
        }

        const respuesta = await ejecutarMetodoAlimentacion("crear", [datosLocales]);
        const dataCreada = obtenerDataRespuesta(respuesta);

        // Descontar stock local
        if (datosLocales.producto_id && datosLocales.cantidad_kg > 0) {
            await descontarStockAlimentacion(datosLocales.producto_id, datosLocales.cantidad_kg);
        }

        return mapearAlimentacionDesdeLocal(dataCreada);
    } catch (error) {
        console.error("Error al crear la alimentacion local", extraerError(error));
        throw error;
    }
}

async function update(id, alimentacionDTO) {
    try {
        let registroPrevio = null;
        try {
            registroPrevio = await getById(id);
        } catch (_) { }

        const datosLocales = await mapearAlimentacionParaLocal(alimentacionDTO);
        const respuesta = await ejecutarMetodoAlimentacion("actualizar", [id, datosLocales]);
        const dataActualizada = obtenerDataRespuesta(respuesta);

        // Revertir stock previo si existía
        if (registroPrevio && registroPrevio.productoId && registroPrevio.cantidadKg > 0) {
            await restaurarStockAlimentacion(registroPrevio.productoId, registroPrevio.cantidadKg);
        }

        // Aplicar nuevo descuento de stock
        if (datosLocales.producto_id && datosLocales.cantidad_kg > 0) {
            await descontarStockAlimentacion(datosLocales.producto_id, datosLocales.cantidad_kg);
        }

        return mapearAlimentacionDesdeLocal(dataActualizada);
    } catch (error) {
        console.error("Error al actualizar la alimentacion local", extraerError(error));
        throw error;
    }
}

async function deleteById(id) {
    try {
        let registroPrevio = null;
        try {
            registroPrevio = await getById(id);
        } catch (_) { }

        const respuesta = await ejecutarMetodoAlimentacion("eliminar", [id]);
        const dataEliminada = obtenerDataRespuesta(respuesta);

        // Revertir stock si existía
        if (registroPrevio && registroPrevio.productoId && registroPrevio.cantidadKg > 0) {
            await restaurarStockAlimentacion(registroPrevio.productoId, registroPrevio.cantidadKg);
        }

        return mapearAlimentacionDesdeLocal(dataEliminada);
    } catch (error) {
        console.error("Error al eliminar la alimentacion local", extraerError(error));
        throw error;
    }
}


/*
============================================================
CATALOGOS LOCALES
============================================================
*/


async function getHoras() {

    return HORAS_ALIMENTACION;
}



async function getTiposAlimento() {

    return TIPOS_ALIMENTO;
}



async function getPresentaciones() {

    return PRESENTACIONES_ALIMENTO;
}


/*
============================================================
EXPORT
============================================================
*/


const AlimentacionLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
    getHoras,
    getTiposAlimento,
    getPresentaciones,
};


export default AlimentacionLocalService;
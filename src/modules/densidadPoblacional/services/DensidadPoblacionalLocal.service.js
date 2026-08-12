/**
 * ============================================================
 * SERVICE LOCAL DE DENSIDAD POBLACIONAL
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de densidad
 * poblacional usando SQLite.
 *
 * NUEVO ARCHIVO: en la version "web" no existia ningun service
 * local para este modulo (solo DensidadPoblacional.service.js,
 * que es HTTP puro). Se reconstruye tomando como base el patron
 * ya usado en Raleo/Alimentacion, adaptado al schema nuevo:
 *
 * - `densidad_poblacional` ahora es solo el resumen (totales y
 *   valores calculados).
 * - El detalle tiro por tiro vive en la tabla relacionada
 *   `densidad_detalle_tiros` (localApi.densidadDetalleTiros), una
 *   fila por tiro, enlazada por `densidad_id`.
 * - `localApi` NO inserta relaciones anidadas por si solo: crear
 *   un registro completo son VARIAS llamadas (1 a
 *   densidadPoblacional.crear + N a densidadDetalleTiros.crear).
 * - Los valores calculados (total_camarones_muestra,
 *   tiros_atarraya, area_muestreada, promedio_por_tiro,
 *   poblacion_estimada, sobrevivencia, densidad) NO llegan
 *   digitados desde el formulario (ver useDatosConteo.js /
 *   useDensidadPoblacional.js: el DTO que arma la pantalla solo
 *   trae `tiros`, `areaAtarraya`, `cantidadSiembra`,
 *   `areaEstanque`, `notasConteo`). Este service es quien calcula
 *   esos valores a partir de los tiros crudos, con las mismas
 *   formulas que useDatosConteo.js ya usa para la vista previa,
 *   para que exista una sola fuente de verdad.
 *
 * Tambien expone obtenerDatosBaseEstanque(idEstanque), el
 * equivalente local del endpoint HTTP
 * GET /densidad-poblacional/estanque/:id/datos-base que consumia
 * useDatosBaseEstanque.js: calcula el area del estanque (hectareas,
 * desde largo x ancho) y trae la siembra por m2 de la siembra
 * activa de ese estanque (localApi.siembras), sin depender del
 * backend.
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

const MAX_TIROS = 30;

// Igual que el ejemplo del documento de requerimientos ("la
// atarraya cubre aproximadamente 2,5 m2 por tiro"): valor sugerido
// por defecto cuando no hay otra referencia mejor.
const AREA_ATARRAYA_SUGERIDA_DEFECTO = 2.5;

// "Se realizan 10 tiros de atarraya por hectarea" (documento).
const TIROS_POR_HECTAREA = 10;

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

async function ejecutarMetodoTabla(apiTabla, nombreTabla, tipoMetodo, argumentos = []) {
    if (!apiTabla) {
        throw new Error(`localApi.${nombreTabla} no esta disponible.`);
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (typeof apiTabla[nombreMetodo] === "function") {
            return await apiTabla[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local para ${nombreTabla}: ${tipoMetodo}`);
}

const ejecutarMetodoDensidad = (tipoMetodo, argumentos = []) =>
    ejecutarMetodoTabla(localApi.densidadPoblacional, "densidad_poblacional", tipoMetodo, argumentos);

const ejecutarMetodoTiros = (tipoMetodo, argumentos = []) =>
    ejecutarMetodoTabla(localApi.densidadDetalleTiros, "densidad_detalle_tiros", tipoMetodo, argumentos);

const ejecutarMetodoEstanques = (tipoMetodo, argumentos = []) =>
    ejecutarMetodoTabla(localApi.estanques, "estanques", tipoMetodo, argumentos);

const ejecutarMetodoSiembras = (tipoMetodo, argumentos = []) =>
    ejecutarMetodoTabla(localApi.siembras, "siembras", tipoMetodo, argumentos);

/*
============================================================
CALCULOS DERIVADOS
============================================================
*
* Mismas formulas que useDatosConteo.js usa para la vista previa
* (numeroCamarones, tirosAtarraya, areaMuestreada, promedioPorTiro,
* densidadPorM2, poblacionTotal, supervivencia). Se reescriben aqui
* porque este service es quien realmente calcula y persiste esos
* valores; el DTO que llega desde la pantalla solo trae los tiros
* crudos, no vuelve a mandar los resultados.
*/

function aNumero(valor) {
    const numero = Number(valor);
    if (valor === "" || valor === null || valor === undefined || Number.isNaN(numero)) {
        return 0;
    }
    return numero;
}

function calcularDerivados({ tiros, areaAtarraya, cantidadSiembra, areaEstanque }) {
    const listaTiros = Array.isArray(tiros) ? tiros : [];

    const tirosAtarraya = listaTiros.length;
    const totalCamaronesMuestra = listaTiros.reduce((suma, tiro) => suma + aNumero(tiro), 0);

    const areaMuestreada = tirosAtarraya * aNumero(areaAtarraya);
    const promedioPorTiro = tirosAtarraya > 0 ? Math.round(totalCamaronesMuestra / tirosAtarraya) : 0;
    const densidadPorM2 = areaMuestreada > 0 ? Math.round(totalCamaronesMuestra / areaMuestreada) : 0;
    const poblacionEstimada = densidadPorM2 * (aNumero(areaEstanque) * 10000);

    const poblacionSembrada =
        aNumero(cantidadSiembra) > 0 && aNumero(areaEstanque) > 0
            ? aNumero(cantidadSiembra) * aNumero(areaEstanque) * 10000
            : 0;

    const sobrevivencia =
        poblacionSembrada > 0 && poblacionEstimada > 0
            ? Math.round(Math.min((poblacionEstimada / poblacionSembrada) * 100, 100))
            : 0;

    return {
        tirosAtarraya,
        totalCamaronesMuestra,
        areaMuestreada,
        promedioPorTiro,
        densidadPorM2,
        poblacionEstimada,
        sobrevivencia,
    };
}

/*
============================================================
MAPEADORES
============================================================
*/

function mapearDensidadDesdeLocal(registro) {
    return registro
        ? {
            id: obtenerValor(registro, ["id"], null),
            servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
            uuid: obtenerValor(registro, ["uuid"], ""),

            grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),
            fincaId: obtenerValor(registro, ["finca_id", "fincaId"], null),
            estanqueId: obtenerValor(registro, ["estanque_id", "estanqueId"], null),
            fecha: obtenerValor(registro, ["fecha"], ""),

            cantidadSiembra: obtenerValor(registro, ["cantidad_siembra", "cantidadSiembra"], null),
            areaEstanque: obtenerValor(registro, ["area_estanque", "areaEstanque"], null),

            numeroCamarones: obtenerValor(
                registro,
                ["total_camarones_muestra", "totalCamaronesMuestra", "numeroCamarones"],
                0
            ),
            tirosAtarraya: obtenerValor(registro, ["tiros_atarraya", "tirosAtarraya"], 0),
            areaAtarraya: obtenerValor(registro, ["area_atarraya", "areaAtarraya"], 0),
            areaMuestreada: obtenerValor(registro, ["area_muestreada", "areaMuestreada"], 0),
            promedioPorTiro: obtenerValor(registro, ["promedio_por_tiro", "promedioPorTiro"], 0),
            poblacionEstimada: obtenerValor(registro, ["poblacion_estimada", "poblacionEstimada"], 0),
            sobrevivencia: obtenerValor(registro, ["sobrevivencia"], 0),
            densidad: obtenerValor(registro, ["densidad"], 0),

            notasConteo: obtenerValor(registro, ["notas_conteo", "notasConteo"], ""),

            activo: obtenerValor(registro, ["activo"], 1),
            sincronizado: obtenerValor(registro, ["sincronizado"], 0),
            pendienteSync: obtenerValor(registro, ["pendiente_sync", "pendienteSync"], 1),
            fechaCreacion: obtenerValor(registro, ["fecha_creacion", "fechaCreacion"], null),
            fechaActualizacion: obtenerValor(registro, ["fecha_actualizacion", "fechaActualizacion"], null),
        }
        : null;
}

function mapearTiroDesdeLocal(registro) {
    return {
        id: obtenerValor(registro, ["id"], null),
        densidadId: obtenerValor(registro, ["densidad_id", "densidadId"], null),
        numeroTiro: obtenerValor(registro, ["numero_tiro", "numeroTiro"], null),
        cantidadCamarones: obtenerValor(registro, ["cantidad_camarones", "cantidadCamarones"], 0),
    };
}

async function mapearDensidadParaLocal(densidadDTO, derivados, contexto) {
    const grupoDatos = obtenerValor(densidadDTO, ["grupoDatos", "grupo_datos"], contexto.grupoDatos);

    const fincaId = obtenerValor(densidadDTO, ["fincaId", "finca_id", "idFinca"], null);
    const estanqueId = obtenerValor(densidadDTO, ["estanqueId", "estanque_id", "idEstanque"], null);

    const creadoPorColaboradorId = obtenerValor(
        densidadDTO,
        ["creadoPorColaboradorId", "creado_por_colaborador_id"],
        contexto.colaboradorId
    );
    const creadoPorUsuarioId = obtenerValor(
        densidadDTO,
        ["creadoPorUsuarioId", "creado_por_usuario_id"],
        null
    );

    return {
        grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
        finca_id: convertirNumero(fincaId, null),
        estanque_id: convertirNumero(estanqueId, null),
        fecha: convertirTexto(obtenerValor(densidadDTO, ["fecha"], "")),

        cantidad_siembra: convertirNumero(
            obtenerValor(densidadDTO, ["cantidadSiembra", "cantidad_siembra", "siembraPorM2"], 0),
            0
        ),
        area_estanque: convertirNumero(
            obtenerValor(densidadDTO, ["areaEstanque", "area_estanque"], 0),
            0
        ),

        total_camarones_muestra: convertirNumero(derivados.totalCamaronesMuestra, 0),
        tiros_atarraya: convertirNumero(derivados.tirosAtarraya, 0),
        area_atarraya: convertirNumero(
            obtenerValor(densidadDTO, ["areaAtarraya", "area_atarraya"], 0),
            0
        ),
        area_muestreada: convertirNumero(derivados.areaMuestreada, 0),
        promedio_por_tiro: convertirNumero(derivados.promedioPorTiro, 0),
        poblacion_estimada: convertirNumero(derivados.poblacionEstimada, 0),
        sobrevivencia: convertirNumero(derivados.sobrevivencia, 0),
        densidad: convertirNumero(derivados.densidadPorM2, 0),

        notas_conteo: convertirTexto(obtenerValor(densidadDTO, ["notasConteo", "notas_conteo"], "")),

        creado_por_usuario_id: creadoPorUsuarioId,
        creado_por_colaborador_id: creadoPorColaboradorId,
    };
}

/*
============================================================
FILTROS (listado)
============================================================
*/

function aplicarFiltros(registros, filtros = {}) {
    const fincaId = obtenerValor(filtros, ["fincaId", "finca_id"], null);
    const estanqueId = obtenerValor(filtros, ["estanqueId", "estanque_id"], null);

    return registros.filter((item) => {
        const coincideFinca = fincaId ? Number(item.fincaId) === Number(fincaId) : true;
        const coincideEstanque = estanqueId ? Number(item.estanqueId) === Number(estanqueId) : true;
        return coincideFinca && coincideEstanque;
    });
}

/*
============================================================
TIROS: helpers de guardado
============================================================
*/

async function obtenerTirosDeDensidad(densidadId) {
    const respuesta = await ejecutarMetodoTiros("obtenerTodos");
    const data = obtenerDataRespuesta(respuesta);
    const registros = Array.isArray(data) ? data : [];

    return registros
        .map(mapearTiroDesdeLocal)
        .filter((tiro) => Number(tiro.densidadId) === Number(densidadId))
        .sort((a, b) => Number(a.numeroTiro) - Number(b.numeroTiro));
}

async function guardarTirosDeDensidad(densidadId, tiros, contexto) {
    const listaTiros = Array.isArray(tiros) ? tiros.slice(0, MAX_TIROS) : [];

    for (let i = 0; i < listaTiros.length; i += 1) {
        await ejecutarMetodoTiros("crear", [
            {
                grupo_datos: contexto.grupoDatos,
                densidad_id: densidadId,
                numero_tiro: i + 1,
                cantidad_camarones: convertirNumero(listaTiros[i], 0),
                creado_por_usuario_id: null,
                creado_por_colaborador_id: contexto.colaboradorId,
            },
        ]);
    }
}

async function eliminarTirosDeDensidad(densidadId) {
    const tirosActuales = await obtenerTirosDeDensidad(densidadId);

    for (let i = 0; i < tirosActuales.length; i += 1) {
        await ejecutarMetodoTiros("eliminar", [tirosActuales[i].id]);
    }
}

/*
============================================================
DATOS BASE DEL ESTANQUE
============================================================
*/

async function obtenerDatosBaseEstanque(idEstanque) {
    try {
        const respuestaEstanque = await ejecutarMetodoEstanques("obtenerPorId", [idEstanque]);
        const estanque = obtenerDataRespuesta(respuestaEstanque);

        if (!estanque) {
            throw new Error("No se encontro el estanque seleccionado.");
        }

        const largo = convertirNumero(obtenerValor(estanque, ["largo"], 0), 0);
        const ancho = convertirNumero(obtenerValor(estanque, ["ancho"], 0), 0);
        const areaM2 = largo * ancho;
        const areaHectareas = areaM2 > 0 ? areaM2 / 10000 : 0;

        const respuestaSiembras = await ejecutarMetodoSiembras("obtenerTodos");
        const dataSiembras = obtenerDataRespuesta(respuestaSiembras);
        const siembras = Array.isArray(dataSiembras) ? dataSiembras : [];

        const siembraActiva = siembras
            .filter((siembra) => {
                const estanqueIdSiembra = obtenerValor(siembra, ["estanque_id", "estanqueId"], null);
                const estado = String(obtenerValor(siembra, ["estado"], "")).toLowerCase();
                return Number(estanqueIdSiembra) === Number(idEstanque) && estado === "activa";
            })
            .sort((a, b) => Number(obtenerValor(b, ["id"], 0)) - Number(obtenerValor(a, ["id"], 0)))[0];

        const cantidadSiembra = siembraActiva
            ? obtenerValor(siembraActiva, ["densidad_poblacional", "densidadPoblacional"], null)
            : null;

        const tirosRecomendados =
            areaHectareas > 0 ? Math.min(Math.round(areaHectareas * TIROS_POR_HECTAREA), MAX_TIROS) : null;

        return {
            areaEstanque: areaHectareas > 0 ? areaHectareas : null,
            cantidadSiembra: cantidadSiembra !== null && cantidadSiembra !== undefined
                ? convertirNumero(cantidadSiembra, null)
                : null,
            areaAtarrayaSugerida: AREA_ATARRAYA_SUGERIDA_DEFECTO,
            tirosRecomendados,
        };
    } catch (error) {
        console.error("Error al obtener datos base del estanque", extraerError(error));
        throw error;
    }
}

/*
============================================================
OPERACIONES LOCALES
============================================================
*/

async function getAll(filtros = {}) {
    try {
        const respuesta = await ejecutarMetodoDensidad("obtenerTodos");
        const data = obtenerDataRespuesta(respuesta);
        const registros = Array.isArray(data) ? data : [];

        return aplicarFiltros(
            registros.map(mapearDensidadDesdeLocal).filter(Boolean),
            filtros
        );
    } catch (error) {
        console.error("Error al obtener densidades locales", extraerError(error));
        throw error;
    }
}

async function getById(id) {
    try {
        const respuesta = await ejecutarMetodoDensidad("obtenerPorId", [id]);
        const registro = mapearDensidadDesdeLocal(obtenerDataRespuesta(respuesta));

        if (!registro) return null;

        const tiros = await obtenerTirosDeDensidad(id);

        return {
            ...registro,
            // Array simple de cantidades, en orden: es lo que
            // datosConteo.cargarTiros() espera (tambien acepta el
            // formato { numeroTiro, cantidadCamarones }).
            tiros: tiros.map((tiro) => tiro.cantidadCamarones),
        };
    } catch (error) {
        console.error("Error al obtener la densidad local", extraerError(error));
        throw error;
    }
}

async function create(densidadDTO) {
    try {
        const contexto = await obtenerContextoLocal();
        const derivados = calcularDerivados(densidadDTO);
        const datosLocales = await mapearDensidadParaLocal(densidadDTO, derivados, contexto);

        const respuesta = await ejecutarMetodoDensidad("crear", [datosLocales]);
        const creado = obtenerDataRespuesta(respuesta);
        const nuevoId = obtenerValor(creado, ["id"], null);

        if (!nuevoId) {
            throw new Error("No se pudo obtener el id del registro creado.");
        }

        await guardarTirosDeDensidad(nuevoId, densidadDTO.tiros, contexto);

        return getById(nuevoId);
    } catch (error) {
        console.error("Error al crear densidad local", extraerError(error));
        throw error;
    }
}

async function update(id, densidadDTO) {
    try {
        const contexto = await obtenerContextoLocal();
        const derivados = calcularDerivados(densidadDTO);
        const datosLocales = await mapearDensidadParaLocal(densidadDTO, derivados, contexto);

        await ejecutarMetodoDensidad("actualizar", [id, datosLocales]);

        // Se reemplazan todos los tiros: es una edicion completa del
        // muestreo, no un ajuste parcial (mismo criterio que el DTO
        // que arma useEditarDensidad.js, que siempre manda la lista
        // completa de tiros vigente en el formulario).
        await eliminarTirosDeDensidad(id);
        await guardarTirosDeDensidad(id, densidadDTO.tiros, contexto);

        return getById(id);
    } catch (error) {
        console.error("Error al actualizar densidad local", extraerError(error));
        throw error;
    }
}

async function deleteById(id) {
    try {
        await eliminarTirosDeDensidad(id);

        const respuesta = await ejecutarMetodoDensidad("eliminar", [id]);
        return mapearDensidadDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al eliminar densidad local", extraerError(error));
        throw error;
    }
}

/*
============================================================
EXPORT
============================================================
*/

const DensidadPoblacionalLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
    obtenerDatosBaseEstanque,
};

export default DensidadPoblacionalLocalService;
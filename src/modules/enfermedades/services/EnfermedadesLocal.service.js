/**
 * ============================================================
 * SERVICE LOCAL DE ENFERMEDADES
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de enfermedades
 * usando SQLite.
 *
 * Mantiene una API similar al service HTTP para que los hooks
 * puedan trabajar con datos locales sin cambiar la pantalla.
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

const CATALOGO_ENFERMEDADES = [
    "WSSV",
    "AHPND",
    "Vibriosis",
    "IHHNV",
    "NHP",
    "otro",
];

const CATALOGO_SEVERIDADES = [
    "bajo",
    "medio",
    "alto",
    "critica",
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

const obtenerDataRespuesta = (respuesta) => {
    if (respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")) {
        return respuesta.data;
    }

    return respuesta;
};

const convertirNumero = (valor, valorDefecto = 0) => {
    if (valor === undefined || valor === null || valor === "") {
        return valorDefecto;
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        return valorDefecto;
    }

    return numero;
};

const convertirTexto = (valor, valorDefecto = "") => {
    if (valor === undefined || valor === null) {
        return valorDefecto;
    }

    return String(valor);
};

const extraerError = (error) => {
    if (error?.message) {
        return error.message;
    }

    return "Error desconocido";
};

function obtenerValor(objeto, llaves, valorDefecto = null) {
    if (!objeto) {
        return valorDefecto;
    }

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

        if (!valor) {
            return null;
        }

        return JSON.parse(valor);
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

    const nombre = obtenerValor(colaborador, ["nombre"], "");
    const apellidos = obtenerValor(colaborador, ["apellidos", "apellido"], "");
    const responsable = `${nombre} ${apellidos}`.trim();

    return {
        grupoDatos: convertirNumero(grupoDatos, 1),
        colaboradorId: colaboradorId,
        responsable: responsable || "No disponible",
    };
}

async function ejecutarMetodoEnfermedades(tipoMetodo, argumentos = []) {
    const apiEnfermedades = localApi.enfermedades;

    if (!apiEnfermedades) {
        throw new Error("localApi.enfermedades no esta disponible.");
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (typeof apiEnfermedades[nombreMetodo] === "function") {
            return await apiEnfermedades[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local para enfermedades: ${tipoMetodo}`);
}

/*
============================================================
MAPEADORES
============================================================
*/

function mapearEnfermedadDesdeLocal(registro) {
    if (!registro) {
        return null;
    }

    return {
        id: obtenerValor(registro, ["id"], null),
        servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
        uuid: obtenerValor(registro, ["uuid"], ""),
        grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

        fincaId: obtenerValor(registro, ["finca_id", "fincaId"], null),
        estanqueId: obtenerValor(registro, ["estanque_id", "estanqueId"], null),

        creadoPorUsuarioId: obtenerValor(
            registro,
            ["creado_por_usuario_id", "creadoPorUsuarioId"],
            null
        ),

        creadoPorColaboradorId: obtenerValor(
            registro,
            ["creado_por_colaborador_id", "creadoPorColaboradorId"],
            null
        ),

        tipoRegistro: obtenerValor(
            registro,
            ["tipo_registro", "tipoRegistro"],
            "enfermedad"
        ),

        fechaReporte: obtenerValor(
            registro,
            ["fecha_reporte", "fechaReporte", "fecha"],
            ""
        ),

        responsable: obtenerValor(registro, ["responsable"], ""),
        enfermedad: obtenerValor(registro, ["enfermedad"], ""),
        severidad: obtenerValor(registro, ["severidad"], ""),
        reporte: obtenerValor(registro, ["reporte"], "") || "",

        activo: obtenerValor(registro, ["activo"], 1),
        sincronizado: obtenerValor(registro, ["sincronizado"], 0),
        pendienteSync: obtenerValor(registro, ["pendiente_sync", "pendienteSync"], 1),
        accionSync: obtenerValor(registro, ["accion_sync", "accionSync"], null),
        fechaSync: obtenerValor(registro, ["fecha_sync", "fechaSync"], null),

        fechaCreacion: obtenerValor(
            registro,
            ["fecha_creacion", "fechaCreacion"],
            null
        ),

        fechaActualizacion: obtenerValor(
            registro,
            ["fecha_actualizacion", "fechaActualizacion"],
            null
        ),
    };
}

async function mapearEnfermedadParaLocal(enfermedadDTO) {
    const contexto = await obtenerContextoLocal();

    const grupoDatos = obtenerValor(
        enfermedadDTO,
        ["grupoDatos", "grupo_datos"],
        contexto.grupoDatos
    );

    const fincaId = obtenerValor(
        enfermedadDTO,
        ["fincaId", "finca_id", "idFinca"],
        null
    );

    const estanqueId = obtenerValor(
        enfermedadDTO,
        ["estanqueId", "estanque_id", "idEstanque"],
        null
    );

    const fechaReporte = obtenerValor(
        enfermedadDTO,
        ["fechaReporte", "fecha_reporte", "fecha"],
        ""
    );

    const responsable = obtenerValor(
        enfermedadDTO,
        ["responsable"],
        contexto.responsable
    );

    const creadoPorColaboradorId = obtenerValor(
        enfermedadDTO,
        ["creadoPorColaboradorId", "creado_por_colaborador_id"],
        contexto.colaboradorId
    );

    const creadoPorUsuarioId = obtenerValor(
        enfermedadDTO,
        ["creadoPorUsuarioId", "creado_por_usuario_id"],
        null
    );

    const reporte = convertirTexto(
        obtenerValor(enfermedadDTO, ["reporte"], "")
    ).trim();

    return {
        grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
        finca_id: convertirNumero(fincaId, null),
        estanque_id: convertirNumero(estanqueId, null),
        tipo_registro: convertirTexto(
            obtenerValor(enfermedadDTO, ["tipoRegistro", "tipo_registro"], "enfermedad"),
            "enfermedad"
        ),
        fecha_reporte: convertirTexto(fechaReporte),
        responsable: convertirTexto(responsable, contexto.responsable),
        enfermedad: convertirTexto(enfermedadDTO.enfermedad),
        severidad: convertirTexto(enfermedadDTO.severidad),
        reporte: reporte || null,
        creado_por_usuario_id: creadoPorUsuarioId,
        creado_por_colaborador_id: creadoPorColaboradorId,
    };
}

/*
============================================================
FILTROS Y RESUMEN
============================================================
*/

function aplicarFiltros(registros, filtros = {}) {
    const fincaId = obtenerValor(filtros, ["fincaId", "finca_id"], null);
    const estanqueId = obtenerValor(filtros, ["estanqueId", "estanque_id"], null);
    const enfermedad = obtenerValor(filtros, ["enfermedad"], null);
    const severidad = obtenerValor(filtros, ["severidad"], null);
    const fechaInicio = obtenerValor(filtros, ["fechaInicio", "fecha_inicio"], null);
    const fechaFin = obtenerValor(filtros, ["fechaFin", "fecha_fin"], null);

    return registros.filter((item) => {
        const fechaReporte = String(item.fechaReporte || "").slice(0, 10);

        const coincideFinca = fincaId
            ? Number(item.fincaId) === Number(fincaId)
            : true;

        const coincideEstanque = estanqueId
            ? Number(item.estanqueId) === Number(estanqueId)
            : true;

        const coincideEnfermedad = enfermedad
            ? String(item.enfermedad) === String(enfermedad)
            : true;

        const coincideSeveridad = severidad
            ? String(item.severidad) === String(severidad)
            : true;

        const coincideFechaInicio = fechaInicio
            ? fechaReporte >= String(fechaInicio).slice(0, 10)
            : true;

        const coincideFechaFin = fechaFin
            ? fechaReporte <= String(fechaFin).slice(0, 10)
            : true;

        return (
            coincideFinca &&
            coincideEstanque &&
            coincideEnfermedad &&
            coincideSeveridad &&
            coincideFechaInicio &&
            coincideFechaFin
        );
    });
}

function contarFrecuencias(registros, campo) {
    const acumulado = registros.reduce((total, item) => {
        const valor = item[campo];

        if (!valor) {
            return total;
        }

        total[valor] = total[valor] ? total[valor] + 1 : 1;

        return total;
    }, {});

    return Object.keys(acumulado)
        .map((nombre) => {
            return {
                nombre: nombre,
                total: acumulado[nombre],
            };
        })
        .sort((a, b) => {
            return b.total - a.total;
        });
}

/*
============================================================
OPERACIONES LOCALES
============================================================
*/

async function getAll(filtros = {}) {
    try {
        await localApi.inicializar();

        const respuesta = await ejecutarMetodoEnfermedades("obtenerTodos");
        const data = obtenerDataRespuesta(respuesta);
        const registros = Array.isArray(data) ? data : [];

        return aplicarFiltros(
            registros.map(mapearEnfermedadDesdeLocal).filter(Boolean),
            filtros
        );
    } catch (error) {
        console.error("Error al obtener enfermedades locales", extraerError(error));
        throw error;
    }
}

async function getById(id) {
    try {
        await localApi.inicializar();

        const respuesta = await ejecutarMetodoEnfermedades("obtenerPorId", [id]);

        return mapearEnfermedadDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al obtener la enfermedad local", extraerError(error));
        throw error;
    }
}

async function create(enfermedadDTO) {
    try {
        await localApi.inicializar();

        const datosLocales = await mapearEnfermedadParaLocal(enfermedadDTO);
        const respuesta = await ejecutarMetodoEnfermedades("crear", [datosLocales]);

        return mapearEnfermedadDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al crear la enfermedad local", extraerError(error));
        throw error;
    }
}

async function update(id, enfermedadDTO) {
    try {
        await localApi.inicializar();

        const datosLocales = await mapearEnfermedadParaLocal(enfermedadDTO);

        const respuesta = await ejecutarMetodoEnfermedades("actualizar", [
            id,
            datosLocales,
        ]);

        return mapearEnfermedadDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al actualizar la enfermedad local", extraerError(error));
        throw error;
    }
}

async function deleteById(id) {
    try {
        await localApi.inicializar();

        const respuesta = await ejecutarMetodoEnfermedades("eliminar", [id]);
        const data = obtenerDataRespuesta(respuesta);

        if (data === true) {
            return {
                id: id,
                eliminado: true,
            };
        }

        return mapearEnfermedadDesdeLocal(data);
    } catch (error) {
        console.error("Error al eliminar la enfermedad local", extraerError(error));
        throw error;
    }
}

async function getResumenDashboard(filtros = {}) {
    try {
        const registros = await getAll(filtros);

        return {
            totalCasos: registros.length,
            enfermedadesFrecuentes: contarFrecuencias(registros, "enfermedad"),
            severidadesFrecuentes: contarFrecuencias(registros, "severidad"),
        };
    } catch (error) {
        console.error(
            "Error al obtener el resumen local de enfermedades",
            extraerError(error)
        );
        throw error;
    }
}

async function getCatalogo() {
    return CATALOGO_ENFERMEDADES;
}

async function getCatalogoSeveridades() {
    return CATALOGO_SEVERIDADES;
}

/*
============================================================
EXPORT
============================================================
*/

const EnfermedadesLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
    getResumenDashboard,
    getCatalogo,
    getCatalogoSeveridades,
};

export default EnfermedadesLocalService;
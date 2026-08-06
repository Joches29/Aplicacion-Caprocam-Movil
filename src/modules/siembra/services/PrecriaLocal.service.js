/**
 * ============================================================
 * SERVICE LOCAL DE PRE-CRIA
 * ============================================================
 *
 * Centraliza las operaciones locales de Pre-Cria usando SQLite.
 *
 * Mantiene una API similar al service HTTP (precria.service.js)
 * para que los hooks puedan trabajar con datos locales sin
 * cambiar la pantalla. Sigue el mismo patron que
 * SiembraLocal.services.js / EnfermedadesLocal.service.js.
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

async function ejecutarMetodoPrecrias(tipoMetodo, argumentos = []) {
    const apiPrecrias = localApi.precrias;

    if (!apiPrecrias) {
        throw new Error("localApi.precrias no esta disponible.");
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (typeof apiPrecrias[nombreMetodo] === "function") {
            return await apiPrecrias[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local para precrias: ${tipoMetodo}`);
}

/*
============================================================
MAPEADORES
============================================================
*/

function mapearPrecriaDesdeLocal(registro) {
    return registro
        ? {
            id: obtenerValor(registro, ["id"], null),
            servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
            uuid: obtenerValor(registro, ["uuid"], ""),
            grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

            loteLarvaId: obtenerValor(registro, ["lote_larva_id", "loteLarvaId"], null),
            fincaId: obtenerValor(registro, ["finca_id", "fincaId"], null),
            estanqueId: obtenerValor(registro, ["estanque_id", "estanqueId"], null),

            fechaInicio: obtenerValor(registro, ["fecha_inicio", "fechaInicio"], ""),
            fechaFin: obtenerValor(registro, ["fecha_fin", "fechaFin"], null),
            duracionDias: obtenerValor(registro, ["duracion_dias", "duracionDias"], null),
            cantidadInicial: obtenerValor(
                registro,
                ["cantidad_inicial", "cantidadInicial"],
                null
            ),
            cantidadFinal: obtenerValor(registro, ["cantidad_final", "cantidadFinal"], null),
            plInicial: obtenerValor(registro, ["pl_inicial", "plInicial"], null),
            plFinal: obtenerValor(registro, ["pl_final", "plFinal"], null),

            estado: obtenerValor(registro, ["estado"], "Activa"),

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
        }
        : null;
}

async function mapearPrecriaParaLocal(precriaDTO) {
    const contexto = await obtenerContextoLocal();

    const grupoDatos = obtenerValor(
        precriaDTO,
        ["grupoDatos", "grupo_datos"],
        contexto.grupoDatos
    );

    const loteLarvaId = obtenerValor(
        precriaDTO,
        ["loteLarvaId", "lote_larva_id"],
        null
    );

    const fincaId = obtenerValor(precriaDTO, ["fincaId", "finca_id"], null);
    const estanqueId = obtenerValor(precriaDTO, ["estanqueId", "estanque_id"], null);
    const fechaInicio = obtenerValor(precriaDTO, ["fechaInicio", "fecha_inicio"], "");
    const fechaFin = obtenerValor(precriaDTO, ["fechaFin", "fecha_fin"], null);
    const duracionDias = obtenerValor(precriaDTO, ["duracionDias", "duracion_dias"], null);
    const cantidadInicial = obtenerValor(
        precriaDTO,
        ["cantidadInicial", "cantidad_inicial"],
        null
    );
    const cantidadFinal = obtenerValor(precriaDTO, ["cantidadFinal", "cantidad_final"], null);
    const plInicial = obtenerValor(precriaDTO, ["plInicial", "pl_inicial"], null);
    const plFinal = obtenerValor(precriaDTO, ["plFinal", "pl_final"], null);

    const creadoPorColaboradorId = obtenerValor(
        precriaDTO,
        ["creadoPorColaboradorId", "creado_por_colaborador_id"],
        contexto.colaboradorId
    );

    const creadoPorUsuarioId = obtenerValor(
        precriaDTO,
        ["creadoPorUsuarioId", "creado_por_usuario_id"],
        null
    );

    return {
        grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
        lote_larva_id: convertirNumero(loteLarvaId, null),
        finca_id: convertirNumero(fincaId, null),
        estanque_id: convertirNumero(estanqueId, null),
        fecha_inicio: convertirTexto(fechaInicio),
        fecha_fin: fechaFin !== null && fechaFin !== "" ? convertirTexto(fechaFin) : null,
        duracion_dias:
            duracionDias !== null && duracionDias !== ""
                ? convertirNumero(duracionDias, null)
                : null,
        cantidad_inicial:
            cantidadInicial !== null && cantidadInicial !== ""
                ? convertirNumero(cantidadInicial, null)
                : null,
        cantidad_final:
            cantidadFinal !== null && cantidadFinal !== ""
                ? convertirNumero(cantidadFinal, null)
                : null,
        pl_inicial: plInicial !== null && plInicial !== "" ? convertirNumero(plInicial, null) : null,
        pl_final: plFinal !== null && plFinal !== "" ? convertirNumero(plFinal, null) : null,
        estado: convertirTexto(precriaDTO.estado, "Activa"),
        creado_por_usuario_id: creadoPorUsuarioId,
        creado_por_colaborador_id: creadoPorColaboradorId,
    };
}

function aplicarFiltros(registros, filtros = {}) {
    const fincaId = obtenerValor(filtros, ["fincaId", "finca_id"], null);
    const estanqueId = obtenerValor(filtros, ["estanqueId", "estanque_id"], null);
    const estado = obtenerValor(filtros, ["estado"], null);

    return registros.filter((item) => {
        const coincideFinca = fincaId ? Number(item.fincaId) === Number(fincaId) : true;
        const coincideEstanque = estanqueId ? Number(item.estanqueId) === Number(estanqueId) : true;
        const coincideEstado = estado ? String(item.estado) === String(estado) : true;

        return coincideFinca && coincideEstanque && coincideEstado;
    });
}

/*
============================================================
OPERACIONES LOCALES
============================================================
*/

async function getAll(filtros = {}) {
    try {
        const respuesta = await ejecutarMetodoPrecrias("obtenerTodos");
        const data = obtenerDataRespuesta(respuesta);
        const registros = Array.isArray(data) ? data : [];

        return aplicarFiltros(
            registros.map(mapearPrecriaDesdeLocal).filter(Boolean),
            filtros
        );
    } catch (error) {
        console.error("Error al obtener pre-crias locales", extraerError(error));
        throw error;
    }
}

async function getById(id) {
    try {
        const respuesta = await ejecutarMetodoPrecrias("obtenerPorId", [id]);

        return mapearPrecriaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al obtener la pre-cria local", extraerError(error));
        throw error;
    }
}

async function create(precriaDTO) {
    try {
        const datosLocales = await mapearPrecriaParaLocal(precriaDTO);
        const respuesta = await ejecutarMetodoPrecrias("crear", [datosLocales]);

        return mapearPrecriaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al crear la pre-cria local", extraerError(error));
        throw error;
    }
}

async function update(id, precriaDTO) {
    try {
        const datosLocales = await mapearPrecriaParaLocal(precriaDTO);
        const respuesta = await ejecutarMetodoPrecrias("actualizar", [
            id,
            datosLocales,
        ]);

        return mapearPrecriaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al actualizar la pre-cria local", extraerError(error));
        throw error;
    }
}

async function deleteById(id) {
    try {
        const respuesta = await ejecutarMetodoPrecrias("eliminar", [id]);

        return mapearPrecriaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al eliminar la pre-cria local", extraerError(error));
        throw error;
    }
}

async function finalizar(id, finalizarDTO) {
    try {
        const datosLocales = {
            fecha_fin: convertirTexto(
                obtenerValor(finalizarDTO, ["fechaFin", "fecha_fin"], "")
            ),
            cantidad_final: convertirNumero(
                obtenerValor(finalizarDTO, ["cantidadFinal", "cantidad_final"], 0),
                0
            ),
            pl_final: (() => {
                const valor = obtenerValor(finalizarDTO, ["plFinal", "pl_final"], null);
                return valor !== null && valor !== "" ? convertirNumero(valor, null) : null;
            })(),
            estado: "Finalizada",
        };

        const respuesta = await ejecutarMetodoPrecrias("actualizar", [id, datosLocales]);

        return mapearPrecriaDesdeLocal(obtenerDataRespuesta(respuesta));
    } catch (error) {
        console.error("Error al finalizar la pre-cria local", extraerError(error));
        throw error;
    }
}

/*
============================================================
EXPORT
============================================================
*/

const PrecriaLocalService = {
    getAll,
    getById,
    create,
    update,
    deleteById,
    finalizar,
};

export default PrecriaLocalService;
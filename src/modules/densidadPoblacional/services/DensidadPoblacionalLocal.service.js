/**
 * ============================================================
 * SERVICE LOCAL DE DENSIDAD POBLACIONAL
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de densidad
 * poblacional usando SQLite.
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

const METODOS_CONTEO = [
    "Directo",
];

const AREAS_ATARRAYA = [
    2.5,
    3.5,
    4.5,
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

        const valor =
            await AsyncStorage.getItem(llave);

        return valor
            ? JSON.parse(valor)
            : null;

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
        grupoDatos: convertirNumero(
            grupoDatos,
            1
        ),
        colaboradorId: colaboradorId,
    };
}

async function ejecutarMetodoDensidad(tipoMetodo, argumentos = []) {

    const apiDensidad =
        localApi.densidadPoblacional;


    if (!apiDensidad) {
        throw new Error(
            "localApi.densidad_poblacional no esta disponible."
        );
    }


    const nombres =
        METODOS_LOCAL_API[tipoMetodo] || [];


    for (
        let i = 0;
        i < nombres.length;
        i += 1
    ) {

        const nombreMetodo =
            nombres[i];


        if (
            typeof apiDensidad[nombreMetodo] === "function"
        ) {

            return await apiDensidad[nombreMetodo](
                ...argumentos
            );
        }
    }


    throw new Error(
        `No existe metodo local para densidad poblacional: ${tipoMetodo}`
    );
}

/*
============================================================
MAPEADORES
============================================================
*/

function mapearDensidadDesdeLocal(registro) {

    return registro
        ? {

            id:
                obtenerValor(
                    registro,
                    ["id"],
                    null
                ),

            servidorId:
                obtenerValor(
                    registro,
                    ["servidor_id", "servidorId"],
                    null
                ),

            uuid:
                obtenerValor(
                    registro,
                    ["uuid"],
                    ""
                ),

            grupoDatos:
                obtenerValor(
                    registro,
                    ["grupo_datos", "grupoDatos"],
                    null
                ),

            fincaId:
                obtenerValor(
                    registro,
                    ["finca_id", "fincaId"],
                    null
                ),

            estanqueId:
                obtenerValor(
                    registro,
                    ["estanque_id", "estanqueId"],
                    null
                ),

            colaboradorId:
                obtenerValor(
                    registro,
                    ["colaborador_id", "colaboradorId"],
                    null
                ),

            fecha:
                obtenerValor(
                    registro,
                    ["fecha"],
                    ""
                ),

            cantidadSiembra:
                obtenerValor(
                    registro,
                    [
                        "cantidad_siembra",
                        "cantidadSiembra"
                    ],
                    0
                ),

            areaEstanque:
                obtenerValor(
                    registro,
                    [
                        "area_estanque",
                        "areaEstanque"
                    ],
                    0
                ),

            numeroCamarones:
                obtenerValor(
                    registro,
                    [
                        "numero_camarones",
                        "numeroCamarones"
                    ],
                    0
                ),

            tirosAtarraya:
                obtenerValor(
                    registro,
                    [
                        "tiros_atarraya",
                        "tirosAtarraya"
                    ],
                    0
                ),

            areaAtarraya:
                obtenerValor(
                    registro,
                    [
                        "area_atarraya",
                        "areaAtarraya"
                    ],
                    0
                ),

            promedioPorTiro:
                obtenerValor(
                    registro,
                    [
                        "promedio_por_tiro",
                        "promedioPorTiro"
                    ],
                    0
                ),

            sobrevivencia:
                obtenerValor(
                    registro,
                    ["sobrevivencia"],
                    0
                ),

            densidad:
                obtenerValor(
                    registro,
                    ["densidad"],
                    0
                ),

            notasConteo:
                obtenerValor(
                    registro,
                    [
                        "notas_conteo",
                        "notasConteo"
                    ],
                    ""
                ),

            activo:
                obtenerValor(
                    registro,
                    ["activo"],
                    1
                ),

            sincronizado:
                obtenerValor(
                    registro,
                    ["sincronizado"],
                    0
                ),

            pendienteSync:
                obtenerValor(
                    registro,
                    [
                        "pendiente_sync",
                        "pendienteSync"
                    ],
                    1
                ),

        }
        : null;
}


async function mapearDensidadParaLocal(densidadDTO) {

    const contexto =
        await obtenerContextoLocal();


    return {

        grupo_datos:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "grupoDatos",
                        "grupo_datos"
                    ],
                    contexto.grupoDatos
                ),
                contexto.grupoDatos
            ),


        finca_id:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "fincaId",
                        "finca_id",
                        "idFinca"
                    ],
                    null
                ),
                null
            ),


        estanque_id:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "estanqueId",
                        "estanque_id",
                        "idEstanque"
                    ],
                    null
                ),
                null
            ),


        colaborador_id:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "colaboradorId",
                        "colaborador_id"
                    ],
                    contexto.colaboradorId
                ),
                null
            ),


        fecha:
            convertirTexto(
                obtenerValor(
                    densidadDTO,
                    ["fecha"],
                    ""
                )
            ),


        cantidad_siembra:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "cantidadSiembra",
                        "cantidad_siembra"
                    ],
                    0
                ),
                0
            ),


        area_estanque:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "areaEstanque",
                        "area_estanque"
                    ],
                    0
                ),
                0
            ),


        numero_camarones:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "numeroCamarones",
                        "numero_camarones"
                    ],
                    0
                ),
                0
            ),


        tiros_atarraya:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "tirosAtarraya",
                        "tiros_atarraya"
                    ],
                    0
                ),
                0
            ),


        area_atarraya:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "areaAtarraya",
                        "area_atarraya"
                    ],
                    0
                ),
                0
            ),


        promedio_por_tiro:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "promedioPorTiro",
                        "promedio_por_tiro"
                    ],
                    0
                ),
                0
            ),


        sobrevivencia:
            convertirNumero(
                obtenerValor(
                    densidadDTO,
                    [
                        "sobrevivencia"
                    ],
                    0
                ),
                0
            ),


        densidad: (() => {
            const valorDirecto = obtenerValor(
                densidadDTO,
                ["densidad"],
                null
            );

            if (valorDirecto !== null && valorDirecto !== undefined && valorDirecto !== "") {
                return convertirNumero(valorDirecto, 0);
            }

            const numeroCamarones = convertirNumero(
                obtenerValor(densidadDTO, ["numeroCamarones", "numero_camarones"], 0),
                0
            );
            const areaEstanque = convertirNumero(
                obtenerValor(densidadDTO, ["areaEstanque", "area_estanque"], 0),
                0
            );

            if (areaEstanque > 0) {
                return convertirNumero(numeroCamarones / areaEstanque, 0);
            }

            return 0;
        })(),


        notas_conteo:
            convertirTexto(
                obtenerValor(
                    densidadDTO,
                    [
                        "notasConteo",
                        "notas_conteo"
                    ],
                    ""
                )
            ),
    };
}
/*
============================================================
FILTROS
============================================================
*/

function aplicarFiltros(registros, filtros = {}) {

    const fincaId =
        obtenerValor(
            filtros,
            ["fincaId", "finca_id"],
            null
        );

    const estanqueId =
        obtenerValor(
            filtros,
            ["estanqueId", "estanque_id"],
            null
        );

    const colaboradorId =
        obtenerValor(
            filtros,
            ["colaboradorId", "colaborador_id"],
            null
        );


    return registros.filter((item) => {

        const coincideFinca =
            fincaId
                ? Number(item.fincaId) === Number(fincaId)
                : true;


        const coincideEstanque =
            estanqueId
                ? Number(item.estanqueId) === Number(estanqueId)
                : true;


        const coincideColaborador =
            colaboradorId
                ? Number(item.colaboradorId) === Number(colaboradorId)
                : true;


        return (
            coincideFinca &&
            coincideEstanque &&
            coincideColaborador
        );
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
            await ejecutarMetodoDensidad(
                "obtenerTodos"
            );


        const data =
            obtenerDataRespuesta(respuesta);


        const registros =
            Array.isArray(data)
                ? data
                : [];


        return aplicarFiltros(
            registros
                .map(mapearDensidadDesdeLocal)
                .filter(Boolean),
            filtros
        );


    } catch (error) {

        console.error(
            "Error al obtener densidades locales",
            extraerError(error)
        );

        throw error;
    }
}


async function getById(id) {

    try {

        const respuesta =
            await ejecutarMetodoDensidad(
                "obtenerPorId",
                [id]
            );


        return mapearDensidadDesdeLocal(
            obtenerDataRespuesta(respuesta)
        );


    } catch (error) {

        console.error(
            "Error al obtener densidad local",
            extraerError(error)
        );

        throw error;
    }
}


async function create(densidadDTO) {

    try {

        const datosLocales =
            await mapearDensidadParaLocal(
                densidadDTO
            );


        const respuesta =
            await ejecutarMetodoDensidad(
                "crear",
                [
                    datosLocales
                ]
            );


        return mapearDensidadDesdeLocal(
            obtenerDataRespuesta(respuesta)
        );


    } catch (error) {

        console.error(
            "Error al crear densidad local",
            extraerError(error)
        );

        throw error;
    }
}


async function update(id, densidadDTO) {

    try {

        const datosLocales =
            await mapearDensidadParaLocal(
                densidadDTO
            );


        const respuesta =
            await ejecutarMetodoDensidad(
                "actualizar",
                [
                    id,
                    datosLocales
                ]
            );


        return mapearDensidadDesdeLocal(
            obtenerDataRespuesta(respuesta)
        );


    } catch (error) {

        console.error(
            "Error al actualizar densidad local",
            extraerError(error)
        );

        throw error;
    }
}


async function deleteById(id) {

    try {

        const respuesta =
            await ejecutarMetodoDensidad(
                "eliminar",
                [
                    id
                ]
            );


        return mapearDensidadDesdeLocal(
            obtenerDataRespuesta(respuesta)
        );


    } catch (error) {

        console.error(
            "Error al eliminar densidad local",
            extraerError(error)
        );

        throw error;
    }
}


async function getMetodosConteo() {
    return METODOS_CONTEO;
}


async function getAreasAtarraya() {
    return AREAS_ATARRAYA;
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

    getMetodosConteo,
    getAreasAtarraya,

};

export default DensidadPoblacionalLocalService;
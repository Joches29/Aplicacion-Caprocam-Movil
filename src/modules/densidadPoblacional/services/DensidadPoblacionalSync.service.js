/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE DENSIDAD POBLACIONAL
 * ============================================================
 *
 * Sincroniza los registros locales de densidad poblacional
 * con el backend.
 *
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro se elimina fisicamente de SQLite.
 */

import DensidadPoblacionalService from "./DensidadPoblacional.service";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_DENSIDAD = "densidad_poblacional";

/*
============================================================
HELPERS
============================================================
*/

const obtenerDataRespuesta = (respuesta) =>
    respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

const convertirNumero = (valor, valorDefecto = 0) => {
    const numero = Number(valor);

    return Number.isNaN(numero)? valorDefecto: numero;
};

const obtenerValor = (objeto,llaves,valorDefecto = null) => {

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
};

/*
============================================================
OBTENER PENDIENTES
============================================================
*/

const obtenerPendientesDensidad = async () => {

    const respuesta =
        await localApi.sync.obtenerPendientes();


    const data =
        obtenerDataRespuesta(respuesta);


    const pendientes =
        Array.isArray(data)
            ? data
            : [];


    return pendientes.filter(
        (item) =>
            item.tabla === TABLA_DENSIDAD
    );
};

/*
============================================================
MAPEAR SQLITE -> BACKEND
============================================================
*/

const mapearDensidadParaBackend = (registro) => {

    return {

        fincaId:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "finca_id",
                        "fincaId"
                    ],
                    null
                ),
                null
            ),

        estanqueId:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "estanque_id",
                        "estanqueId"
                    ],
                    null
                ),
                null
            ),

        colaboradorId:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "colaborador_id",
                        "colaboradorId"
                    ],
                    null
                ),
                null
            ),

        fecha:
            obtenerValor(
                registro,
                [
                    "fecha"
                ],
                ""
            ),

        cantidadSiembra:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "cantidad_siembra",
                        "cantidadSiembra"
                    ],
                    0
                ),
                0
            ),

        areaEstanque:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "area_estanque",
                        "areaEstanque"
                    ],
                    0
                ),
                0
            ),

        numeroCamarones:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "numero_camarones",
                        "numeroCamarones"
                    ],
                    0
                ),
                0
            ),

        tirosAtarraya:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "tiros_atarraya",
                        "tirosAtarraya"
                    ],
                    0
                ),
                0
            ),

        areaAtarraya:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "area_atarraya",
                        "areaAtarraya"
                    ],
                    0
                ),
                0
            ),

        promedioPorTiro:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "promedio_por_tiro",
                        "promedioPorTiro"
                    ],
                    0
                ),
                0
            ),

        sobrevivencia:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "sobrevivencia"
                    ],
                    0
                ),
                0
            ),

        densidad:
            convertirNumero(
                obtenerValor(
                    registro,
                    [
                        "densidad"
                    ],
                    0
                ),
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
    };
};

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {

    const payload =
        mapearDensidadParaBackend(registro);


    return await DensidadPoblacionalService.create(payload);
};


const sincronizarUpdate = async (registro) => {

    const servidorId =
        obtenerValor(
            registro,
            [
                "servidor_id",
                "servidorId"
            ],
            null
        );


    const payload =
        mapearDensidadParaBackend(registro);


    return servidorId
        ? await DensidadPoblacionalService.update(
            servidorId,
            payload
        )
        : await DensidadPoblacionalService.create(
            payload
        );
};


const sincronizarDelete = async (registro) => {

    const servidorId =
        obtenerValor(
            registro,
            [
                "servidor_id",
                "servidorId"
            ],
            null
        );


    return servidorId
        ? await DensidadPoblacionalService.deleteById(
            servidorId
        )
        : {
            eliminadoSoloLocal: true
        };
};


const sincronizarRegistro = async (pendiente) => {

    const accion =
        pendiente.accion;


    const registro =
        pendiente.registro;


    if (accion === "DELETE") {

        return await sincronizarDelete(
            registro
        );

    }


    if (accion === "UPDATE") {

        return await sincronizarUpdate(
            registro
        );

    }


    return await sincronizarCreate(
        registro
    );
};

/*
============================================================
FUNCION PRINCIPAL
============================================================
*/

async function sincronizarDensidadPendiente() {

    const resultado = {

        total: 0,

        sincronizados: 0,

        errores: [],

    };


    await localApi.inicializar();


    const pendientes =
        await obtenerPendientesDensidad();


    resultado.total =
        pendientes.length;


    for (
        let i = 0;
        i < pendientes.length;
        i += 1
    ) {

        const pendiente =
            pendientes[i];


        const registro =
            pendiente.registro;


        try {

            await sincronizarRegistro(
                pendiente
            );


            await eliminarRegistroLocalDespuesSync(
                TABLA_DENSIDAD,
                registro.id
            );


            resultado.sincronizados += 1;


        } catch(error) {

            resultado.errores.push({

                id:
                    registro?.id ?? null,

                accion:
                    pendiente.accion,

                mensaje:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Error al sincronizar densidad poblacional.",

            });
        }
    }


    return resultado;
}

/*
============================================================
EXPORT
============================================================
*/

const DensidadPoblacionalSyncService = {

    sincronizarDensidadPendiente,

};


export default DensidadPoblacionalSyncService;
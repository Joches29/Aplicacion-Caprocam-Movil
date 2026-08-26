/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE ESTANQUES
 * ============================================================
 *
 * Descarga los estanques desde el backend y los guarda en
 * SQLite local como datos base/cache.
 *
 * Este modulo NO sincroniza cambios locales hacia el backend,
 * porque en movil los colaboradores solo consultan estanques.
 */

import { estanqueService } from "./estanque.service";
import { localApi } from "../../../database/local/localApi.service";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const TABLA_ESTANQUES = "estanques";

/*
//////////////////////////////////////////////////////////
HELPERS GENERALES
//////////////////////////////////////////////////////////
*/

const obtenerDataRespuesta = (respuesta) => {
    if (respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")) {
        return respuesta.data;
    }

    return respuesta;
};

const tieneValor = (valor) => {
    return valor !== undefined && valor !== null && String(valor).trim() !== "";
};

const convertirNumero = (valor, valorDefecto = 0) => {
    if (!tieneValor(valor)) {
        return valorDefecto;
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
        return valorDefecto;
    }

    return numero;
};

const convertirTexto = (valor, valorDefecto = "") => {
    if (!tieneValor(valor)) {
        return valorDefecto;
    }

    return String(valor);
};

const convertirBooleano = (valor) => {
    if (valor === true || valor === 1 || valor === "1") {
        return 1;
    }

    if (valor === false || valor === 0 || valor === "0") {
        return 0;
    }

    const texto = String(valor ?? "").trim().toLowerCase();

    if (texto === "true" || texto === "si" || texto === "sí") {
        return 1;
    }

    return 0;
};

const normalizarFecha = (valor) => {
    if (!tieneValor(valor)) {
        return null;
    }

    const texto = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
        return texto.slice(0, 10);
    }

    return texto;
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

/*
//////////////////////////////////////////////////////////
MAPEO BACKEND A SQLITE
//////////////////////////////////////////////////////////
*/

const mapearEstanqueDesdeBackend = (estanque) => {
    const servidorId = obtenerValor(
        estanque,
        ["id", "servidor_id", "servidorId"],
        null
    );

    const uuid = obtenerValor(
        estanque,
        ["uuid"],
        tieneValor(servidorId) ? `estanque-servidor-${servidorId}` : null
    );

    const fincaId = obtenerValor(
        estanque,
        ["fincaId", "idFinca", "finca_id", "id_finca"],
        null
    );

    const tipoEstanque = obtenerValor(
        estanque,
        ["tipoEstanque", "tipo_estanque"],
        ""
    );

    const fuenteAgua = obtenerValor(
        estanque,
        ["fuenteAgua", "fuente_agua"],
        null
    );

    const fechaMantenimiento = obtenerValor(
        estanque,
        ["fechaMantenimiento", "fecha_mantenimiento", "fechaUltimoMantenimiento"],
        null
    );

    const precria = obtenerValor(
        estanque,
        ["precria", "usaPrecria", "usa_precria"],
        0
    );

    return {
        servidor_id: convertirNumero(servidorId, null),
        uuid: uuid,

        grupo_datos: convertirNumero(
            obtenerValor(estanque, ["grupoDatos", "grupo_datos"], 1),
            1
        ),

        finca_id: convertirNumero(fincaId, null),
        codigo: convertirTexto(obtenerValor(estanque, ["codigo"], "")).trim(),
        tipo_estanque: convertirTexto(tipoEstanque).trim(),
        estado: convertirTexto(obtenerValor(estanque, ["estado"], "Activo")).trim(),

        largo: convertirNumero(obtenerValor(estanque, ["largo"], 0), 0),
        ancho: convertirNumero(obtenerValor(estanque, ["ancho"], 0), 0),
        profundidad: convertirNumero(
            obtenerValor(estanque, ["profundidad"], 0),
            0
        ),

        fuente_agua: tieneValor(fuenteAgua) ? convertirTexto(fuenteAgua).trim() : null,
        fecha_mantenimiento: normalizarFecha(fechaMantenimiento),
        precria: convertirBooleano(precria),

        creado_por_usuario_id: convertirNumero(
            obtenerValor(
                estanque,
                ["creadoPorUsuarioId", "creado_por_usuario_id"],
                null
            ),
            null
        ),

        creado_por_colaborador_id: convertirNumero(
            obtenerValor(
                estanque,
                ["creadoPorColaboradorId", "creado_por_colaborador_id"],
                null
            ),
            null
        ),

        activo: convertirNumero(obtenerValor(estanque, ["activo"], 1), 1),
        sincronizado: 1,
        pendiente_sync: 0,
        accion_sync: null,
        fecha_sync: new Date().toISOString(),
    };
};

/*
//////////////////////////////////////////////////////////
GUARDADO LOCAL
//////////////////////////////////////////////////////////
*/

const guardarEstanqueDesdeBackend = async (estanqueLocal) => {
    return await localApi.sync.guardarDesdeServidor(
        TABLA_ESTANQUES,
        [estanqueLocal]
    );
};

const obtenerEstanquesBackend = async () => {
    const respuesta = await estanqueService.getEstanques();
    const data = obtenerDataRespuesta(respuesta);

    return Array.isArray(data) ? data : [];
};

/*
//////////////////////////////////////////////////////////
FUNCION PRINCIPAL
//////////////////////////////////////////////////////////
*/

async function sincronizarEstanquesDesdeBackend() {
    const resultado = {
        totalBackend: 0,
        guardadosLocalmente: 0,
        errores: [],
    };

    await localApi.inicializar();

    const estanquesBackend = await obtenerEstanquesBackend();

    resultado.totalBackend = estanquesBackend.length;

    for (let i = 0; i < estanquesBackend.length; i += 1) {
        const estanqueBackend = estanquesBackend[i];

        try {
            const estanqueLocal = mapearEstanqueDesdeBackend(estanqueBackend);

            await guardarEstanqueDesdeBackend(estanqueLocal);

            resultado.guardadosLocalmente += 1;
        } catch (error) {
            resultado.errores.push({
                id: obtenerValor(estanqueBackend, ["id"], null),
                codigo: obtenerValor(estanqueBackend, ["codigo"], ""),
                mensaje:
                    error?.response?.data?.message ||
                    error?.message ||
                    "Error al guardar estanque local.",
            });
        }
    }

    return resultado;
}

/*
//////////////////////////////////////////////////////////
EXPORT
//////////////////////////////////////////////////////////
*/

const EstanqueSyncService = {
    sincronizarEstanquesDesdeBackend,
};

export default EstanqueSyncService;
/**
 * ============================================================
 * SERVICE LOCAL DE ESTANQUES
 * ============================================================
 *
 * Consulta estanques guardados en SQLite local.
 *
 * Este modulo no crea, edita ni elimina estanques desde movil.
 * Los estanques se cargan localmente por sincronizacion desde
 * el backend y se usan como datos base para otros modulos.
 */

import { localApi } from "../../../database/local/localApi.service";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const METODOS_LOCAL_API = {
    obtenerTodos: ["obtenerTodos", "getAll", "listar"],
    obtenerPorId: ["obtenerPorId", "getById", "buscarPorId"],
};

/*
//////////////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////////////
*/

const obtenerDataRespuesta = (respuesta) => {
    if (respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")) {
        return respuesta.data;
    }

    return respuesta;
};

function tieneValor(valor) {
    return valor !== undefined && valor !== null && String(valor).trim() !== "";
}

function valoresIguales(valorUno, valorDos) {
    if (!tieneValor(valorUno) || !tieneValor(valorDos)) {
        return false;
    }

    return String(valorUno) === String(valorDos);
}

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

const convertirBooleanoUI = (valor) => {
    return (
        valor === true ||
        valor === 1 ||
        valor === "1" ||
        valor === "true" ||
        valor === "si" ||
        valor === "sí"
    );
};

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function estanqueEstaActivo(estanque) {
    const estado = normalizarTexto(estanque?.estado);

    return estado === "activo" || estado === "engorde";
}

async function ejecutarMetodoEstanques(tipoMetodo, argumentos = []) {
    const apiEstanques = localApi.estanques;

    if (!apiEstanques) {
        throw new Error("localApi.estanques no esta disponible.");
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (typeof apiEstanques[nombreMetodo] === "function") {
            return await apiEstanques[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local para estanques: ${tipoMetodo}`);
}

/*
//////////////////////////////////////////////////////////
MAPEADOR
//////////////////////////////////////////////////////////
*/

function mapearEstanqueDesdeLocal(registro) {
    if (!registro) {
        return null;
    }

    const id = obtenerValor(registro, ["id"], null);
    const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
    const fincaId = obtenerValor(registro, ["finca_id", "fincaId", "idFinca"], null);
    const precria = obtenerValor(registro, ["precria", "usaPrecria", "usa_precria"], 0);
    const tipoEstanque = obtenerValor(registro, ["tipo_estanque", "tipoEstanque"], "");
    const fuenteAgua = obtenerValor(registro, ["fuente_agua", "fuenteAgua"], "");
    const fechaMantenimiento = obtenerValor(registro, ["fecha_mantenimiento", "fechaMantenimiento"], null);

    return {
        id: id,
        value: servidorId || id,
        servidorId: servidorId,
        servidor_id: servidorId,
        uuid: obtenerValor(registro, ["uuid"], ""),

        grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),
        grupo_datos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

        fincaId: fincaId,
        finca_id: fincaId,
        idFinca: fincaId,

        codigo: obtenerValor(registro, ["codigo"], ""),
        label: obtenerValor(registro, ["codigo"], ""),

        tipoEstanque: tipoEstanque,
        tipo_estanque: tipoEstanque,

        estado: obtenerValor(registro, ["estado"], "Activo"),
        estaActivo: estanqueEstaActivo(registro),

        largo: obtenerValor(registro, ["largo"], 0),
        ancho: obtenerValor(registro, ["ancho"], 0),
        profundidad: obtenerValor(registro, ["profundidad"], 0),

        fuenteAgua: fuenteAgua,
        fuente_agua: fuenteAgua,

        fechaMantenimiento: fechaMantenimiento,
        fecha_mantenimiento: fechaMantenimiento,

        precria: convertirBooleanoUI(precria),
        usaPrecria: convertirBooleanoUI(precria),
        usa_precria: convertirBooleanoUI(precria) ? 1 : 0,

        activo: obtenerValor(registro, ["activo"], 1),
        sincronizado: obtenerValor(registro, ["sincronizado"], 1),
        pendienteSync: obtenerValor(registro, ["pendiente_sync", "pendienteSync"], 0),
        accionSync: obtenerValor(registro, ["accion_sync", "accionSync"], null),
    };
}

/*
//////////////////////////////////////////////////////////
FILTROS
//////////////////////////////////////////////////////////
*/

function aplicarFiltros(registros, filtros = {}) {
    const fincaId = obtenerValor(filtros, ["fincaId", "idFinca", "finca_id"], null);
    const fincaIds = obtenerValor(filtros, ["fincaIds", "idsFinca"], []);
    const estado = obtenerValor(filtros, ["estado"], null);
    const soloActivos = obtenerValor(filtros, ["soloActivos"], false);

    return registros.filter((item) => {
        const coincideFinca = fincaId
            ? valoresIguales(item.fincaId, fincaId)
            : true;

        const coincideFincaLista = Array.isArray(fincaIds) && fincaIds.length > 0
            ? fincaIds.some((id) => valoresIguales(item.fincaId, id))
            : true;

        const coincideEstado = estado
            ? valoresIguales(item.estado, estado)
            : true;

        const coincideActivo = soloActivos
            ? estanqueEstaActivo(item)
            : true;

        return coincideFinca && coincideFincaLista && coincideEstado && coincideActivo;
    });
}

/*
//////////////////////////////////////////////////////////
CONSULTAS LOCALES
//////////////////////////////////////////////////////////
*/

async function getEstanques(filtros = {}) {
    const respuesta = await ejecutarMetodoEstanques("obtenerTodos");
    const data = obtenerDataRespuesta(respuesta);
    const registros = Array.isArray(data) ? data : [];

    return aplicarFiltros(
        registros.map(mapearEstanqueDesdeLocal).filter(Boolean),
        filtros
    );
}

async function getEstanqueById(id) {
    const estanques = await getEstanques();

    return estanques.find((item) => {
        return (
            valoresIguales(item.id, id) ||
            valoresIguales(item.value, id) ||
            valoresIguales(item.servidorId, id) ||
            valoresIguales(item.servidor_id, id)
        );
    }) || null;
}

async function getEstanquesPorFinca(fincaId) {
    return await getEstanques({ fincaId });
}

async function getEstanquesActivosPorFinca(fincaId) {
    return await getEstanques({
        fincaId,
        soloActivos: true,
    });
}

/*
//////////////////////////////////////////////////////////
EXPORT
//////////////////////////////////////////////////////////
*/

const EstanqueLocalService = {
    getEstanques,
    getEstanqueById,
    getEstanquesPorFinca,
    getEstanquesActivosPorFinca,
    estanqueEstaActivo,
};

export {
    getEstanques,
    getEstanqueById,
    getEstanquesPorFinca,
    getEstanquesActivosPorFinca,
    estanqueEstaActivo,
};

export default EstanqueLocalService;
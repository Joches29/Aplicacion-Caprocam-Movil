/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: TrazabilidadServices.js
Modulo: Trazabilidad (Movil)
Descripcion:
Version SQLite offline-first del service de Trazabilidad.
Lee los catalogos locales de fincas, estanques, colaboradores
y siembras para trabajar sin depender del backend.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from "../../../database/local/localApi.service";
import {
    getToken,
    getUsuario,
    cargarSesionPersistida
} from "../../login/utils/tokenStorage";
import { decodeToken } from "../../../shared/utils/jwtUtils";
import { obtenerColaboradorIdSesion } from "../../../shared/utils/sessionUtils";
import {
    obtenerRegistrosLocal,
    obtenerRegistroLocalPorId,
    crearRegistroLocal
} from "./TrazabilidadLocal.service";

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS - GENERALES
//////////////////////////////////////////////////////////
*/

const obtenerDatosLocal = (respuesta) => {
    if (!respuesta || respuesta.success !== true) {
        return [];
    }

    return Array.isArray(respuesta.data) ? respuesta.data : [];
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

function listaIncluyeValor(lista, valor) {
    if (!Array.isArray(lista)) {
        return false;
    }

    return lista.some((item) => valoresIguales(item, valor));
}

function obtenerValor(objeto, campos) {
    for (const campo of campos) {
        const valor = objeto?.[campo];

        if (tieneValor(valor)) {
            return valor;
        }
    }

    return undefined;
}

function normalizarTexto(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function obtenerServidorId(registro) {
    return obtenerValor(registro, ["servidor_id", "servidorId"]);
}

function obtenerIdLocal(registro) {
    return obtenerValor(registro, ["id", "value"]);
}

function obtenerIdPrincipal(registro) {
    const servidorId = obtenerServidorId(registro);

    if (tieneValor(servidorId)) {
        return servidorId;
    }

    return obtenerIdLocal(registro);
}

function agregarMapa(mapa, llave, valor) {
    if (!tieneValor(llave) || !tieneValor(valor)) {
        return;
    }

    mapa.set(llave, valor);
    mapa.set(String(llave), valor);
}

function obtenerDeMapa(mapa, llave) {
    if (!tieneValor(llave)) {
        return undefined;
    }

    return mapa.get(llave) ?? mapa.get(String(llave));
}

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS - FINCAS Y ESTANQUES
//////////////////////////////////////////////////////////
*/

function normalizarFinca(finca) {
    const servidorId = obtenerServidorId(finca);
    const id = obtenerIdLocal(finca);

    return {
        ...finca,
        id,
        servidorId,
        servidor_id: servidorId,
        value: tieneValor(servidorId) ? servidorId : id,
        label: obtenerValor(finca, ["nombre_finca", "nombreFinca", "nombre"]) ?? "Finca"
    };
}

function normalizarEstanque(estanque) {
    const servidorId = obtenerServidorId(estanque);
    const id = obtenerIdLocal(estanque);
    const fincaId = obtenerValor(estanque, ["finca_id", "fincaId", "id_finca", "idFinca"]);

    return {
        ...estanque,
        id,
        servidorId,
        servidor_id: servidorId,
        value: tieneValor(servidorId) ? servidorId : id,
        fincaId,
        finca_id: fincaId,
        codigo: obtenerValor(estanque, ["codigo", "nombre", "label"]) ?? "Estanque",
        tipoEstanque: obtenerValor(estanque, ["tipo_estanque", "tipoEstanque"]) ?? "",
        tipo_estanque: obtenerValor(estanque, ["tipo_estanque", "tipoEstanque"]) ?? "",
        estado: obtenerValor(estanque, ["estado"]) ?? "",
        precria: obtenerValor(estanque, ["precria", "usa_precria", "usaPrecria"]) ?? "",
        usa_precria: obtenerValor(estanque, ["precria", "usa_precria", "usaPrecria"]) ?? ""
    };
}

function obtenerIdsValidosFinca(fincas, fincaSeleccionada) {
    const ids = new Set();

    if (tieneValor(fincaSeleccionada)) {
        ids.add(String(fincaSeleccionada));
    }

    const fincaEncontrada = fincas.find((finca) => {
        return (
            valoresIguales(finca.id, fincaSeleccionada) ||
            valoresIguales(finca.value, fincaSeleccionada) ||
            valoresIguales(finca.servidor_id, fincaSeleccionada) ||
            valoresIguales(finca.servidorId, fincaSeleccionada)
        );
    });

    if (fincaEncontrada) {
        const id = obtenerIdLocal(fincaEncontrada);
        const servidorId = obtenerServidorId(fincaEncontrada);

        if (tieneValor(id)) {
            ids.add(String(id));
        }

        if (tieneValor(servidorId)) {
            ids.add(String(servidorId));
        }
    }

    return Array.from(ids);
}

function obtenerIdsValidosEstanque(estanques, estanqueSeleccionado) {
    const ids = new Set();

    if (tieneValor(estanqueSeleccionado)) {
        ids.add(String(estanqueSeleccionado));
    }

    const estanqueEncontrado = estanques.find((estanque) => {
        return (
            valoresIguales(estanque.id, estanqueSeleccionado) ||
            valoresIguales(estanque.value, estanqueSeleccionado) ||
            valoresIguales(estanque.servidor_id, estanqueSeleccionado) ||
            valoresIguales(estanque.servidorId, estanqueSeleccionado)
        );
    });

    if (estanqueEncontrado) {
        const id = obtenerIdLocal(estanqueEncontrado);
        const servidorId = obtenerServidorId(estanqueEncontrado);

        if (tieneValor(id)) {
            ids.add(String(id));
        }

        if (tieneValor(servidorId)) {
            ids.add(String(servidorId));
        }
    }

    return Array.from(ids);
}

function estanquePerteneceAFinca(estanque, idsFinca) {
    const fincaId = obtenerValor(estanque, [
        "finca_id",
        "fincaId",
        "id_finca",
        "idFinca"
    ]);

    return idsFinca.some((id) => valoresIguales(id, fincaId));
}

function siembraPerteneceAEstanque(siembra, idsEstanque) {
    const estanqueId = obtenerValor(siembra, [
        "estanque_id",
        "estanqueId",
        "id_estanque",
        "idEstanque"
    ]);

    return idsEstanque.some((id) => valoresIguales(id, estanqueId));
}

function mapearEstanquesAOptions(estanques) {
    return (estanques ?? []).map((estanque) => {
        const tipo = estanque.tipoEstanque || estanque.tipo_estanque || "";
        const label = tipo
            ? `${estanque.codigo ?? "Estanque"} (${tipo})`
            : `${estanque.codigo ?? "Estanque"}`;

        return {
            label,
            value: obtenerIdPrincipal(estanque),
            id: estanque.id,
            servidorId: estanque.servidorId,
            servidor_id: estanque.servidor_id,
            fincaId: estanque.fincaId,
            finca_id: estanque.finca_id,
            raw: estanque
        };
    });
}

function obtenerTipoEstanque(estanque) {
    const rawTipo = obtenerValor(estanque, ["tipoEstanque", "tipo_estanque"]);

    if (tieneValor(rawTipo)) {
        return normalizarTexto(rawTipo);
    }

    const rawEstado = obtenerValor(estanque, ["estado"]);

    if (tieneValor(rawEstado)) {
        return normalizarTexto(rawEstado);
    }

    return "";
}

export function esEstanquePreCria(estanque) {
    const tipo = obtenerTipoEstanque(estanque);

    if (tipo.includes("pre")) {
        return true;
    }

    if (tipo.includes("engorde")) {
        return false;
    }

    const raw = estanque?.precria ?? estanque?.usa_precria ?? "";
    const val = normalizarTexto(raw);

    if (Number(raw) === 1) {
        return true;
    }

    return val === "si" || val === "yes" || val === "true";
}

export function esEstanqueEngorde(estanque) {
    const tipo = obtenerTipoEstanque(estanque);

    if (tipo.includes("engorde")) {
        return true;
    }

    if (tipo.includes("pre")) {
        return false;
    }

    const raw = estanque?.precria ?? estanque?.usa_precria ?? "";
    const val = normalizarTexto(raw);

    if (Number(raw) === 0) {
        return true;
    }

    if (val === "no" || val === "false") {
        return true;
    }

    const estado = normalizarTexto(obtenerValor(estanque, ["estado"]));

    return estado.includes("engorde") || estado.includes("activo");
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES - LISTADO Y DETALLE
//////////////////////////////////////////////////////////
*/

export async function getRegistros() {
    return obtenerRegistrosLocal();
}

export async function getRegistroPorId(id) {
    const registro = await obtenerRegistroLocalPorId(id);

    if (!registro) {
        throw new Error("Registro de trazabilidad no encontrado localmente.");
    }

    const [fincas, colaboradores, estanques] = await Promise.all([
        obtenerFincas().catch(() => []),
        obtenerColaboradores().catch(() => []),
        obtenerTodosLosEstanques().catch(() => [])
    ]);

    return enriquecerRegistro(
        registro,
        construirMapas({ fincas, colaboradores, estanques })
    );
}

export function filtrarRegistrosTrazabilidad(registros, texto, filtros) {
    const textoBusqueda = String(texto ?? "").trim().toLowerCase();

    return registros.filter((registro) => {
        const coincideBusqueda =
            textoBusqueda === "" ||
            [
                registro.fincaNombre,
                registro.colaboradorNombre,
                registro.estanqueOrigenLabel,
                registro.estanqueDestinoLabel
            ].some((valor) => String(valor ?? "").toLowerCase().includes(textoBusqueda));

        const keyResponsable =
            registro.creadoPorColaboradorId ??
            (registro.creadoPorUsuarioId ? `user_${registro.creadoPorUsuarioId}` : registro.colaboradorNombre);

        const coincideFinca =
            filtros.fincas.length === 0 ||
            listaIncluyeValor(filtros.fincas, registro.fincaId);

        const coincideEstanque =
            (filtros.estanques ?? []).length === 0 ||
            listaIncluyeValor(filtros.estanques, registro.estanqueOrigenId) ||
            listaIncluyeValor(filtros.estanques, registro.estanqueDestinoId);

        const coincideColaborador =
            filtros.colaboradores.length === 0 ||
            listaIncluyeValor(filtros.colaboradores, keyResponsable) ||
            listaIncluyeValor(filtros.colaboradores, registro.colaboradorNombre);

        const coincideFecha =
            filtros.fecha === "" || registro.fecha === filtros.fecha;

        return (
            coincideBusqueda &&
            coincideFinca &&
            coincideEstanque &&
            coincideColaborador &&
            coincideFecha
        );
    });
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES - CREACION
//////////////////////////////////////////////////////////
*/

export async function crearRegistro(datos) {
    const resultado = await crearRegistroLocal(datos);

    if (!resultado.exito) {
        const error = new Error(
            resultado.errores[0] || "No se pudo guardar el registro."
        );

        error.response = {
            status: 400,
            data: {
                message: resultado.errores[0]
            }
        };

        throw error;
    }

    return resultado.registro;
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES - CATALOGOS LOCALES
//////////////////////////////////////////////////////////
*/

export async function obtenerFincas() {
    const respuesta = await localApi.fincas.obtenerTodos();
    const fincas = obtenerDatosLocal(respuesta).map(normalizarFinca);

    return fincas.map((finca) => ({
        label: finca.label,
        value: finca.value,
        id: finca.id,
        servidorId: finca.servidorId,
        servidor_id: finca.servidor_id,
        raw: finca
    }));
}

export async function obtenerEstanquesPorFinca(fincaId) {
    if (!fincaId) {
        return [];
    }

    const [respuestaFincas, respuestaEstanques] = await Promise.all([
        localApi.fincas.obtenerTodos(),
        localApi.estanques.obtenerTodos()
    ]);

    const fincas = obtenerDatosLocal(respuestaFincas).map(normalizarFinca);
    const idsFinca = obtenerIdsValidosFinca(fincas, fincaId);

    const estanques = obtenerDatosLocal(respuestaEstanques)
        .map(normalizarEstanque)
        .filter((estanque) => estanquePerteneceAFinca(estanque, idsFinca));

    return mapearEstanquesAOptions(estanques);
}

export async function obtenerEstanquesPreCriaPorFinca(fincaId) {
    if (!fincaId) {
        return [];
    }

    const estanques = await obtenerEstanquesPorFinca(fincaId);

    return estanques.filter((opcion) => esEstanquePreCria(opcion.raw));
}

export async function obtenerEstanquesEngordePorFinca(fincaId) {
    if (!fincaId) {
        return [];
    }

    const estanques = await obtenerEstanquesPorFinca(fincaId);

    return estanques.filter((opcion) => esEstanqueEngorde(opcion.raw));
}

export async function obtenerTodosLosEstanques() {
    const respuesta = await localApi.estanques.obtenerTodos();
    const estanques = obtenerDatosLocal(respuesta).map(normalizarEstanque);

    return estanques.map((estanque) => {
        const tipo = estanque.tipoEstanque || estanque.tipo_estanque || "";
        const label = tipo
            ? `${estanque.codigo} (${tipo})`
            : `${estanque.codigo}`;

        return {
            label,
            value: obtenerIdPrincipal(estanque),
            id: estanque.id,
            servidorId: estanque.servidorId,
            servidor_id: estanque.servidor_id,
            fincaId: estanque.fincaId,
            finca_id: estanque.finca_id,
            raw: estanque
        };
    });
}

export async function obtenerColaboradores() {
    const respuesta = await localApi.colaboradores.obtenerTodos();
    const colaboradores = obtenerDatosLocal(respuesta);

    return colaboradores.map((colaborador) => {
        const servidorId = obtenerServidorId(colaborador);
        const id = obtenerIdLocal(colaborador);
        const value = tieneValor(servidorId) ? servidorId : id;

        return {
            label: [colaborador.nombre, colaborador.apellidos]
                .filter(Boolean)
                .join(" "),
            value,
            id,
            servidorId,
            servidor_id: servidorId,
            raw: colaborador
        };
    });
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES - SIEMBRA ACTIVA
//////////////////////////////////////////////////////////
*/

export async function obtenerSiembraActivaPorEstanque(estanqueId) {
    if (!estanqueId) {
        return null;
    }

    try {
        const [respuestaEstanques, respuestaSiembras] = await Promise.all([
            localApi.estanques.obtenerTodos(),
            localApi.siembras.obtenerTodos()
        ]);

        const estanques = obtenerDatosLocal(respuestaEstanques).map(normalizarEstanque);
        const idsEstanque = obtenerIdsValidosEstanque(estanques, estanqueId);

        const siembras = obtenerDatosLocal(respuestaSiembras).filter((siembra) => {
            const estado = normalizarTexto(siembra.estado);
            const pertenece = siembraPerteneceAEstanque(siembra, idsEstanque);

            return pertenece && estado === "activa";
        });

        if (siembras.length === 0) {
            return null;
        }

        const masReciente = siembras
            .slice()
            .sort((a, b) => String(a.fecha_siembra).localeCompare(String(b.fecha_siembra)))
            .pop();

        /*
        fecha_siembra puede llegar en dos formatos distintos:
        - "2026-06-22"                 -> creada localmente en el
                                          telefono (SQLite guarda DATE).
        - "2026-06-22T06:00:00.000Z"   -> descargada del backend, que
                                          la serializa como ISO completo.

        Antes se concatenaba "T00:00:00" a ciegas, lo que con el
        formato ISO producia "2026-06-22T06:00:00.000ZT00:00:00":
        una fecha invalida -> NaN -> dias quedaba null y el campo
        salia en blanco (con PL si autocompletado, porque ese es un
        numero directo). Por eso se corta la cadena a los primeros
        10 caracteres (YYYY-MM-DD) antes de armar la fecha.
        */
        const fechaTexto = String(masReciente.fecha_siembra ?? "").slice(0, 10);
        const fechaSiembra = new Date(`${fechaTexto}T00:00:00`);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const msPorDia = 1000 * 60 * 60 * 24;

        const dias = Number.isNaN(fechaSiembra.getTime())
            ? null
            : Math.max(0, Math.floor((hoy - fechaSiembra) / msPorDia));

        return {
            pl_siembra: masReciente.pl_siembra,
            dias
        };
    } catch (error) {
        return null;
    }
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES - SESION
//////////////////////////////////////////////////////////
*/

function obtenerSesionPorDefecto() {
    return {
        esColaborador: true,
        tipo: "colaborador",
        id: null,
        nombre: "Colaborador",
        colaboradorId: null
    };
}

async function resolverSesionActual() {
    const colaboradorId = await obtenerColaboradorIdSesion();

    if (colaboradorId) {
        return {
            esColaborador: true,
            tipo: "colaborador",
            id: colaboradorId,
            nombre: `Colaborador ${colaboradorId}`,
            colaboradorId: Number(colaboradorId)
        };
    }

    await cargarSesionPersistida();

    const token = getToken();
    const usuarioGuardado = getUsuario();
    const payload = decodeToken(token);

    if (!payload && !usuarioGuardado) {
        return obtenerSesionPorDefecto();
    }

    const usuarioId = payload?.id ?? usuarioGuardado?.id ?? null;
    const nombre = payload?.nombre ?? usuarioGuardado?.nombre ?? "Usuario";

    return {
        esColaborador: false,
        tipo: "usuario",
        id: usuarioId,
        nombre,
        colaboradorId: null
    };
}

export function obtenerSesionFormulario(sesion) {
    const esUsuario = sesion.tipo === "usuario";

    return {
        tipo: sesion.tipo,
        labelCampo: esUsuario ? "Usuario responsable" : "Colaborador responsable",
        nombre: sesion.nombre,
        label: esUsuario ? `Usuario: ${sesion.nombre}` : `Colaborador: ${sesion.nombre}`,
        colaboradorId: sesion.colaboradorId,
        usuarioId: esUsuario ? sesion.id : null
    };
}

export function obtenerColaboradorSesion(esAsync = false) {
    if (!esAsync) {
        return obtenerSesionFormulario(obtenerSesionPorDefecto());
    }

    return (async () => {
        const sesion = await resolverSesionActual();

        if (sesion.tipo === "usuario" || !sesion.colaboradorId) {
            return obtenerSesionFormulario(sesion);
        }

        try {
            const respuesta = await localApi.colaboradores.obtenerPorId(sesion.colaboradorId);
            const colaborador = respuesta?.success ? respuesta.data : null;

            const nombreCompleto = [
                colaborador?.nombre,
                colaborador?.apellidos
            ]
                .filter(Boolean)
                .join(" ");

            return obtenerSesionFormulario({
                ...sesion,
                nombre: nombreCompleto || sesion.nombre
            });
        } catch (error) {
            return obtenerSesionFormulario(sesion);
        }
    })();
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES - ENRIQUECIMIENTO
//////////////////////////////////////////////////////////
*/

export function construirMapas({
    fincas = [],
    colaboradores = [],
    estanques = []
} = {}) {
    const fincasMap = new Map();
    const colaboradoresMap = new Map();
    const estanquesMap = new Map();

    fincas.forEach((finca) => {
        agregarMapa(fincasMap, finca.value, finca.label);
        agregarMapa(fincasMap, finca.id, finca.label);
        agregarMapa(fincasMap, finca.servidorId, finca.label);
        agregarMapa(fincasMap, finca.servidor_id, finca.label);
    });

    colaboradores.forEach((colaborador) => {
        agregarMapa(colaboradoresMap, colaborador.value, colaborador.label);
        agregarMapa(colaboradoresMap, colaborador.id, colaborador.label);
        agregarMapa(colaboradoresMap, colaborador.servidorId, colaborador.label);
        agregarMapa(colaboradoresMap, colaborador.servidor_id, colaborador.label);
    });

    estanques.forEach((estanque) => {
        agregarMapa(estanquesMap, estanque.value, estanque.label);
        agregarMapa(estanquesMap, estanque.id, estanque.label);
        agregarMapa(estanquesMap, estanque.servidorId, estanque.label);
        agregarMapa(estanquesMap, estanque.servidor_id, estanque.label);
    });

    return {
        fincasMap,
        colaboradoresMap,
        estanquesMap
    };
}

export function enriquecerRegistro(registro = {}, mapas = {}) {
    const {
        fincasMap = new Map(),
        colaboradoresMap = new Map(),
        estanquesMap = new Map()
    } = mapas;

    let responsableNombre = "";
    let tipoResponsable = "Colaborador";

    if (
        registro.creadoPorColaboradorId &&
        obtenerDeMapa(colaboradoresMap, registro.creadoPorColaboradorId)
    ) {
        responsableNombre = obtenerDeMapa(
            colaboradoresMap,
            registro.creadoPorColaboradorId
        );
        tipoResponsable = "Colaborador";
    } else if (registro.creadoPorColaboradorId) {
        responsableNombre = `Colaborador #${registro.creadoPorColaboradorId}`;
        tipoResponsable = "Colaborador";
    } else if (registro.creadoPorUsuarioId) {
        responsableNombre = `Usuario #${registro.creadoPorUsuarioId}`;
        tipoResponsable = "Usuario";
    } else {
        responsableNombre = "Sin asignar";
        tipoResponsable = "Responsable";
    }

    return {
        ...registro,
        fincaNombre: obtenerDeMapa(fincasMap, registro.fincaId) ?? registro.fincaNombre ?? "",
        colaboradorNombre: responsableNombre,
        tipoResponsable,
        responsableTexto: `${tipoResponsable}: ${responsableNombre}`,
        estanqueOrigenLabel: obtenerDeMapa(estanquesMap, registro.estanqueOrigenId) ?? "",
        estanqueDestinoLabel: obtenerDeMapa(estanquesMap, registro.estanqueDestinoId) ?? ""
    };
}

export function enriquecerRegistros(registros = [], mapas) {
    if (!Array.isArray(registros)) {
        return [];
    }

    return registros.map((registro) => enriquecerRegistro(registro, mapas));
}
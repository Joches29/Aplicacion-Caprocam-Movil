/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: TrazabilidadServices.js
Modulo: Trazabilidad (Movil)
Descripcion:
Version SQLite (offline-first) del service de Trazabilidad.
Reemplaza las llamadas HTTP directas por lectura/escritura en
la base local (via TrazabilidadLocal.service) y por lectura de
catalogos ya descargados (fincas, estanques, colaboradores,
siembras), para poder trabajar sin depender del backend.

IMPORTANTE:
- Mantiene exactamente los mismos nombres de funcion y la
  misma forma de los datos que la version anterior (basada en
  HTTP directo), para no tener que tocar ninguno de los hooks
  que ya consumen este service (useTrazabilidad, useTrazabilidad
  List, useFilterButton). La version anterior queda respaldada
  en el PR para referencia.
- Se elimino toggleActivoRegistro(): no se usaba en ningun
  hook ni pantalla, y llamaba a un endpoint (PUT .../activo)
  que no existe en el backend real -- Trazabilidad no tiene
  edicion ni borrado, ni fisico ni logico.
- La sesion (JWT / colaborador por PIN) ya NO se decodifica a
  mano: se usa la infraestructura compartida real
  (tokenStorage.js, jwtUtils.js, sessionUtils.js). OJO: al
  05/08/2026 esa infraestructura existe pero el modulo Login
  todavia no llama saveToken/saveUsuario ni llena las claves de
  AsyncStorage que sessionUtils.js espera -- mientras eso no se
  conecte, la sesion de este modulo se ve "vacia" en runtime.
  No es un bug de Trazabilidad, es una dependencia de Login que
  hay que avisar en el PR.
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
FUNCIONES SECUNDARIAS - CATALOGOS LOCALES
//////////////////////////////////////////////////////////
*/

const obtenerDatosLocal = (respuesta) => {
    if (!respuesta || respuesta.success !== true) {
        return [];
    }

    return Array.isArray(respuesta.data) ? respuesta.data : [];
};

function obtenerValor(objeto, campos) {
    for (const campo of campos) {
        const valor = objeto?.[campo];

        if (valor !== undefined && valor !== null && valor !== "") {
            return valor;
        }
    }

    return undefined;
}

function normalizarEstanque(estanque) {
    return {
        ...estanque,
        id: estanque.id,
        fincaId: estanque.finca_id,
        finca_id: estanque.finca_id,
        codigo: estanque.codigo,
        tipoEstanque: estanque.tipo_estanque,
        tipo_estanque: estanque.tipo_estanque,
        estado: estanque.estado,
        precria: estanque.precria,
        usa_precria: estanque.precria
    };
}

function mapearEstanquesAOptions(estanques) {
    return (estanques ?? []).map((estanque) => ({
        label: `${estanque.codigo ?? "Estanque"} (${estanque.tipoEstanque ?? ""})`,
        value: estanque.id,
        raw: estanque
    }));
}

function obtenerTipoEstanque(estanque) {
    const rawTipo = obtenerValor(estanque, ["tipoEstanque", "tipo_estanque"]);
    if (rawTipo !== undefined && rawTipo !== null && rawTipo !== "") {
        return String(rawTipo).trim().toLowerCase();
    }

    const rawEstado = obtenerValor(estanque, ["estado"]);
    if (rawEstado !== undefined && rawEstado !== null && rawEstado !== "") {
        return String(rawEstado).trim().toLowerCase();
    }

    return "";
}

export function esEstanquePreCria(estanque) {
    const tipo = obtenerTipoEstanque(estanque);
    if (tipo.includes("pre")) return true;
    if (tipo.includes("engorde")) return false;

    const raw = estanque?.precria ?? estanque?.usa_precria ?? "";
    if (Number(raw) === 1) return true;
    const val = String(raw).trim().toLowerCase();
    return val === "si" || val === "yes" || val === "true";
}

export function esEstanqueEngorde(estanque) {
    const tipo = obtenerTipoEstanque(estanque);
    if (tipo.includes("engorde")) return true;
    if (tipo.includes("pre")) return false;

    const estado = String(obtenerValor(estanque, ["estado"]) ?? "")
        .trim()
        .toLowerCase();
    return estado.includes("engorde");
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
            registro.colaboradorId ??
            (registro.creadoPorUsuarioId ? `user_${registro.creadoPorUsuarioId}` : registro.colaboradorNombre);

        const coincideFiltros =
            (filtros.fincas.length === 0 || filtros.fincas.includes(registro.fincaId)) &&
            ((filtros.estanques ?? []).length === 0 ||
                filtros.estanques.includes(registro.estanqueOrigenId) ||
                filtros.estanques.includes(registro.estanqueDestinoId)) &&
            (filtros.colaboradores.length === 0 ||
                filtros.colaboradores.includes(keyResponsable) ||
                filtros.colaboradores.includes(registro.colaboradorId) ||
                filtros.colaboradores.includes(registro.colaboradorNombre)) &&
            (filtros.fecha === "" || registro.fecha === filtros.fecha);

        return coincideBusqueda && coincideFiltros;
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
        const error = new Error(resultado.errores[0] || "No se pudo guardar el registro.");
        // Se imita la forma de un error de axios (response.data.message)
        // para que el manejo de errores existente en useTrazabilidad.js
        // (que revisa error?.response?.data?.message) siga funcionando
        // igual sin tener que tocar el hook.
        error.response = { status: 400, data: { message: resultado.errores[0] } };
        throw error;
    }

    return resultado.registro;
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES - CATALOGOS (LOCALES, YA DESCARGADOS)
//////////////////////////////////////////////////////////
*/

export async function obtenerFincas() {
    const respuesta = await localApi.fincas.obtenerTodos();
    const fincas = obtenerDatosLocal(respuesta);

    return fincas.map((finca) => ({ label: finca.nombre_finca, value: finca.id }));
}

export async function obtenerEstanquesPorFinca(fincaId) {
    if (!fincaId) return [];

    const respuesta = await localApi.estanques.obtenerTodos({ finca_id: fincaId });
    const estanques = obtenerDatosLocal(respuesta).map(normalizarEstanque);

    return mapearEstanquesAOptions(estanques);
}

export async function obtenerEstanquesPreCriaPorFinca(fincaId) {
    if (!fincaId) return [];

    const estanques = await obtenerEstanquesPorFinca(fincaId);

    return estanques.filter((opcion) => esEstanquePreCria(opcion.raw));
}

export async function obtenerEstanquesEngordePorFinca(fincaId) {
    if (!fincaId) return [];

    const estanques = await obtenerEstanquesPorFinca(fincaId);

    return estanques.filter((opcion) => esEstanqueEngorde(opcion.raw));
}

export async function obtenerTodosLosEstanques() {
    const respuesta = await localApi.estanques.obtenerTodos();
    const estanques = obtenerDatosLocal(respuesta);

    return estanques.map((estanque) => ({
        label: `${estanque.codigo} (${estanque.tipo_estanque})`,
        value: estanque.id
    }));
}

export async function obtenerColaboradores() {
    const respuesta = await localApi.colaboradores.obtenerTodos();
    const colaboradores = obtenerDatosLocal(respuesta);

    return colaboradores.map((colaborador) => ({
        label: [colaborador.nombre, colaborador.apellidos].filter(Boolean).join(" "),
        value: colaborador.id
    }));
}

/**
 * Trae la siembra activa del estanque de origen, para
 * precargar PL y dias de cultivo en el formulario. Antes
 * dependia de GET /siembras/activa (modulo Siembra, fuera de
 * alcance). Ahora que Siembra ya tiene su propia tabla local
 * (siembras) descargada por su propio SiembraSync.service, se
 * lee de ahi directo -- sin llamar a la API ni tocar codigo
 * del modulo Siembra.
 * SUPUESTO A CONFIRMAR con el dueño de Siembra: "dias" aqui se
 * calcula como dias transcurridos desde fecha_siembra hasta
 * hoy, porque la tabla local no guarda ese calculo (el backend
 * si lo calculaba en el endpoint que ya no se usa). Si Siembra
 * define ese calculo distinto, hay que ajustarlo aqui.
 * @param {number} estanqueId - Id del estanque de origen.
 * @returns {Promise<object|null>} {pl_siembra, dias} o null.
 */
export async function obtenerSiembraActivaPorEstanque(estanqueId) {
    if (!estanqueId) return null;

    try {
        const respuesta = await localApi.siembras.obtenerTodos({
            estanque_id: estanqueId,
            estado: "Activa"
        });
        const siembras = obtenerDatosLocal(respuesta);

        if (siembras.length === 0) return null;

        const masReciente = siembras
            .slice()
            .sort((a, b) => String(a.fecha_siembra).localeCompare(String(b.fecha_siembra)))
            .pop();

        const fechaSiembra = new Date(`${masReciente.fecha_siembra}T00:00:00`);
        const hoy = new Date();
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
FUNCIONES PRINCIPALES - SESION (formulario)
//////////////////////////////////////////////////////////
*/

/**
 * Version sincronica y "segura": usada solo como valor inicial
 * de useState en el hook, antes de que se resuelva la sesion
 * real de forma asincrona. Nunca se le debe confiar el dato
 * final -- ver obtenerColaboradorSesion(true).
 * @returns {object} Sesion por defecto (colaborador vacio).
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

/**
 * Resuelve la sesion real de forma asincrona. Prioriza la
 * sesion de colaborador (PIN, AsyncStorage via sessionUtils),
 * que es el flujo real de captura en campo; si no hay
 * colaborador activo, cae a la sesion de usuario por JWT
 * (tokenStorage + jwtUtils).
 * @returns {Promise<object>} Sesion resuelta.
 */
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
            const nombreCompleto = [colaborador?.nombre, colaborador?.apellidos]
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
FUNCIONES PRINCIPALES - ENRIQUECIMIENTO (cruce de IDs a nombres)
//////////////////////////////////////////////////////////
*/

export function construirMapas({ fincas = [], colaboradores = [], estanques = [] } = {}) {
    const fincasMap = new Map(fincas.map((f) => [f.value, f.label]));
    const colaboradoresMap = new Map(colaboradores.map((c) => [c.value, c.label]));
    const estanquesMap = new Map(estanques.map((e) => [e.value, e.label]));

    return { fincasMap, colaboradoresMap, estanquesMap };
}

/**
 * Cruza un registro local (ya trae sus propios IDs de quien lo
 * creo: creadoPorUsuarioId / creadoPorColaboradorId) con los
 * catalogos locales para mostrar nombres en vez de IDs. A
 * diferencia de la version anterior, ya NO necesita adivinar
 * "la sesion actual" como respaldo: cada registro local ya
 * guarda quien lo creo desde el momento en que se genero.
 * @param {object} registro - Registro en formato de vista.
 * @param {object} mapas - {fincasMap, colaboradoresMap, estanquesMap}.
 * @returns {object} Registro enriquecido con nombres.
 */
export function enriquecerRegistro(registro = {}, mapas = {}) {
    const { fincasMap = new Map(), colaboradoresMap = new Map(), estanquesMap = new Map() } = mapas;

    let responsableNombre = "";
    let tipoResponsable = "Colaborador";

    if (registro.colaboradorId && colaboradoresMap.has(registro.colaboradorId)) {
        responsableNombre = colaboradoresMap.get(registro.colaboradorId);
        tipoResponsable = "Colaborador";
    } else if (registro.creadoPorColaboradorId && colaboradoresMap.has(registro.creadoPorColaboradorId)) {
        responsableNombre = colaboradoresMap.get(registro.creadoPorColaboradorId);
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
        fincaNombre: fincasMap.get(registro.fincaId) ?? registro.fincaNombre ?? "",
        colaboradorNombre: responsableNombre,
        tipoResponsable,
        responsableTexto: `${tipoResponsable}: ${responsableNombre}`,
        estanqueOrigenLabel: estanquesMap.get(registro.estanqueOrigenId) ?? "",
        estanqueDestinoLabel: estanquesMap.get(registro.estanqueDestinoId) ?? ""
    };
}

export function enriquecerRegistros(registros = [], mapas) {
    if (!Array.isArray(registros)) return [];
    return registros.map((r) => enriquecerRegistro(r, mapas));
}
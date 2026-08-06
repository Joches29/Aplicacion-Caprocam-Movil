/**
 * ============================================================
 * SERVICE LOCAL DE REPORTERÍA
 * ============================================================
 *
 * Centraliza las operaciones de lectura y eliminación local
 * del módulo de reportería usando SQLite (localApi).
 *
 */

import { localApi } from "../../../database/local/localApi.service";

/*
============================================================
MAPEO TIPO DE REGISTRO -> SECCIÓN localApi
============================================================
*/

const SECCION_POR_TIPO = {
  crecimiento: "crecimientos",
  parasitologia: "parasitologias",
  enfermedades: "enfermedades",
  raleo: "raleos",
  alimentacion: "alimentaciones",
  densidad_poblacional: "densidadPoblacional",
  fisico_quimico: "fisicoQuimico",
};

/*
============================================================
HELPERS
============================================================
*/

const obtenerDataRespuesta = (respuesta) =>
  respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

const convertirNumero = (valor, valorDefecto = null) => {
  if (valor === undefined || valor === null || valor === "") return valorDefecto;
  const numero = Number(valor);
  return Number.isNaN(numero) ? valorDefecto : numero;
};

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

function snakeACamel(texto) {
  return texto.replace(/_([a-z])/g, (_, letra) => letra.toUpperCase());
}

/**
 * Normaliza un registro local a un shape amigable para la UI
 * (camelCase + aliases comunes del backend anterior).
 */
function normalizarRegistro(registro) {
  if (!registro) return null;

  // Genera automáticamente el alias camelCase de CADA campo snake_case
  const aliasCamel = {};
  Object.keys(registro).forEach((llave) => {
    if (llave.includes("_")) {
      aliasCamel[snakeACamel(llave)] = registro[llave];
    }
  });

  const fincaId = convertirNumero(
    obtenerValor(registro, ["finca_id", "fincaId", "finca", "idFinca"], null)
  );
  const estanqueId = convertirNumero(
    obtenerValor(registro, ["estanque_id", "estanqueId", "estanque", "idEstanque"], null)
  );
  const colaboradorId = convertirNumero(
    obtenerValor(registro, ["colaborador_id", "colaboradorId", "colaborador", "idColaborador"], null)
  );
  const productoId = convertirNumero(
    obtenerValor(registro, ["producto_id", "productoId", "producto", "idProducto"], null)
  );

  return {
    ...registro,
    ...aliasCamel,
    id: obtenerValor(registro, ["id"], null),
    servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    uuid: obtenerValor(registro, ["uuid"], ""),
    grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

    fincaId,
    finca_id: fincaId,
    finca: fincaId,
    idFinca: fincaId,

    estanqueId,
    estanque_id: estanqueId,
    estanque: estanqueId,
    idEstanque: estanqueId,

    colaboradorId,
    colaborador_id: colaboradorId,
    colaborador: colaboradorId,
    idColaborador: colaboradorId,

    productoId,
    producto_id: productoId,
    producto: productoId,
    idProducto: productoId,

    fechaReporte: obtenerValor(
      registro,
      ["fecha_reporte", "fechaReporte", "fecha_registro", "fechaRegistro", "fecha"],
      ""
    ),
    fecha: obtenerValor(
      registro,
      ["fecha", "fecha_reporte", "fechaReporte", "fecha_registro"],
      ""
    ),
    responsable: obtenerValor(registro, ["responsable"], ""),
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
  };
}

function ordenarRecientesPrimero(registros = []) {
  return Array.isArray(registros) ? [...registros].reverse() : [];
}

function filtrarPorFincaEstanque(registros, fincaId, estanqueId) {
  const fId = Number(fincaId);
  const eId = Number(estanqueId);

  return (registros || []).filter((r) => {
    const regFinca = Number(
      obtenerValor(r, ["fincaId", "finca_id", "finca", "idFinca"], null)
    );
    const regEstanque = Number(
      obtenerValor(r, ["estanqueId", "estanque_id", "estanque", "idEstanque"], null)
    );

    return regFinca === fId && regEstanque === eId;
  });
}

async function obtenerTodosDeSeccion(seccion) {
  const apiSeccion = localApi[seccion];

  if (!apiSeccion || typeof apiSeccion.obtenerTodos !== "function") {
    throw new Error(`localApi.${seccion} no está disponible.`);
  }

  const respuesta = await apiSeccion.obtenerTodos();
  const data = obtenerDataRespuesta(respuesta);

  return Array.isArray(data) ? data : [];
}

/*
============================================================
OPERACIONES LOCALES
============================================================
*/

/**
 * Obtiene los registros locales de un tipo filtrados por finca y estanque.
 * Orden: más recientes primero.
 */
export async function obtenerDetalleReporte({ tipoRegistro, fincaId, estanqueId }) {
  const seccion = SECCION_POR_TIPO[tipoRegistro];

  if (!seccion) {
    return [];
  }

  try {
    const registros = await obtenerTodosDeSeccion(seccion);
    const normalizados = registros.map(normalizarRegistro).filter(Boolean);
    const filtrados = filtrarPorFincaEstanque(normalizados, fincaId, estanqueId);

    return ordenarRecientesPrimero(filtrados);
  } catch (error) {
    console.error(
      `Error al obtener detalle local de ${tipoRegistro}:`,
      error?.message || error
    );
    throw error;
  }
}

/**
 * Elimina un registro local por tipo e id.
 */
export async function eliminarRegistroLocal(tipoRegistro, id) {
  const seccion = SECCION_POR_TIPO[tipoRegistro];

  if (!seccion) {
    throw new Error(`Tipo de registro no soportado: ${tipoRegistro}`);
  }

  const apiSeccion = localApi[seccion];

  if (!apiSeccion || typeof apiSeccion.eliminar !== "function") {
    throw new Error(`localApi.${seccion}.eliminar no está disponible.`);
  }

  const respuesta = await apiSeccion.eliminar(id);
  return obtenerDataRespuesta(respuesta);
}

/**
 * Catálogos locales para filtros y enriquecimiento.
 */
export async function obtenerCatalogosLocales() {
  if (typeof localApi.inicializar === "function") {
    await localApi.inicializar();
  }

  const [fincasRes, estanquesRes, colaboradoresRes, productosRes, usuariosRes] =
    await Promise.all([
      localApi.fincas.obtenerTodos(),
      localApi.estanques.obtenerTodos(),
      localApi.colaboradores.obtenerTodos(),
      localApi.productos.obtenerTodos(),
      localApi.usuarios.obtenerTodos(),
    ]);

  const fincas = Array.isArray(obtenerDataRespuesta(fincasRes))
    ? obtenerDataRespuesta(fincasRes)
    : [];
  const estanques = Array.isArray(obtenerDataRespuesta(estanquesRes))
    ? obtenerDataRespuesta(estanquesRes)
    : [];
  const colaboradores = Array.isArray(obtenerDataRespuesta(colaboradoresRes))
    ? obtenerDataRespuesta(colaboradoresRes)
    : [];
  const productos = Array.isArray(obtenerDataRespuesta(productosRes))
    ? obtenerDataRespuesta(productosRes)
    : [];
  const usuarios = Array.isArray(obtenerDataRespuesta(usuariosRes))
    ? obtenerDataRespuesta(usuariosRes)
    : [];

  return { fincas, estanques, colaboradores, productos, usuarios };
}

const ReporteriaLocalService = {
  obtenerDetalleReporte,
  eliminarRegistroLocal,
  obtenerCatalogosLocales,
  SECCION_POR_TIPO,
};

export default ReporteriaLocalService;

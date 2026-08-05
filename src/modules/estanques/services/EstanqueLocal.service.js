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
============================================================
CONSTANTES
============================================================
*/

const METODOS_LOCAL_API = {
  obtenerTodos: ["obtenerTodos", "getAll", "listar"],
  obtenerPorId: ["obtenerPorId", "getById", "buscarPorId"],
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

const convertirBooleanoUI = (valor) =>
  valor === true || valor === 1 || valor === "1";

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
============================================================
MAPEADOR
============================================================
*/

function mapearEstanqueDesdeLocal(registro) {
  return registro
    ? {
        id: obtenerValor(registro, ["id"], null),
        servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
        uuid: obtenerValor(registro, ["uuid"], ""),

        grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

        fincaId: obtenerValor(registro, ["finca_id", "fincaId", "idFinca"], null),
        idFinca: obtenerValor(registro, ["finca_id", "fincaId", "idFinca"], null),

        codigo: obtenerValor(registro, ["codigo"], ""),

        tipoEstanque: obtenerValor(
          registro,
          ["tipo_estanque", "tipoEstanque"],
          ""
        ),

        estado: obtenerValor(registro, ["estado"], ""),

        largo: obtenerValor(registro, ["largo"], 0),
        ancho: obtenerValor(registro, ["ancho"], 0),
        profundidad: obtenerValor(registro, ["profundidad"], 0),

        fuenteAgua: obtenerValor(
          registro,
          ["fuente_agua", "fuenteAgua"],
          ""
        ),

        fechaMantenimiento: obtenerValor(
          registro,
          ["fecha_mantenimiento", "fechaMantenimiento"],
          null
        ),

        precria: convertirBooleanoUI(
          obtenerValor(registro, ["precria", "usaPrecria"], 0)
        ),

        usaPrecria: convertirBooleanoUI(
          obtenerValor(registro, ["precria", "usaPrecria"], 0)
        ),

        activo: obtenerValor(registro, ["activo"], 1),
        sincronizado: obtenerValor(registro, ["sincronizado"], 1),
        pendienteSync: obtenerValor(registro, ["pendiente_sync", "pendienteSync"], 0),
        accionSync: obtenerValor(registro, ["accion_sync", "accionSync"], null),
      }
    : null;
}

/*
============================================================
FILTROS
============================================================
*/

function aplicarFiltros(registros, filtros = {}) {
  const fincaId = obtenerValor(filtros, ["fincaId", "idFinca", "finca_id"], null);
  const estado = obtenerValor(filtros, ["estado"], null);

  return registros.filter((item) => {
    const coincideFinca = fincaId
      ? Number(item.fincaId) === Number(fincaId)
      : true;

    const coincideEstado = estado
      ? String(item.estado) === String(estado)
      : true;

    return coincideFinca && coincideEstado;
  });
}

/*
============================================================
CONSULTAS LOCALES
============================================================
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
  const respuesta = await ejecutarMetodoEstanques("obtenerPorId", [id]);

  return mapearEstanqueDesdeLocal(obtenerDataRespuesta(respuesta));
}

async function getEstanquesPorFinca(fincaId) {
  return await getEstanques({ fincaId });
}

/*
============================================================
EXPORT
============================================================
*/

const EstanqueLocalService = {
  getEstanques,
  getEstanqueById,
  getEstanquesPorFinca,
};

export default EstanqueLocalService;
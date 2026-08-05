import { localApi } from "../../../database/local/localApi.service";

const METODOS_LOCAL_API = {
  obtenerTodos: ["obtenerTodos", "getAll", "listar"],
  obtenerPorId: ["obtenerPorId", "getById", "buscarPorId"],
};

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

function parseTelefonos(telefono) {
  if (!telefono) return ["No hay teléfonos guardado"];

  let lista = [];

  if (Array.isArray(telefono)) {
    lista = telefono;
  } else {
    try {
      const parsed = JSON.parse(telefono);
      lista = Array.isArray(parsed) ? parsed : [telefono];
    } catch {
      lista = [telefono];
    }
  }

  const limpios = lista.filter((tel) => tel && tel.toString().trim() !== "");

  return limpios.length > 0 ? limpios : ["No hay teléfonos guardado"];
}

async function ejecutarMetodoFincas(tipoMetodo, argumentos = []) {
  const apiFincas = localApi.fincas;

  if (!apiFincas) {
    throw new Error("localApi.fincas no esta disponible.");
  }

  const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

  for (let i = 0; i < nombres.length; i += 1) {
    const nombreMetodo = nombres[i];

    if (typeof apiFincas[nombreMetodo] === "function") {
      return await apiFincas[nombreMetodo](...argumentos);
    }
  }

  throw new Error(`No existe metodo local para fincas: ${tipoMetodo}`);
}

function mapearFincaDesdeLocal(registro) {
  const telefono = obtenerValor(registro, ["telefono"], null);

  return registro
    ? {
        id: obtenerValor(registro, ["id"], null),
        servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
        uuid: obtenerValor(registro, ["uuid"], ""),

        grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

        codigoCBO: obtenerValor(registro, ["codigo_cbo", "codigoCBO"], ""),
        nombreFinca: obtenerValor(registro, ["nombre_finca", "nombreFinca"], ""),

        provincia: obtenerValor(registro, ["provincia"], ""),
        canton: obtenerValor(registro, ["canton"], ""),
        distrito: obtenerValor(registro, ["distrito"], ""),
        otrasSenas: obtenerValor(registro, ["otras_senas", "otrasSenas"], ""),
        propietarioResponsable: obtenerValor(
          registro,
          ["propietario_responsable", "propietarioResponsable"],
          ""
        ),

        telefono: telefono,
        telefonoParse: parseTelefonos(telefono),

        areaTotal: obtenerValor(registro, ["area_total", "areaTotal"], 0),
        espejosAgua: obtenerValor(registro, ["espejos_agua", "espejosAgua"], 0),

        activo: obtenerValor(registro, ["activo"], 1),
        sincronizado: obtenerValor(registro, ["sincronizado"], 1),
        pendienteSync: obtenerValor(
          registro,
          ["pendiente_sync", "pendienteSync"],
          0
        ),
        accionSync: obtenerValor(registro, ["accion_sync", "accionSync"], null),
      }
    : null;
}

function aplicarFiltros(registros, filtros = {}) {
  const estado = obtenerValor(filtros, ["estado"], null);

  return registros.filter((item) => {
    const coincideEstado = estado
      ? String(item.estado) === String(estado)
      : true;

    return coincideEstado;
  });
}

async function getFincas(filtros = {}) {
  const respuesta = await ejecutarMetodoFincas("obtenerTodos");
  const data = obtenerDataRespuesta(respuesta);
  const registros = Array.isArray(data) ? data : [];

  return aplicarFiltros(
    registros.map(mapearFincaDesdeLocal).filter(Boolean),
    filtros
  );
}

async function getFincaById(id) {
  const respuesta = await ejecutarMetodoFincas("obtenerPorId", [id]);

  return mapearFincaDesdeLocal(obtenerDataRespuesta(respuesta));
}

const FincaLocalService = {
  getFincas,
  getFincaById,
};

export default FincaLocalService;
import { fincaService } from "./finca.service";
import { localApi } from "../../../database/local/localApi.service";

const TABLA_FINCAS = "fincas";

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

const mapearFincaDesdeBackend = (finca) => {
  const servidorId = obtenerValor(
    finca,
    ["id", "servidor_id", "servidorId"],
    null
  );

  const uuid = obtenerValor(
    finca,
    ["uuid"],
    servidorId ? `finca-servidor-${servidorId}` : null
  );

  const telefonoRaw = obtenerValor(finca, ["telefono"], null);
  const telefono =
    Array.isArray(telefonoRaw) || typeof telefonoRaw === "object"
      ? JSON.stringify(telefonoRaw)
      : telefonoRaw
      ? String(telefonoRaw).trim()
      : null;

  return {
    servidor_id: convertirNumero(servidorId, null),
    uuid: uuid,

    grupo_datos: convertirNumero(
      obtenerValor(finca, ["grupoDatos", "grupo_datos"], 1),
      1
    ),

    propietario_usuario_id: obtenerValor(
      finca,
      ["propietarioUsuarioId", "propietario_usuario_id"],
      null
    ),
    codigo_cbo: convertirTexto(
      obtenerValor(finca, ["codigoCBO", "codigo_cbo"], "")
    ).trim(),
    nombre_finca: convertirTexto(
      obtenerValor(finca, ["nombreFinca", "nombre_finca"], "")
    ).trim(),
    provincia: obtenerValor(finca, ["provincia"], null),
    canton: obtenerValor(finca, ["canton"], null),
    distrito: obtenerValor(finca, ["distrito"], null),
    otras_senas: obtenerValor(finca, ["otrasSenas", "otras_senas"], null),
    propietario_responsable: obtenerValor(
      finca,
      ["propietarioResponsable", "propietario_responsable"],
      null
    ),
    telefono: telefono,

    area_total: convertirNumero(obtenerValor(finca, ["areaTotal", "area_total"], 0), 0),
    espejos_agua: convertirNumero(
      obtenerValor(finca, ["espejosAgua", "espejos_agua"], 0),
      0
    ),

    creado_por_usuario_id: obtenerValor(
      finca,
      ["creadoPorUsuarioId", "creado_por_usuario_id"],
      null
    ),

    creado_por_colaborador_id: obtenerValor(
      finca,
      ["creadoPorColaboradorId", "creado_por_colaborador_id"],
      null
    ),

    activo: convertirNumero(obtenerValor(finca, ["activo"], 1), 1),
    sincronizado: 1,
    pendiente_sync: 0,
    accion_sync: null,
    fecha_sync: new Date().toISOString(),
  };
};

const guardarFincaDesdeBackend = async (fincaLocal) => {
  return await localApi.sync.guardarDesdeServidor(TABLA_FINCAS, [fincaLocal]);
};

const obtenerFincasBackend = async () => {
  const respuesta = await fincaService.getFincas();
  return Array.isArray(respuesta) ? respuesta : [];
};

async function sincronizarFincasDesdeBackend() {
  const resultado = {
    totalBackend: 0,
    guardadosLocalmente: 0,
    errores: [],
  };

  await localApi.inicializar();

  const fincasBackend = await obtenerFincasBackend();

  resultado.totalBackend = fincasBackend.length;

  for (let i = 0; i < fincasBackend.length; i += 1) {
    const fincaBackend = fincasBackend[i];

    try {
      const fincaLocal = mapearFincaDesdeBackend(fincaBackend);

      await guardarFincaDesdeBackend(fincaLocal);

      resultado.guardadosLocalmente += 1;
    } catch (error) {
      resultado.errores.push({
        id: obtenerValor(fincaBackend, ["id"], null),
        nombre: obtenerValor(fincaBackend, ["nombreFinca"], ""),
        mensaje:
          error?.response?.data?.message ||
          error?.message ||
          "Error al guardar finca local.",
      });
    }
  }

  return resultado;
}

const FincaSyncService = {
  sincronizarFincasDesdeBackend,
};

export default FincaSyncService;
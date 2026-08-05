/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE PARASITOLOGIA
 * ============================================================
 *
 * Sincroniza los registros locales de parasitologia con el
 * backend.
 *
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro se elimina fisicamente de SQLite.
 */

import parasitologiaService from "./ParasitologiaService";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_PARASITOLOGIAS = "parasitologias";

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

  return Number.isNaN(numero) ? valorDefecto : numero;
};

const obtenerValor = (objeto, llaves, valorDefecto = null) => {
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

const obtenerPendientesParasitologias = async () => {
  const respuesta = await localApi.sync.obtenerPendientes();
  const data = obtenerDataRespuesta(respuesta);
  const pendientes = Array.isArray(data) ? data : [];

  return pendientes.filter((item) => item.tabla === TABLA_PARASITOLOGIAS);
};

/*
============================================================
MAPEO LOCAL A BACKEND
============================================================
*/

const mapearParasitologiaParaBackend = (registro) => ({
  fincaId: convertirNumero(
    obtenerValor(registro, ["finca_id", "fincaId"], null),
    null
  ),
  estanqueId: convertirNumero(
    obtenerValor(registro, ["estanque_id", "estanqueId"], null),
    null
  ),
  fechaReporte: obtenerValor(
    registro,
    ["fecha_reporte", "fechaReporte", "fecha"],
    ""
  ),
  parasito: obtenerValor(registro, ["parasito"], ""),
  camaronesMuestreados: convertirNumero(
    obtenerValor(
      registro,
      ["camarones_muestreados", "camaronesMuestreados"],
      0
    ),
    0
  ),
  camaronesInfectados: convertirNumero(
    obtenerValor(
      registro,
      ["camarones_infectados", "camaronesInfectados"],
      0
    ),
    0
  ),
  observaciones: obtenerValor(registro, ["observaciones"], null),
});

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
  const payload = mapearParasitologiaParaBackend(registro);

  return await parasitologiaService.create(payload);
};

const sincronizarUpdate = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  const payload = mapearParasitologiaParaBackend(registro);

  return servidorId
    ? await parasitologiaService.update(servidorId, payload)
    : await parasitologiaService.create(payload);
};

const sincronizarDelete = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

  return servidorId
    ? await parasitologiaService.deleteById(servidorId)
    : { eliminadoSoloLocal: true };
};

const sincronizarRegistro = async (pendiente) => {
  const accion = pendiente.accion;
  const registro = pendiente.registro;

  if (accion === "DELETE") {
    return await sincronizarDelete(registro);
  }

  if (accion === "UPDATE") {
    return await sincronizarUpdate(registro);
  }

  return await sincronizarCreate(registro);
};

/*
============================================================
FUNCION PRINCIPAL
============================================================
*/

async function sincronizarParasitologiasPendientes() {
  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [],
  };

  await localApi.inicializar();

  const pendientes = await obtenerPendientesParasitologias();

  resultado.total = pendientes.length;

  for (let i = 0; i < pendientes.length; i += 1) {
    const pendiente = pendientes[i];
    const registro = pendiente.registro;

    try {
      await sincronizarRegistro(pendiente);

      await eliminarRegistroLocalDespuesSync(
        TABLA_PARASITOLOGIAS,
        registro.id
      );

      resultado.sincronizados += 1;
    } catch (error) {
      resultado.errores.push({
        id: registro?.id ?? null,
        accion: pendiente.accion,
        mensaje:
          error?.response?.data?.message ||
          error?.message ||
          "Error al sincronizar parasitologia.",
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

const ParasitologiaSyncService = {
  sincronizarParasitologiasPendientes,
};

export default ParasitologiaSyncService;
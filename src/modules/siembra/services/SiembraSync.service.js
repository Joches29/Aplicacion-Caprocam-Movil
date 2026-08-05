/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE SIEMBRA
 * ============================================================
 *
 * Sincroniza los registros locales de siembra con el backend.
 *
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro se elimina fisicamente de SQLite.
 *
 */

import { createSiembra, updateSiembra, eliminarSiembra } from "./siembra.service";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_SIEMBRAS = "siembras";

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

const obtenerPendientesSiembras = async () => {
  const respuesta = await localApi.sync.obtenerPendientes();
  const data = obtenerDataRespuesta(respuesta);
  const pendientes = Array.isArray(data) ? data : [];

  return pendientes.filter((item) => item.tabla === TABLA_SIEMBRAS);
};


const mapearSiembraParaBackend = (registro) => ({
  lote_larva_id: convertirNumero(
    obtenerValor(registro, ["lote_larva_id", "loteLarvaId"], null),
    null
  ),
  precria_id: (() => {
    const valor = obtenerValor(registro, ["precria_id", "precriaId"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
  finca_id: convertirNumero(
    obtenerValor(registro, ["finca_id", "fincaId"], null),
    null
  ),
  estanque_id: convertirNumero(
    obtenerValor(registro, ["estanque_id", "estanqueId"], null),
    null
  ),
  fecha_siembra: obtenerValor(
    registro,
    ["fecha_siembra", "fechaSiembra"],
    ""
  ),
  tecnica_cultivo: obtenerValor(registro, ["tecnica_cultivo", "tecnicaCultivo"], null),
  densidad_poblacional: (() => {
    const valor = obtenerValor(registro, ["densidad_poblacional", "densidadPoblacional"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
  cantidad_sembrada: convertirNumero(
    obtenerValor(registro, ["cantidad_sembrada", "cantidadSembrada"], 0),
    0
  ),
  pl_siembra: (() => {
    const valor = obtenerValor(registro, ["pl_siembra", "plSiembra"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
  estado: obtenerValor(registro, ["estado"], "ACTIVA"),
});

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
  const payload = mapearSiembraParaBackend(registro);

  return await createSiembra(payload);
};

const sincronizarUpdate = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  const payload = mapearSiembraParaBackend(registro);

  return servidorId
    ? await updateSiembra(servidorId, payload)
    : await createSiembra(payload);
};

const sincronizarDelete = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

  return servidorId
    ? await eliminarSiembra(servidorId)
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

async function sincronizarSiembrasPendientes() {
  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [],
  };

  await localApi.inicializar();

  const pendientes = await obtenerPendientesSiembras();

  resultado.total = pendientes.length;

  for (let i = 0; i < pendientes.length; i += 1) {
    const pendiente = pendientes[i];
    const registro = pendiente.registro;

    try {
      await sincronizarRegistro(pendiente);

      await eliminarRegistroLocalDespuesSync(
        TABLA_SIEMBRAS,
        registro.id
      );

      resultado.sincronizados += 1;
    } catch (error) {
      resultado.errores.push({
        id: registro?.id ?? null,
        accion: pendiente.accion,
        mensaje: error?.response?.data?.message || error?.message || "Error al sincronizar siembra.",
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

const SiembraSyncService = {
  sincronizarSiembrasPendientes,
};

export default SiembraSyncService;
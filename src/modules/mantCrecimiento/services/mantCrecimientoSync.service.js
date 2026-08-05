/**
 * ============================================================
 * SERVICE LOCAL DE CRECIMIENTOS (SQLite <-> Backend)
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de crecimientos
 * usando SQLite.
 *
 * Mantiene una API similar al service HTTP para que los hooks
 * puedan trabajar con datos locales sin cambiar la pantalla.
 */

import crecimientoService from "./mantCrecimiento.service";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_CRECIMIENTOS = "crecimientos";

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

const obtenerPendientesCrecimientos = async () => {
  const respuesta = await localApi.sync.obtenerPendientes();
  const data = obtenerDataRespuesta(respuesta);
  const pendientes = Array.isArray(data) ? data : [];
  return pendientes.filter((item) => item.tabla === TABLA_CRECIMIENTOS);
};

/*
============================================================
MAPEO LOCAL A BACKEND
============================================================
*/

const mapearCrecimientoParaBackend = (registro) => ({
  finca: convertirNumero(obtenerValor(registro, ["finca_id", "finca"]), null),
  estanque: convertirNumero(obtenerValor(registro, ["estanque_id", "estanque"]), null),
  colaborador: obtenerValor(registro, ["colaborador_id", "colaborador"], null)
    ? convertirNumero(obtenerValor(registro, ["colaborador_id", "colaborador"]), null)
    : null,
  pesoActual: Number(obtenerValor(registro, ["peso_actual", "pesoActual"], 0)),
  fechaRegistro: obtenerValor(registro, ["fecha_registro", "fechaRegistro"], ""),
});

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
  const payload = mapearCrecimientoParaBackend(registro);
  return await crecimientoService.create(payload);
};

const sincronizarUpdate = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  const payload = mapearCrecimientoParaBackend(registro);
  return servidorId
    ? await crecimientoService.update(servidorId, payload)
    : await crecimientoService.create(payload);
};

const sincronizarDelete = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  return servidorId
    ? await crecimientoService.deleteById(servidorId)
    : { eliminadoSoloLocal: true };
};

const sincronizarRegistro = async (pendiente) => {
  const accion = pendiente.accion;
  const registro = pendiente.registro;
  if (accion === "DELETE") return await sincronizarDelete(registro);
  if (accion === "UPDATE") return await sincronizarUpdate(registro);
  return await sincronizarCreate(registro);
};

async function sincronizarCrecimientosPendientes() {
  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [],
  };

  await localApi.inicializar();
  const pendientes = await obtenerPendientesCrecimientos();
  resultado.total = pendientes.length;

  for (let i = 0; i < pendientes.length; i += 1) {
    const pendiente = pendientes[i];
    const registro = pendiente.registro;

    try {
      await sincronizarRegistro(pendiente);
      await eliminarRegistroLocalDespuesSync(TABLA_CRECIMIENTOS, registro.id);
      resultado.sincronizados += 1;
    } catch (error) {
      resultado.errores.push({
        id: registro?.id ?? null,
        accion: pendiente.accion,
        mensaje: error?.message || "Error al sincronizar crecimiento.",
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

const CrecimientosSyncService = {
  sincronizarCrecimientosPendientes,
};

export default CrecimientosSyncService;
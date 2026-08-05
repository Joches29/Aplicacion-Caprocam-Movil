/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE ENFERMEDADES
 * ============================================================
 *
 * Sincroniza los registros locales de enfermedades con el
 * backend.
 *
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro se elimina fisicamente de SQLite.
 */

import EnfermedadesService from "./EnfermedadesService";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_ENFERMEDADES = "enfermedades";

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

const obtenerPendientesEnfermedades = async () => {
  const respuesta = await localApi.sync.obtenerPendientes();
  const data = obtenerDataRespuesta(respuesta);
  const pendientes = Array.isArray(data) ? data : [];

  return pendientes.filter((item) => item.tabla === TABLA_ENFERMEDADES);
};

const mapearEnfermedadParaBackend = (registro) => ({
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
  enfermedad: obtenerValor(registro, ["enfermedad"], ""),
  severidad: obtenerValor(registro, ["severidad"], ""),
  mortalidadRegistrada: convertirNumero(
    obtenerValor(
      registro,
      ["mortalidad_registrada", "mortalidad", "mortalidadRegistrada"],
      0
    ),
    0
  ),
  reporte: obtenerValor(registro, ["reporte"], ""),
});

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
  const payload = mapearEnfermedadParaBackend(registro);

  return await EnfermedadesService.create(payload);
};

const sincronizarUpdate = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  const payload = mapearEnfermedadParaBackend(registro);

  return servidorId
    ? await EnfermedadesService.update(servidorId, payload)
    : await EnfermedadesService.create(payload);
};

const sincronizarDelete = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

  return servidorId
    ? await EnfermedadesService.deleteById(servidorId)
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

async function sincronizarEnfermedadesPendientes() {
  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [],
  };

  await localApi.inicializar();

  const pendientes = await obtenerPendientesEnfermedades();

  resultado.total = pendientes.length;

  for (let i = 0; i < pendientes.length; i += 1) {
    const pendiente = pendientes[i];
    const registro = pendiente.registro;

    try {
      await sincronizarRegistro(pendiente);

      await eliminarRegistroLocalDespuesSync(
        TABLA_ENFERMEDADES,
        registro.id
      );

      resultado.sincronizados += 1;
    } catch (error) {
      resultado.errores.push({
        id: registro?.id ?? null,
        accion: pendiente.accion,
        mensaje: error?.response?.data?.message || error?.message || "Error al sincronizar enfermedad.",
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

const EnfermedadesSyncService = {
  sincronizarEnfermedadesPendientes,
};

export default EnfermedadesSyncService;
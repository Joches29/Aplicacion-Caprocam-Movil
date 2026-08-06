/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE PRE-CRIA
 * ============================================================
 *
 * Sincroniza los registros locales de Pre-Cria con el backend.
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro se elimina fisicamente de SQLite.
 *
 * IMPORTANTE - orden de sincronizacion: debe correr DESPUES de
 * LoteLarvaSync.service.js, porque una Pre-Cria creada offline
 * todavia apunta al id local de su lote_larva_id hasta que ese
 * lote se sincroniza y ese id local se reemplaza por el
 * servidor_id real (ver actualizarReferenciasLocales en
 * LoteLarvaSync.service.js).
 *
 * Sigue el mismo patron que EnfermedadesSync.service.js.
 */

import { createPrecria, updatePrecria, eliminarPrecria } from "./precria.service";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_PRECRIAS = "precrias";

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

const obtenerPendientesPrecrias = async () => {
  const respuesta = await localApi.sync.obtenerPendientes();
  const data = obtenerDataRespuesta(respuesta);
  const pendientes = Array.isArray(data) ? data : [];

  return pendientes.filter((item) => item.tabla === TABLA_PRECRIAS);
};

// El backend real de Pre-Cria espera el mismo shape snake_case que
// arma PrecriaDTO (ver dtos/siembra.dto.js): lote_larva_id,
// finca_id, estanque_id, fecha_inicio, duracion_dias,
// cantidad_inicial, pl_inicial, fecha_fin, cantidad_final, pl_final.
const mapearPrecriaParaBackend = (registro) => ({
  lote_larva_id: convertirNumero(
    obtenerValor(registro, ["lote_larva_id", "loteLarvaId"], null),
    null
  ),
  finca_id: convertirNumero(
    obtenerValor(registro, ["finca_id", "fincaId"], null),
    null
  ),
  estanque_id: convertirNumero(
    obtenerValor(registro, ["estanque_id", "estanqueId"], null),
    null
  ),
  fecha_inicio: obtenerValor(registro, ["fecha_inicio", "fechaInicio"], ""),
  duracion_dias: (() => {
    const valor = obtenerValor(registro, ["duracion_dias", "duracionDias"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
  cantidad_inicial: (() => {
    const valor = obtenerValor(registro, ["cantidad_inicial", "cantidadInicial"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
  pl_inicial: (() => {
    const valor = obtenerValor(registro, ["pl_inicial", "plInicial"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
  fecha_fin: obtenerValor(registro, ["fecha_fin", "fechaFin"], null),
  cantidad_final: (() => {
    const valor = obtenerValor(registro, ["cantidad_final", "cantidadFinal"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
  pl_final: (() => {
    const valor = obtenerValor(registro, ["pl_final", "plFinal"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
});

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
  const payload = mapearPrecriaParaBackend(registro);

  return await createPrecria(payload);
};

// Si la Pre-Cria local quedo marcada como "Finalizada" y todavia
// nunca se sincronizo (accion_sync = CREATE), no existe un
// finalizarPrecria previo en el backend - simplemente se crea ya
// con los datos de cierre incluidos, createPrecria alcanza.
// Si ya tenia servidor_id, se actualiza con PUT normal (igual que
// Enfermedades) en vez de usar el endpoint /finalizar, porque el
// endpoint dedicado solo acepta 3 campos y perderiamos el resto
// de cambios pendientes del registro.
const sincronizarUpdate = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  const payload = mapearPrecriaParaBackend(registro);

  return servidorId
    ? await updatePrecria(servidorId, payload)
    : await createPrecria(payload);
};

const sincronizarDelete = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

  return servidorId
    ? await eliminarPrecria(servidorId)
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

async function sincronizarPrecriasPendientes() {
  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [],
  };

  await localApi.inicializar();

  const pendientes = await obtenerPendientesPrecrias();

  resultado.total = pendientes.length;

  for (let i = 0; i < pendientes.length; i += 1) {
    const pendiente = pendientes[i];
    const registro = pendiente.registro;

    try {
      await sincronizarRegistro(pendiente);

      await eliminarRegistroLocalDespuesSync(
        TABLA_PRECRIAS,
        registro.id
      );

      resultado.sincronizados += 1;
    } catch (error) {
      resultado.errores.push({
        id: registro?.id ?? null,
        accion: pendiente.accion,
        mensaje: error?.response?.data?.message || error?.message || "Error al sincronizar pre-cria.",
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

const PrecriaSyncService = {
  sincronizarPrecriasPendientes,
};

export default PrecriaSyncService;
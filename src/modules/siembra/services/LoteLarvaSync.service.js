/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE LOTE DE LARVA
 * ============================================================
 *
 * Sincroniza los registros locales de Lote de Larva con el
 * backend. Cuando el backend confirma que el registro fue
 * recibido correctamente, el registro se elimina fisicamente
 * de SQLite.
 *
 * IMPORTANTE - orden de sincronizacion: Precria y Siembra
 * dependen del servidor_id de su lote_larva_id. Este service
 * debe correr ANTES de PrecriaSync/SiembraSync para que, al
 * sincronizar una Precria/Siembra que fue creada offline, ya
 * exista el servidor_id real del lote asociado (ver
 * sincronizarLotesYDependientes en el orquestador general).
 *
 * Sigue el mismo patron que EnfermedadesSync.service.js.
 */

import { createLote, updateLote, eliminarLote } from "./lote.service";
import { localApi } from "../../../database/local/localApi.service";
import {
  eliminarRegistroLocalDespuesSync,
  actualizarLocal,
} from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_LOTES_LARVA = "lotes_larva";
const TABLA_PRECRIAS = "precrias";
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

const obtenerPendientesLotes = async () => {
  const respuesta = await localApi.sync.obtenerPendientes();
  const data = obtenerDataRespuesta(respuesta);
  const pendientes = Array.isArray(data) ? data : [];

  return pendientes.filter((item) => item.tabla === TABLA_LOTES_LARVA);
};

// Igual que en Siembra: el backend real espera el mismo shape
// snake_case que arma LoteLarvaDTO (ver dtos/siembra.dto.js):
// codigo_lote, proveedor_id, laboratorio, procedencia,
// certificado_larva, pl_inicial, cantidad_inicial, fecha_ingreso.
// La tabla local solo guarda ids (laboratorio_id/procedencia_id),
// no el texto libre que a veces manda el formulario - se envian
// tal cual como id.
const mapearLoteParaBackend = (registro) => ({
  codigo_lote: obtenerValor(registro, ["codigo_lote", "codigoLote"], ""),
  proveedor_id: (() => {
    const valor = obtenerValor(registro, ["proveedor_larva_id", "proveedorLarvaId"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
  laboratorio: obtenerValor(registro, ["laboratorio_id", "laboratorioId"], null),
  procedencia: obtenerValor(registro, ["procedencia_id", "procedenciaId"], null),
  certificado_larva: obtenerValor(registro, ["certificado_larva", "certificadoLarva"], ""),
  pl_inicial: (() => {
    const valor = obtenerValor(registro, ["pl_inicial", "plInicial"], null);
    return valor !== null && valor !== undefined ? convertirNumero(valor, null) : null;
  })(),
  cantidad_inicial: convertirNumero(
    obtenerValor(registro, ["cantidad_inicial", "cantidadInicial"], 0),
    0
  ),
  fecha_ingreso: obtenerValor(registro, ["fecha_ingreso", "fechaIngreso"], ""),
});

/*
============================================================
PROPAGAR EL SERVIDOR_ID A LOS DEPENDIENTES (precrias/siembras)
============================================================
*/

// Cuando un lote creado offline se sincroniza, cualquier
// precria/siembra local que todavia apunte a su id local
// (lote_larva_id) debe quedar apuntando al servidor_id real,
// o el backend rechazara esos registros al sincronizarlos.
const actualizarReferenciasLocales = async (tabla, loteLocalId, loteServidorId) => {
  try {
    const respuesta = await localApi[tabla === TABLA_PRECRIAS ? "precrias" : "siembras"].obtenerTodos();
    const data = obtenerDataRespuesta(respuesta);
    const registros = Array.isArray(data) ? data : [];

    const dependientes = registros.filter(
      (registro) => Number(registro.lote_larva_id) === Number(loteLocalId)
    );

    for (let i = 0; i < dependientes.length; i += 1) {
      const registro = dependientes[i];

      await actualizarLocal(tabla, registro.id, {
        lote_larva_id: loteServidorId,
      });
    }
  } catch (error) {
    console.error(`Error al actualizar referencias de ${tabla} al lote sincronizado`, error);
  }
};

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
  const payload = mapearLoteParaBackend(registro);
  const loteCreado = await createLote(payload);

  const servidorId = obtenerValor(loteCreado, ["id", "servidor_id"], null);

  if (servidorId) {
    await actualizarReferenciasLocales(TABLA_PRECRIAS, registro.id, servidorId);
    await actualizarReferenciasLocales(TABLA_SIEMBRAS, registro.id, servidorId);
  }

  return loteCreado;
};

const sincronizarUpdate = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  const payload = mapearLoteParaBackend(registro);

  return servidorId
    ? await updateLote(servidorId, payload)
    : await sincronizarCreate(registro);
};

const sincronizarDelete = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

  return servidorId
    ? await eliminarLote(servidorId)
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

async function sincronizarLotesLarvaPendientes() {
  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [],
  };

  await localApi.inicializar();

  const pendientes = await obtenerPendientesLotes();

  resultado.total = pendientes.length;

  for (let i = 0; i < pendientes.length; i += 1) {
    const pendiente = pendientes[i];
    const registro = pendiente.registro;

    try {
      await sincronizarRegistro(pendiente);

      await eliminarRegistroLocalDespuesSync(
        TABLA_LOTES_LARVA,
        registro.id
      );

      resultado.sincronizados += 1;
    } catch (error) {
      resultado.errores.push({
        id: registro?.id ?? null,
        accion: pendiente.accion,
        mensaje: error?.response?.data?.message || error?.message || "Error al sincronizar lote de larva.",
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

const LoteLarvaSyncService = {
  sincronizarLotesLarvaPendientes,
};

export default LoteLarvaSyncService;
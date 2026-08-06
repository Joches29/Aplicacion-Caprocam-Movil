/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE LABORATORIO DE LARVA
 * ============================================================
 *
 * Sincroniza los registros locales del catalogo de laboratorios
 * con el backend (laboratorio.service.js). Cuando el backend
 * confirma que el registro fue recibido correctamente, el
 * registro se elimina fisicamente de SQLite.
 *
 * IMPORTANTE - orden de sincronizacion: Lote de Larva guarda el
 * id del laboratorio (laboratorio_id) que el usuario eligio
 * offline. Este service debe correr ANTES de LoteLarvaSync para
 * que, si el laboratorio tambien se creo offline, ya exista su
 * servidor_id real (ver actualizarReferenciaEnLotes mas abajo).
 *
 * Sigue el mismo patron que EnfermedadesSync.service.js /
 * LoteLarvaSync.service.js.
 */

import {
  createLaboratorio,
  updateLaboratorio,
  eliminarLaboratorio,
} from "./laboratorio.service";
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

const TABLA_LABORATORIOS = "laboratorios";
const TABLA_LOTES_LARVA = "lotes_larva";

/*
============================================================
HELPERS
============================================================
*/

const obtenerDataRespuesta = (respuesta) =>
  respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

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

const obtenerPendientesLaboratorios = async () => {
  const respuesta = await localApi.sync.obtenerPendientes();
  const data = obtenerDataRespuesta(respuesta);
  const pendientes = Array.isArray(data) ? data : [];

  return pendientes.filter((item) => item.tabla === TABLA_LABORATORIOS);
};

// El backend real solo espera {nombre} (ver laboratorio.service.js /
// routes/laboratorio.routes.js).
const mapearNombreParaBackend = (registro) =>
  obtenerValor(registro, ["nombre"], "");

/*
============================================================
PROPAGAR EL SERVIDOR_ID A LOTES DE LARVA DEPENDIENTES
============================================================
*/

// Si un Lote de Larva se creo offline apuntando a un laboratorio
// tambien creado offline, ese lote guarda el id LOCAL del
// laboratorio en laboratorio_id. Al sincronizar el laboratorio hay
// que actualizar esos lotes al servidor_id real, o el backend
// rechazara el lote al sincronizarlo despues.
const actualizarReferenciaEnLotes = async (laboratorioLocalId, laboratorioServidorId) => {
  try {
    const respuesta = await localApi.lotesLarva.obtenerTodos();
    const data = obtenerDataRespuesta(respuesta);
    const registros = Array.isArray(data) ? data : [];

    const dependientes = registros.filter(
      (registro) => Number(registro.laboratorio_id) === Number(laboratorioLocalId)
    );

    for (let i = 0; i < dependientes.length; i += 1) {
      const registro = dependientes[i];

      await actualizarLocal(TABLA_LOTES_LARVA, registro.id, {
        laboratorio_id: laboratorioServidorId,
      });
    }
  } catch (error) {
    console.error("Error al actualizar referencias de lotes_larva al laboratorio sincronizado", error);
  }
};

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
  const nombre = mapearNombreParaBackend(registro);
  const laboratorioCreado = await createLaboratorio(nombre);

  const servidorId = obtenerValor(laboratorioCreado, ["id", "servidor_id"], null);

  if (servidorId) {
    await actualizarReferenciaEnLotes(registro.id, servidorId);
  }

  return laboratorioCreado;
};

const sincronizarUpdate = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  const nombre = mapearNombreParaBackend(registro);

  return servidorId
    ? await updateLaboratorio(servidorId, nombre)
    : await sincronizarCreate(registro);
};

const sincronizarDelete = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

  return servidorId
    ? await eliminarLaboratorio(servidorId)
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

async function sincronizarLaboratoriosPendientes() {
  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [],
  };

  await localApi.inicializar();

  const pendientes = await obtenerPendientesLaboratorios();

  resultado.total = pendientes.length;

  for (let i = 0; i < pendientes.length; i += 1) {
    const pendiente = pendientes[i];
    const registro = pendiente.registro;

    try {
      await sincronizarRegistro(pendiente);

      await eliminarRegistroLocalDespuesSync(
        TABLA_LABORATORIOS,
        registro.id
      );

      resultado.sincronizados += 1;
    } catch (error) {
      resultado.errores.push({
        id: registro?.id ?? null,
        accion: pendiente.accion,
        mensaje: error?.response?.data?.message || error?.message || "Error al sincronizar laboratorio.",
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

const LaboratorioSyncService = {
  sincronizarLaboratoriosPendientes,
};

export default LaboratorioSyncService;
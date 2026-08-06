/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE PROVEEDOR DE LARVA
 * ============================================================
 *
 * Sincroniza los registros locales del catalogo de proveedores de larva
 * con el backend (proveedorLarva.service.js). Cuando el backend
 * confirma que el registro fue recibido correctamente, el
 * registro se elimina fisicamente de SQLite.
 *
 * IMPORTANTE - orden de sincronizacion: Lote de Larva guarda el
 * id del proveedor de larva (proveedor_larva_id) que el usuario eligio
 * offline. Este service debe correr ANTES de LoteLarvaSync para
 * que, si el proveedor tambien se creo offline, ya exista su
 * servidor_id real (ver actualizarReferenciaEnLotes mas abajo).
 *
 * Sigue el mismo patron que EnfermedadesSync.service.js /
 * LoteLarvaSync.service.js.
 */

import {
  createProveedorLarva,
  updateProveedorLarva,
  eliminarProveedorLarva,
} from "./proveedorLarva.service";
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

const TABLA_PROVEEDORES_LARVA = "proveedores_larva";
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

const obtenerPendientesProveedoresLarva = async () => {
  const respuesta = await localApi.sync.obtenerPendientes();
  const data = obtenerDataRespuesta(respuesta);
  const pendientes = Array.isArray(data) ? data : [];

  return pendientes.filter((item) => item.tabla === TABLA_PROVEEDORES_LARVA);
};

// El backend real solo espera {nombre} (ver proveedorLarva.service.js /
// routes/proveedorLarva.routes.js).
const mapearNombreParaBackend = (registro) =>
  obtenerValor(registro, ["nombre"], "");

/*
============================================================
PROPAGAR EL SERVIDOR_ID A LOTES DE LARVA DEPENDIENTES
============================================================
*/

// Si un Lote de Larva se creo offline apuntando a un proveedor de larva
// tambien creado offline, ese lote guarda el id LOCAL del
// proveedor en proveedor_larva_id. Al sincronizar el proveedor hay
// que actualizar esos lotes al servidor_id real, o el backend
// rechazara el lote al sincronizarlo despues.
const actualizarReferenciaEnLotes = async (proveedorLarvaLocalId, proveedorLarvaServidorId) => {
  try {
    const respuesta = await localApi.lotesLarva.obtenerTodos();
    const data = obtenerDataRespuesta(respuesta);
    const registros = Array.isArray(data) ? data : [];

    const dependientes = registros.filter(
      (registro) => Number(registro.proveedor_larva_id) === Number(proveedorLarvaLocalId)
    );

    for (let i = 0; i < dependientes.length; i += 1) {
      const registro = dependientes[i];

      await actualizarLocal(TABLA_LOTES_LARVA, registro.id, {
        proveedor_larva_id: proveedorLarvaServidorId,
      });
    }
  } catch (error) {
    console.error("Error al actualizar referencias de lotes_larva al proveedor de larva sincronizado", error);
  }
};

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
  const nombre = mapearNombreParaBackend(registro);
  const proveedorLarvaCreado = await createProveedorLarva(nombre);

  const servidorId = obtenerValor(proveedorLarvaCreado, ["id", "servidor_id"], null);

  if (servidorId) {
    await actualizarReferenciaEnLotes(registro.id, servidorId);
  }

  return proveedorLarvaCreado;
};

const sincronizarUpdate = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  const nombre = mapearNombreParaBackend(registro);

  return servidorId
    ? await updateProveedorLarva(servidorId, nombre)
    : await sincronizarCreate(registro);
};

const sincronizarDelete = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

  return servidorId
    ? await eliminarProveedorLarva(servidorId)
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

async function sincronizarProveedoresLarvaPendientes() {
  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [],
  };

  await localApi.inicializar();

  const pendientes = await obtenerPendientesProveedoresLarva();

  resultado.total = pendientes.length;

  for (let i = 0; i < pendientes.length; i += 1) {
    const pendiente = pendientes[i];
    const registro = pendiente.registro;

    try {
      await sincronizarRegistro(pendiente);

      await eliminarRegistroLocalDespuesSync(
        TABLA_PROVEEDORES_LARVA,
        registro.id
      );

      resultado.sincronizados += 1;
    } catch (error) {
      resultado.errores.push({
        id: registro?.id ?? null,
        accion: pendiente.accion,
        mensaje: error?.response?.data?.message || error?.message || "Error al sincronizar proveedor de larva.",
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

const ProveedorLarvaSyncService = {
  sincronizarProveedoresLarvaPendientes,
};

export default ProveedorLarvaSyncService;
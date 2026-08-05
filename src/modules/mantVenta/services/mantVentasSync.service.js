/**
 * ============================================================
 * SERVICE DE SINCRONIZACION DE VENTAS (SQLite <-> Backend)
 * ============================================================
 *
 * Sincroniza los registros locales de Ventas con el
 * backend.
 *
 * Cuando el backend confirma que el registro fue recibido
 * correctamente, el registro se elimina fisicamente de SQLite.
 */

import { getVentas, createVenta, updateVenta, deleteVenta } from "./mantVentas.service";
import { localApi } from "../../../database/local/localApi.service";
import { eliminarRegistroLocalDespuesSync } from "../../../database/local/localCrud.service";

/*
============================================================
CONSTANTES
============================================================
*/

const TABLA_VENTAS = "ventas";

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

const obtenerPendientesVentas = async () => {
  const respuesta = await localApi.sync.obtenerPendientes();
  const data = obtenerDataRespuesta(respuesta);
  const pendientes = Array.isArray(data) ? data : [];
  return pendientes.filter((item) => item.tabla === TABLA_VENTAS);
};

/*
============================================================
MAPEO LOCAL A BACKEND
============================================================
*/

const mapearVentaParaBackend = (registro) => ({
  finca: convertirNumero(obtenerValor(registro, ["finca_id", "finca"]), null),
  estanque: convertirNumero(obtenerValor(registro, ["estanque_id", "estanque"]), null),
  colaborador: obtenerValor(registro, ["colaborador_id", "colaborador"], null) 
    ? convertirNumero(obtenerValor(registro, ["colaborador_id", "colaborador"]), null) 
    : null,
  comprador: obtenerValor(registro, ["comprador_id", "comprador"], null)
    ? convertirNumero(obtenerValor(registro, ["comprador_id", "comprador"]), null)
    : null,
  pesoPromedio: Number(obtenerValor(registro, ["peso_promedio", "pesoPromedio"], 0)),
  tamanoPromedio: Number(obtenerValor(registro, ["tamano_promedio", "tamanoPromedio"], 0)),
  cantVendida: Number(obtenerValor(registro, ["cantidad_vendida", "cantVendida"], 0)),
  precioKilo: Number(obtenerValor(registro, ["precio_kilo", "precioKilo"], 0)),
  fecha: obtenerValor(registro, ["fecha"], ""),
});

/*
============================================================
SINCRONIZACION POR ACCION
============================================================
*/

const sincronizarCreate = async (registro) => {
  const payload = mapearVentaParaBackend(registro);
  return await createVenta(payload);
};

const sincronizarUpdate = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  const payload = mapearVentaParaBackend(registro);

  return servidorId
    ? await updateVenta(servidorId, payload)
    : await createVenta(payload);
};

const sincronizarDelete = async (registro) => {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);
  return servidorId
    ? await deleteVenta(servidorId)
    : { eliminadoSoloLocal: true };
};

const sincronizarRegistro = async (pendiente) => {
  const accion = pendiente.accion;
  const registro = pendiente.registro;

  if (accion === "DELETE") return await sincronizarDelete(registro);
  if (accion === "UPDATE") return await sincronizarUpdate(registro);
  return await sincronizarCreate(registro);
};

/*
============================================================
FUNCION PRINCIPAL
============================================================
*/

async function sincronizarVentasPendientes() {
  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [],
  };

  await localApi.inicializar();
  const pendientes = await obtenerPendientesVentas();
  resultado.total = pendientes.length;

  for (let i = 0; i < pendientes.length; i += 1) {
    const pendiente = pendientes[i];
    const registro = pendiente.registro;

    try {
      await sincronizarRegistro(pendiente);
      await eliminarRegistroLocalDespuesSync(TABLA_VENTAS, registro.id);
      resultado.sincronizados += 1;
    } catch (error) {
      resultado.errores.push({
        id: registro?.id ?? null,
        accion: pendiente.accion,
        mensaje: error?.message || "Error al sincronizar venta.",
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

const VentasSyncService = {
  sincronizarVentasPendientes,
};

export default VentasSyncService;
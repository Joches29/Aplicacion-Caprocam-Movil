/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: sync.service.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 03/08/2026
Modulo: Database Local
Descripcion:
Servicio base para sincronizar datos entre SQLite local y
el backend principal. Permite descargar catalogos, guardar
datos locales y enviar registros pendientes de sincronizar.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from "./localApi.service";
import { exitoLocal, errorLocal } from "./respuestaLocal";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const ENDPOINTS_SYNC = {
  grupos_datos: "/grupos-datos",
  roles: "/roles",
  usuarios: "/usuarios",

  fincas: "/fincas",
  colaboradores: "/colaboradores",
  estanques: "/estanques",

  proveedores: "/proveedores",
  productos: "/productos",
  inventario: "/inventario",
  movimientos_inventario: "/movimientos-inventario",

  compradores: "/compradores",
  ventas: "/ventas",

  equipos: "/equipos",
  tareas: "/tareas",
  mantenimiento_equipo: "/mantenimiento-equipo",
  mantenimiento_equipo_tareas: "/mantenimiento-equipo-tareas",
  mantenimiento_equipo_productos: "/mantenimiento-equipo-productos",

  laboratorios: "/laboratorios",
  procedencias: "/procedencias",
  proveedores_larva: "/proveedores-larva",
  lotes_larva: "/lotes-larva",
  precrias: "/precrias",
  siembras: "/siembras",

  alimentaciones: "/alimentaciones",
  crecimientos: "/crecimientos",
  fisico_quimico: "/fisico-quimico",
  fisico_quimico_detalle: "/fisico-quimico-detalle",
  densidad_poblacional: "/densidad-poblacional",
  enfermedades: "/enfermedades",
  parasitologias: "/parasitologias",
  raleos: "/raleos",
  trazabilidad: "/trazabilidad",
};

const TABLAS_DESCARGA_INICIAL = [
  "grupos_datos",
  "roles",
  "usuarios",
  "colaboradores",
  "fincas",
  "estanques",
  "proveedores",
  "productos",
  "inventario",
  "compradores",
  "equipos",
  "tareas",
  "laboratorios",
  "procedencias",
  "proveedores_larva",
  "lotes_larva",
  "precrias",
  "siembras",
];

const CAMPOS_SOLO_LOCALES = [
  "id",
  "servidor_id",
  "sincronizado",
  "pendiente_sync",
  "accion_sync",
  "fecha_sync",
];

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

/**
 * Obtiene el endpoint configurado para una tabla.
 * @param {string} tabla - Nombre de tabla local.
 * @returns {string|null} Endpoint del backend.
 */
const obtenerEndpointTabla = (tabla) => {
  if (!ENDPOINTS_SYNC[tabla]) {
    return null;
  }

  return ENDPOINTS_SYNC[tabla];
};

/**
 * Obtiene data segura desde una respuesta HTTP del backend.
 * @param {object} respuestaHttp - Respuesta HTTP.
 * @returns {Array|object|null} Data extraida.
 */
const obtenerDataBackend = (respuestaHttp) => {
  if (!respuestaHttp) {
    return null;
  }

  if (respuestaHttp.data && respuestaHttp.data.data !== undefined) {
    return respuestaHttp.data.data;
  }

  if (respuestaHttp.data !== undefined) {
    return respuestaHttp.data;
  }

  return null;
};

/**
 * Prepara un registro local antes de enviarlo al backend.
 * @param {object} registro - Registro local.
 * @returns {object} Registro limpio.
 */
const prepararRegistroParaServidor = (registro) => {
  const datos = {
    ...registro,
  };

  CAMPOS_SOLO_LOCALES.forEach((campo) => {
    delete datos[campo];
  });

  return datos;
};

/**
 * Obtiene el ID que se debe usar para actualizar/eliminar en backend.
 * @param {object} registro - Registro local.
 * @returns {number|string|null} ID del backend o UUID.
 */
const obtenerIdentificadorServidor = (registro) => {
  if (registro.servidor_id) {
    return registro.servidor_id;
  }

  if (registro.uuid) {
    return registro.uuid;
  }

  return null;
};

/**
 * Ejecuta la accion correspondiente contra el backend.
 * @param {object} apiClient - Instancia axios del proyecto.
 * @param {string} endpoint - Endpoint del backend.
 * @param {string} accion - Accion pendiente.
 * @param {object} registro - Registro local.
 * @returns {Promise<object>} Respuesta HTTP.
 */
const enviarRegistroServidor = async (
  apiClient,
  endpoint,
  accion,
  registro
) => {
  const datos = prepararRegistroParaServidor(registro);

  if (accion === "CREATE") {
    return await apiClient.post(endpoint, datos);
  }

  if (accion === "UPDATE") {
    const identificador = obtenerIdentificadorServidor(registro);

    if (!identificador) {
      throw new Error(
        "No existe identificador para actualizar en servidor."
      );
    }

    return await apiClient.put(`${endpoint}/${identificador}`, datos);
  }

  if (accion === "DELETE") {
    const identificador = obtenerIdentificadorServidor(registro);

    if (!identificador) {
      throw new Error("No existe identificador para eliminar en servidor.");
    }

    return await apiClient.delete(`${endpoint}/${identificador}`);
  }

  throw new Error("Accion de sincronizacion no permitida.");
};

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Descarga una tabla del backend y la guarda en SQLite.
 * @param {object} apiClient - Instancia axios del proyecto.
 * @param {string} tabla - Nombre de tabla local.
 * @param {object} [credenciales] - Cédula y PIN opcionales para la petición.
 * @returns {Promise<object>} Respuesta local.
 */
export const descargarTablaLocal = async (apiClient, tabla, credenciales = {}) => {
  try {
    const endpoint = obtenerEndpointTabla(tabla);

    if (!endpoint) {
      return errorLocal(
        "La tabla no tiene endpoint de sincronizacion.",
        tabla
      );
    }

    const config = credenciales?.cedula
      ? { headers: { "X-User-Cedula": credenciales.cedula, "X-User-Pin": credenciales.pin } }
      : {};

    const respuestaHttp = await apiClient.get(endpoint, config);
    const data = obtenerDataBackend(respuestaHttp);

    let registros = data;

    if (!Array.isArray(registros)) {
      registros = [];
    }

    const respuestaGuardado =
      await localApi.sync.guardarDesdeServidor(tabla, registros);

    return exitoLocal("Tabla descargada y guardada localmente.", {
      tabla: tabla,
      total: registros.length,
      resultado: respuestaGuardado,
    });
  } catch (err) {
    return errorLocal("Error al descargar tabla local.", err);
  }
};

/**
 * Descarga ÚNICAMENTE la lista de colaboradores para el inicio de sesión.
 * @param {object} apiClient - Instancia axios del proyecto.
 * @param {object} credenciales - Cédula y PIN ingresados en el modal de login.
 * @returns {Promise<object>} Respuesta local.
 */
export const descargarColaboradoresLoginLocal = async (apiClient, credenciales = {}) => {
  try {
    await localApi.inicializar();

    // Consultamos únicamente la tabla de colaboradores
    const resultado = await descargarTablaLocal(apiClient, "colaboradores", credenciales);

    if (!resultado || !resultado.success) {
      return errorLocal(
        "No se pudo descargar la lista de colaboradores desde el servidor.",
        resultado?.error ?? null
      );
    }

    return exitoLocal("Colaboradores sincronizados correctamente.", resultado.data);
  } catch (err) {
    return errorLocal("Error al conectar con el servicio de colaboradores.", err);
  }
};

/**
 * Descarga los catalogos y datos base necesarios para trabajar offline (Módule de Sincronización General).
 * @param {object} apiClient - Instancia axios del proyecto.
 * @param {object} [credenciales] - Cédula y PIN.
 * @returns {Promise<object>} Respuesta local.
 */
export const descargarDatosInicialesLocal = async (apiClient, credenciales = {}) => {
  try {
    const resultados = [];
    let hayErrores = false;

    await localApi.inicializar();

    for (const tabla of TABLAS_DESCARGA_INICIAL) {
      const resultado = await descargarTablaLocal(apiClient, tabla, credenciales);

      if (!resultado.success) {
        hayErrores = true;
      }

      resultados.push({
        tabla: tabla,
        success: resultado.success,
        message: resultado.message,
        data: resultado.data ?? null,
        error: resultado.error ?? null,
      });
    }

    if (hayErrores) {
      const tablasConError = resultados.filter((r) => !r.success);
      return errorLocal(
        `Error al conectar con el servidor para la sincronización (${tablasConError.length} tablas fallaron).`,
        resultados
      );
    }

    return exitoLocal("Sincronización de datos completada correctamente.", resultados);
  } catch (err) {
    return errorLocal("Error de conexión durante la descarga inicial.", err);
  }
};

/**
 * Sincroniza los registros locales pendientes con el backend.
 * @param {object} apiClient - Instancia axios del proyecto.
 * @returns {Promise<object>} Respuesta local.
 */
export const sincronizarPendientesLocal = async (apiClient) => {
  try {
    const respuestaPendientes = await localApi.sync.obtenerPendientes();

    if (!respuestaPendientes.success) {
      return respuestaPendientes;
    }

    const pendientes = respuestaPendientes.data;
    const resultados = [];

    for (const item of pendientes) {
      const endpoint = obtenerEndpointTabla(item.tabla);

      if (!endpoint) {
        resultados.push({
          tabla: item.tabla,
          id: item.registro.id,
          success: false,
          message: "No existe endpoint configurado para la tabla.",
          error: item.tabla,
        });

        continue;
      }

      try {
        const respuestaHttp = await enviarRegistroServidor(
          apiClient,
          endpoint,
          item.accion,
          item.registro
        );

        const dataBackend = obtenerDataBackend(respuestaHttp);
        let servidorId = null;

        if (dataBackend && dataBackend.id) {
          servidorId = dataBackend.id;
        }

        await localApi.sync.marcarSincronizado(
          item.tabla,
          item.registro.id,
          servidorId
        );

        resultados.push({
          tabla: item.tabla,
          id: item.registro.id,
          accion: item.accion,
          success: true,
          message: "Registro sincronizado correctamente.",
        });
      } catch (err) {
        resultados.push({
          tabla: item.tabla,
          id: item.registro.id,
          accion: item.accion,
          success: false,
          message: "Error al sincronizar registro.",
          error: err.message,
        });
      }
    }

    return exitoLocal("Sincronizacion de pendientes finalizada.", resultados);
  } catch (err) {
    return errorLocal(
      "Error durante la sincronizacion de pendientes.",
      err
    );
  }
};

/**
 * Ejecuta sincronizacion completa: sube pendientes y luego descarga datos base.
 * @param {object} apiClient - Instancia axios del proyecto.
 * @param {object} [credenciales] - Cédula y PIN ingresados.
 * @returns {Promise<object>} Respuesta local.
 */
export const sincronizarCompletoLocal = async (apiClient, credenciales = {}) => {
  try {
    const subida = await sincronizarPendientesLocal(apiClient);
    const descarga = await descargarDatosInicialesLocal(apiClient, credenciales);

    if (!descarga.success) {
      return descarga;
    }

    return exitoLocal("Sincronizacion completa finalizada.", {
      subida: subida,
      descarga: descarga,
    });
  } catch (err) {
    return errorLocal("Error durante la sincronizacion completa.", err);
  }
};
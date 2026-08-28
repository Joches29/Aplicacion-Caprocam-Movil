/**
 * configSync.service.js
 * Sincronizacion Nube -> Movil y Movil -> Nube
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

import api from "../../../api/api";
import { localApi } from "../../../database/local/localApi.service";

/*
============================================================
CONSTANTES
============================================================
*/

const STORAGE_GRUPO_DATOS = "caprocam_grupo_datos";

const MAPEO_DESCARGA = {
  usuarios: "usuarios",
  fincas: "fincas",
  estanques: "estanques",
  proveedores: "proveedores",
  productos: "productos",
  compradores: "compradores",
  inventario: "inventario",
  equipos: "equipos",
  tareas: "tareas",
  laboratorios: "laboratorios",
  procedencias: "procedencias",
  proveedoresLarva: "proveedores_larva",
  lotesLarva: "lotes_larva",
  precrias: "precrias",
  siembras: "siembras",
  enfermedades: "enfermedades",
  parasitologias: "parasitologias",
  fisicoQuimica: "fisico_quimico",
  detalleFisicoQuimica: "fisico_quimico_detalle",
  crecimientos: "crecimientos",
  calculosCrecimiento: "calculos_crecimiento",
  trazabilidad: "trazabilidad",
  ventas: "ventas",
  mantenimientos: "mantenimiento_equipo",
  mantenimientoTareas: "mantenimiento_equipo_tareas",
  mantenimientoProductos: "mantenimiento_equipo_productos",
};

const MAPEO_SUBIDA = {
  equipos: "equipos",
  alimentaciones: "alimentacion",
  crecimientos: "crecimiento",
  calculos_crecimiento: "calculosCrecimiento",
  fisico_quimico: "fisicoQuimica",
  fisico_quimico_detalle: "detalleFisicoQuimica",
  densidad_poblacional: "densidadPoblacional",
  densidad_detalle_tiros: "detalleTirosDensidad",
  enfermedades: "enfermedades",
  parasitologias: "parasitologias",
  raleos: "raleos",
  ventas: "ventas",
  trazabilidad: "trazabilidad",
  movimientos_inventario: "movimientosInventario",
  mantenimiento_equipo: "mantenimientos",
  mantenimiento_equipo_tareas: "tareasMantenimiento",
  mantenimiento_equipo_productos: "productosMantenimiento",
};

/*
============================================================
FUNCIONES GENERALES
============================================================
*/

const camelASnake = (str) =>
  str.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);

const normalizarValor = (valor) => {
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "boolean") return valor ? 1 : 0;
  if (valor !== null && typeof valor === "object") return JSON.stringify(valor);

  return valor;
};

const convertirRegistroASnake = (registro) => {
  if (!registro || typeof registro !== "object") return registro;

  const resultado = {};

  for (const [clave, valor] of Object.entries(registro)) {
    resultado[camelASnake(clave)] = normalizarValor(valor);
  }

  return resultado;
};

const guardarGrupoDatosActivo = async (grupoDatos) => {
  if (
    grupoDatos === undefined ||
    grupoDatos === null ||
    String(grupoDatos).trim() === ""
  ) {
    return;
  }

  await AsyncStorage.setItem(STORAGE_GRUPO_DATOS, String(grupoDatos));
};

const obtenerAndroidId = () => {
  try {
    if (typeof Application.getAndroidId === "function") {
      return Application.getAndroidId() ?? "desconocido";
    }

    return Application.androidId ?? "desconocido";
  } catch (error) {
    return "desconocido";
  }
};

/*
============================================================
NORMALIZACION POR TABLA
============================================================
*/

const obtenerDataLocal = (respuesta) => {
  if (!respuesta?.success) {
    return null;
  }

  return respuesta.data ?? null;
};

const obtenerIdLocalDesdeServidor = async (
  servicio,
  servidorId,
  nombreRelacion,
  opcional = false
) => {
  if (
    servidorId === undefined ||
    servidorId === null ||
    servidorId === ""
  ) {
    return null;
  }

  const respuesta =
    await servicio.obtenerPorServidorId(
      servidorId
    );

  const registro =
    obtenerDataLocal(respuesta);

  if (registro?.id != null) {
    return Number(registro.id);
  }

  if (opcional) {
    return null;
  }

  throw new Error(
    `No se encontro localmente la relacion ${nombreRelacion} con servidor_id ${servidorId}.`
  );
};

const obtenerIdServidorDesdeLocal = async (
  servicio,
  idValor,
  nombreRelacion
) => {
  if (
    idValor === undefined ||
    idValor === null ||
    idValor === ""
  ) {
    return null;
  }

  const id = Number(idValor);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(
      `ID invalido para ${nombreRelacion}: ${idValor}.`
    );
  }

  const respuestaLocal =
    await servicio.obtenerPorId(id);

  const registroLocal =
    obtenerDataLocal(respuestaLocal);

  if (registroLocal) {
    const servidorId = Number(
      registroLocal.servidor_id ??
      registroLocal.servidorId ??
      0
    );

    if (
      Number.isFinite(servidorId) &&
      servidorId > 0
    ) {
      return servidorId;
    }

    throw new Error(
      `El ${nombreRelacion} local ${id} todavia no tiene servidor_id.`
    );
  }

  const respuestaServidor =
    await servicio.obtenerPorServidorId(id);

  const registroServidor =
    obtenerDataLocal(respuestaServidor);

  if (registroServidor) {
    return id;
  }

  throw new Error(
    `No se pudo resolver el ID de servidor para ${nombreRelacion} ${id}.`
  );
};

const normalizarPorTabla = async (
  tabla,
  registro,
  grupoDatos
) => {
  const r = {
    ...registro,
  };

  if (
    grupoDatos != null &&
    r.grupo_datos == null
  ) {
    r.grupo_datos = grupoDatos;
  }

  switch (tabla) {
    case "usuarios":
      if (!r.password_hash) {
        r.password_hash =
          "__SYNC_PLACEHOLDER__";
      }
      break;

    case "fincas":
      if (r.codigo_c_b_o !== undefined) {
        r.codigo_cbo =
          r.codigo_c_b_o;

        delete r.codigo_c_b_o;
      }
      break;

    case "estanques":
      if (r.id_finca !== undefined) {
        r.finca_id =
          r.id_finca;

        delete r.id_finca;
      }

      if (r.finca_id != null) {
        r.finca_id =
          await obtenerIdLocalDesdeServidor(
            localApi.fincas,
            r.finca_id,
            "finca del estanque"
          );
      }
      break;

    case "colaboradores":
      if (!r.pin_hash) {
        r.pin_hash =
          "__SYNC_PLACEHOLDER__";
      }
      break;

    case "productos":
      if (r.entry_date !== undefined) {
        r.fecha_ingreso =
          r.entry_date;

        delete r.entry_date;
      }

      if (
        r.expiration_date !==
        undefined
      ) {
        r.fecha_caducidad =
          r.expiration_date;

        delete r.expiration_date;
      }
      break;

    case "equipos":
      if (
        r.nombre !== undefined &&
        r.nombre_equipo === undefined
      ) {
        r.nombre_equipo =
          r.nombre;
      }

      if (
        r.tipo !== undefined &&
        r.tipo_equipo === undefined
      ) {
        r.tipo_equipo =
          r.tipo;
      }

      if (
        r.funcion !== undefined &&
        r.funcion_equipo === undefined
      ) {
        r.funcion_equipo =
          r.funcion;
      }

      if (
        r.estanque !== undefined &&
        r.estanque_id === undefined
      ) {
        r.estanque_id =
          r.estanque;
      }

      if (
        r.fecha_ultimo_encendido ===
        undefined &&
        r.fecha_ultimo_encendido_at !==
        undefined
      ) {
        r.fecha_ultimo_encendido =
          r.fecha_ultimo_encendido_at;
      }
      break;

    case "lotes_larva":
      if (r.proveedor_larva_id != null) {
        r.proveedor_larva_id =
          await obtenerIdLocalDesdeServidor(
            localApi.proveedoresLarva,
            r.proveedor_larva_id,
            "proveedor de larva",
            true
          );
      }

      if (r.laboratorio_id != null) {
        r.laboratorio_id =
          await obtenerIdLocalDesdeServidor(
            localApi.laboratorios,
            r.laboratorio_id,
            "laboratorio",
            true
          );
      }

      if (r.procedencia_id != null) {
        r.procedencia_id =
          await obtenerIdLocalDesdeServidor(
            localApi.procedencias,
            r.procedencia_id,
            "procedencia",
            true
          );
      }
      break;

    case "precrias":
      r.lote_larva_id =
        await obtenerIdLocalDesdeServidor(
          localApi.lotesLarva,
          r.lote_larva_id,
          "lote de larva de precria"
        );

      r.finca_id =
        await obtenerIdLocalDesdeServidor(
          localApi.fincas,
          r.finca_id,
          "finca de precria"
        );

      r.estanque_id =
        await obtenerIdLocalDesdeServidor(
          localApi.estanques,
          r.estanque_id,
          "estanque de precria"
        );
      break;

    case "siembras":
      r.lote_larva_id =
        await obtenerIdLocalDesdeServidor(
          localApi.lotesLarva,
          r.lote_larva_id,
          "lote de larva de siembra"
        );

      if (r.precria_id != null) {
        r.precria_id =
          await obtenerIdLocalDesdeServidor(
            localApi.precrias,
            r.precria_id,
            "precria de siembra",
            true
          );
      }

      r.finca_id =
        await obtenerIdLocalDesdeServidor(
          localApi.fincas,
          r.finca_id,
          "finca de siembra"
        );

      r.estanque_id =
        await obtenerIdLocalDesdeServidor(
          localApi.estanques,
          r.estanque_id,
          "estanque de siembra"
        );
      break;

    case "mantenimiento_equipo":
      if (
        r.equipo !== undefined &&
        r.equipo_id === undefined
      ) {
        r.equipo_id =
          r.equipo;

        delete r.equipo;
      }

      if (
        r.codigo_ticket ===
        undefined &&
        r.codigo !== undefined
      ) {
        r.codigo_ticket =
          r.codigo;
      }

      if (
        r.titulo_ticket ===
        undefined &&
        r.titulo !== undefined
      ) {
        r.titulo_ticket =
          r.titulo;
      }

      if (
        r.descripcion_ticket ===
        undefined &&
        r.descripcion !== undefined
      ) {
        r.descripcion_ticket =
          r.descripcion;
      }

      if (
        r.estado_ticket ===
        undefined &&
        r.estado !== undefined
      ) {
        r.estado_ticket =
          r.estado;
      }

      if (
        r.estado_equipo ===
        undefined &&
        r.estado_equipo_actual !==
        undefined
      ) {
        r.estado_equipo =
          r.estado_equipo_actual;
      }
      break;

    case "mantenimiento_equipo_tareas":
      if (
        r.mantenimiento_id !==
        undefined &&
        r.mantenimiento_equipo_id ===
        undefined
      ) {
        r.mantenimiento_equipo_id =
          r.mantenimiento_id;
      }

      if (
        r.ticket_id !== undefined &&
        r.mantenimiento_equipo_id ===
        undefined
      ) {
        r.mantenimiento_equipo_id =
          r.ticket_id;
      }

      if (
        r.estado === undefined &&
        r.estado_tarea !== undefined
      ) {
        r.estado =
          r.estado_tarea;
      }

      if (
        r.estado_tarea ===
        undefined &&
        r.estado !== undefined
      ) {
        r.estado_tarea =
          r.estado;
      }
      break;

    case "mantenimiento_equipo_productos":
      if (
        r.mantenimiento_id !==
        undefined &&
        r.mantenimiento_equipo_id ===
        undefined
      ) {
        r.mantenimiento_equipo_id =
          r.mantenimiento_id;
      }

      if (
        r.ticket_id !== undefined &&
        r.mantenimiento_equipo_id ===
        undefined
      ) {
        r.mantenimiento_equipo_id =
          r.ticket_id;
      }
      break;

    case "crecimientos":
      if (r.finca_id != null) {
        r.finca_id =
          await obtenerIdLocalDesdeServidor(
            localApi.fincas,
            r.finca_id,
            "finca de crecimiento"
          );
      }

      if (r.estanque_id != null) {
        r.estanque_id =
          await obtenerIdLocalDesdeServidor(
            localApi.estanques,
            r.estanque_id,
            "estanque de crecimiento"
          );
      }
      break;

    case "calculos_crecimiento":
      if (r.crecimiento_id != null) {
        r.crecimiento_id =
          await obtenerIdLocalDesdeServidor(
            localApi.crecimientos,
            r.crecimiento_id,
            "crecimiento del muestreo"
          );
      }
      break;

    case "fisico_quimico":
      if (r.finca_id != null) {
        r.finca_id =
          await obtenerIdLocalDesdeServidor(
            localApi.fincas,
            r.finca_id,
            "finca de fisico quimico"
          );
      }

      if (r.estanque_id != null) {
        r.estanque_id =
          await obtenerIdLocalDesdeServidor(
            localApi.estanques,
            r.estanque_id,
            "estanque de fisico quimico"
          );
      }
      break;

    case "fisico_quimico_detalle":
      if (r.lectura_id != null) {
        r.lectura_id =
          await obtenerIdLocalDesdeServidor(
            localApi.fisicoQuimico,
            r.lectura_id,
            "lectura fisico quimica"
          );
      }
      break;

    case "trazabilidad":
      if (r.finca_id != null) {
        r.finca_id =
          await obtenerIdLocalDesdeServidor(
            localApi.fincas,
            r.finca_id,
            "finca de trazabilidad"
          );
      }

      if (r.estanque_origen_id != null) {
        r.estanque_origen_id =
          await obtenerIdLocalDesdeServidor(
            localApi.estanques,
            r.estanque_origen_id,
            "estanque origen de trazabilidad",
            true
          );
      }

      if (r.estanque_destino_id != null) {
        r.estanque_destino_id =
          await obtenerIdLocalDesdeServidor(
            localApi.estanques,
            r.estanque_destino_id,
            "estanque destino de trazabilidad",
            true
          );
      }

      if (r.creado_por_usuario_id != null) {
        const usuarioLocal =
          await obtenerIdLocalDesdeServidor(
            localApi.usuarios,
            r.creado_por_usuario_id,
            "usuario creador de trazabilidad",
            true
          );

        if (usuarioLocal != null) {
          r.creado_por_usuario_id =
            usuarioLocal;
        }
      }

      if (r.creado_por_colaborador_id != null) {
        const colaboradorLocal =
          await obtenerIdLocalDesdeServidor(
            localApi.colaboradores,
            r.creado_por_colaborador_id,
            "colaborador creador de trazabilidad",
            true
          );

        if (colaboradorLocal != null) {
          r.creado_por_colaborador_id =
            colaboradorLocal;
        }
      }
      break;

    case "enfermedades":
    case "parasitologias":
      if (r.finca_id != null) {
        r.finca_id =
          await obtenerIdLocalDesdeServidor(
            localApi.fincas,
            r.finca_id,
            "finca del registro"
          );
      }

      if (r.estanque_id != null) {
        r.estanque_id =
          await obtenerIdLocalDesdeServidor(
            localApi.estanques,
            r.estanque_id,
            "estanque del registro"
          );
      }
      break;
  }

  return r;
};

async function guardarCatalogoLocal(
  tabla,
  registros,
  grupoDatos
) {
  const listaRegistros =
    Array.isArray(registros)
      ? registros
      : [];

  const registrosNorm = [];

  for (
    const registro
    of listaRegistros
  ) {
    const snake =
      convertirRegistroASnake(
        registro
      );

    const normalizado =
      await normalizarPorTabla(
        tabla,
        snake,
        grupoDatos
      );

    registrosNorm.push(
      normalizado
    );
  }

  const resultado =
    await localApi.sync.guardarDesdeServidor(
      tabla,
      registrosNorm,
      {
        reconciliar: true,
      }
    );

  if (!resultado.success) {
    return {
      tabla,
      total:
        listaRegistros.length,
      guardados: 0,
      success: false,
      error:
        resultado.message,
    };
  }

  return {
    tabla,
    total:
      listaRegistros.length,
    guardados:
      listaRegistros.length,
    success: true,
    resultado,
  };
}

/*
============================================================
HELPERS DE SUBIDA
============================================================
*/

function obtenerAccionSync(item) {
  return String(item.accion ?? "").toUpperCase();
}

function tieneServidorId(registro) {
  const servidorId = registro.servidor_id ?? registro.servidorId;

  return !(
    servidorId === undefined ||
    servidorId === null ||
    servidorId === "" ||
    servidorId === "null" ||
    servidorId === "undefined"
  );
}

function normalizarAccion(item) {
  const accion =
    obtenerAccionSync(item);

  if (
    accion === "UPDATE" &&
    !tieneServidorId(item.registro)
  ) {
    return "CREATE";
  }

  return accion;
}

async function normalizarRegistroParaSubida(
  tabla,
  registro
) {
  const r = {
    ...registro,
  };

  try {
    switch (tabla) {
      case "densidad_poblacional":
        if (r.finca_id != null) {
          r.finca_id =
            await obtenerIdServidorDesdeLocal(
              localApi.fincas,
              r.finca_id,
              "finca"
            );
        }

        if (r.estanque_id != null) {
          r.estanque_id =
            await obtenerIdServidorDesdeLocal(
              localApi.estanques,
              r.estanque_id,
              "estanque"
            );
        }
        break;

      case "raleos":
        if (r.finca_id != null) {
          r.finca_id =
            await obtenerIdServidorDesdeLocal(
              localApi.fincas,
              r.finca_id,
              "finca"
            );
        }

        if (r.estanque_id != null) {
          r.estanque_id =
            await obtenerIdServidorDesdeLocal(
              localApi.estanques,
              r.estanque_id,
              "estanque"
            );
        }

        if (r.siembra_id != null) {
          r.siembra_id =
            await obtenerIdServidorDesdeLocal(
              localApi.siembras,
              r.siembra_id,
              "siembra"
            );
        }
        break;

      case "enfermedades":
      case "parasitologias":
      case "crecimientos":
      case "fisico_quimico":
        if (r.finca_id != null) {
          r.finca_id =
            await obtenerIdServidorDesdeLocal(
              localApi.fincas,
              r.finca_id,
              "finca"
            );
        }

        if (r.estanque_id != null) {
          r.estanque_id =
            await obtenerIdServidorDesdeLocal(
              localApi.estanques,
              r.estanque_id,
              "estanque"
            );
        }
        break;

      case "ventas":
        if (r.finca_id != null) {
          r.finca_id =
            await obtenerIdServidorDesdeLocal(
              localApi.fincas,
              r.finca_id,
              "finca"
            );
        }

        if (r.estanque_id != null) {
          r.estanque_id =
            await obtenerIdServidorDesdeLocal(
              localApi.estanques,
              r.estanque_id,
              "estanque"
            );
        }

        if (r.comprador_id != null) {
          r.comprador_id =
            await obtenerIdServidorDesdeLocal(
              localApi.compradores,
              r.comprador_id,
              "comprador"
            );
        }
        break;

      case "trazabilidad":
        if (r.finca_id != null) {
          r.finca_id =
            await obtenerIdServidorDesdeLocal(
              localApi.fincas,
              r.finca_id,
              "finca"
            );
        }

        if (
          r.estanque_origen_id != null
        ) {
          r.estanque_origen_id =
            await obtenerIdServidorDesdeLocal(
              localApi.estanques,
              r.estanque_origen_id,
              "estanque origen"
            );
        }

        if (
          r.estanque_destino_id != null
        ) {
          r.estanque_destino_id =
            await obtenerIdServidorDesdeLocal(
              localApi.estanques,
              r.estanque_destino_id,
              "estanque destino"
            );
        }
        break;

      case "alimentaciones":
        if (r.finca_id != null) {
          r.finca_id =
            await obtenerIdServidorDesdeLocal(
              localApi.fincas,
              r.finca_id,
              "finca"
            );
        }

        if (r.estanque_id != null) {
          r.estanque_id =
            await obtenerIdServidorDesdeLocal(
              localApi.estanques,
              r.estanque_id,
              "estanque"
            );
        }

        if (r.proveedor_id != null) {
          r.proveedor_id =
            await obtenerIdServidorDesdeLocal(
              localApi.proveedores,
              r.proveedor_id,
              "proveedor"
            );
        }

        if (r.producto_id != null) {
          r.producto_id =
            await obtenerIdServidorDesdeLocal(
              localApi.productos,
              r.producto_id,
              "producto"
            );
        }
        break;
    }

    return r;
  } catch (error) {
    throw new Error(
      `[${tabla}] ${error.message}`
    );
  }
}

async function agregarPendientePorTabla(
  porTabla,
  item
) {
  if (!MAPEO_SUBIDA[item.tabla]) {
    return false;
  }

  if (!porTabla[item.tabla]) {
    porTabla[item.tabla] = {
      crear: [],
      actualizar: [],
      eliminar: [],
    };
  }

  const accion =
    normalizarAccion(item);

  if (accion === "CREATE") {
    const registro =
      await normalizarRegistroParaSubida(
        item.tabla,
        item.registro
      );

    porTabla[item.tabla]
      .crear
      .push(registro);

    return true;
  }

  if (accion === "UPDATE") {
    const registro =
      await normalizarRegistroParaSubida(
        item.tabla,
        item.registro
      );

    porTabla[item.tabla]
      .actualizar
      .push(registro);

    return true;
  }

  if (accion === "DELETE") {
    porTabla[item.tabla]
      .eliminar
      .push(
        item.registro.servidor_id ??
        item.registro.id
      );

    return true;
  }

  return false;
}

function construirPayloadSubida(porTabla) {
  const payload = {};

  for (const [tablaLocal, claveBackend] of Object.entries(MAPEO_SUBIDA)) {
    if (porTabla[tablaLocal]) {
      payload[claveBackend] = porTabla[tablaLocal];
    }
  }

  return payload;
}

function construirMapeoInverso() {
  const inverso = {};

  for (const [tablaLocal, claveBackend] of Object.entries(MAPEO_SUBIDA)) {
    inverso[claveBackend] = tablaLocal;
  }

  return inverso;
}

function construirMapaIds(resultadoServidor) {
  const mapaIds = {};
  const inverso = construirMapeoInverso();

  for (const [claveModulo, datosModulo] of Object.entries(resultadoServidor)) {
    const tablaLocal = inverso[claveModulo] ?? claveModulo;
    const creados = datosModulo?.creados ?? [];

    for (const creado of creados) {
      if (creado.idLocal != null && creado.idServidor != null) {
        mapaIds[`${tablaLocal}_${creado.idLocal}`] = creado.idServidor;
      }
    }
  }

  return mapaIds;
}

async function marcarPendientesEnviadosComoSincronizados(
  pendientesEnviados,
  mapaIds
) {
  for (const item of pendientesEnviados) {
    const clave = `${item.tabla}_${item.registro.id}`;
    const servidorId = mapaIds[clave] ?? item.registro.servidor_id ?? null;

    await localApi.sync.marcarSincronizado(
      item.tabla,
      item.registro.id,
      servidorId
    );
  }
}

function obtenerMensajeErrorSubida(err) {
  const backendError = err?.response?.data?.error;
  const backendMessage = err?.response?.data?.message;

  if (backendError && backendMessage) {
    return `${backendMessage} \n\nDETALLE TECNICO: ${backendError}`;
  }

  if (backendMessage) {
    return backendMessage;
  }

  if (backendError) {
    return backendError;
  }

  if (err?.message) {
    return err.message;
  }

  return "Error al subir cambios.";
}

/*
============================================================
SERVICIO PRINCIPAL
============================================================
*/

export const configSyncService = {
  sincronizarCatalogos: async () => {
    try {
      await localApi.inicializar();

      const respuesta = await api.get("/sync/sincronizar");
      const data = respuesta?.data?.data;

      if (!data) {
        throw new Error("La respuesta del servidor no contiene datos.");
      }

      const meta = data._meta ?? {};
      const grupoDatos = meta.grupoDatos ?? null;

      await guardarGrupoDatosActivo(grupoDatos);

      const resultados = [];
      let totalGuardados = 0;
      const errores = [];

      for (const [campoCamel, tablaLocal] of Object.entries(MAPEO_DESCARGA)) {
        const registros = data[campoCamel] ?? [];

        const resultado = await guardarCatalogoLocal(
          tablaLocal,
          registros,
          grupoDatos
        );

        resultados.push(resultado);

        if (resultado.success) {
          totalGuardados += resultado.guardados ?? 0;
        } else {
          errores.push({
            tabla: tablaLocal,
            error: resultado.error,
          });
        }
      }

      return {
        success: true,
        totalGuardados,
        resultados,
        errores,
        fechaSync: meta.fechaSincronizacion ?? new Date().toISOString(),
        totales: meta.totales ?? {},
        fincasCount: data.fincas?.length ?? 0,
        estanquesCount: data.estanques?.length ?? 0,
        proveedoresCount: data.proveedores?.length ?? 0,
        productosCount: data.productos?.length ?? 0,
        compradoresCount: data.compradores?.length ?? 0,
        inventarioCount: data.inventario?.length ?? 0,
        equiposCount: data.equipos?.length ?? 0,
        tareasCount: data.tareas?.length ?? 0,
        usuariosCount: data.usuarios?.length ?? 0,
        laboratoriosCount: data.laboratorios?.length ?? 0,
        procedenciasCount: data.procedencias?.length ?? 0,
        proveedoresLarvaCount: data.proveedoresLarva?.length ?? 0,
        lotesLarvaCount: data.lotesLarva?.length ?? 0,
        precriasCount: data.precrias?.length ?? 0,
        siembrasCount: data.siembras?.length ?? 0,
        trazabilidadCount: data.trazabilidad?.length ?? 0,
        enfermedadesCount: data.enfermedades?.length ?? 0,
        parasitologiasCount: data.parasitologias?.length ?? 0,
        fisicoQuimicaCount: data.fisicoQuimica?.length ?? 0,
        detalleFisicoQuimicaCount:
          data.detalleFisicoQuimica?.length ?? 0,
        ventasCount: data.ventas?.length ?? 0,
        mantenimientosCount: data.mantenimientos?.length ?? 0,
        mantenimientoTareasCount: data.mantenimientoTareas?.length ?? 0,
        mantenimientoProductosCount: data.mantenimientoProductos?.length ?? 0,
      };
    } catch (err) {
      if (err?.response?.status === 401 || err?.status === 401) {
        const e = new Error(
          "Sesion no autorizada o expirada. Por favor inicie sesion de nuevo."
        );

        e.status = 401;
        throw e;
      }

      const mensaje =
        err?.response?.data?.message ||
        err?.message ||
        "Error general durante la sincronizacion.";

      throw new Error(mensaje);
    }
  },

  subirCambiosPendientes: async () => {
    try {
      await localApi.inicializar();

      const respuestaPendientes = await localApi.sync.obtenerPendientes();

      if (!respuestaPendientes.success) {
        throw new Error(
          respuestaPendientes.message ??
          "Error al obtener pendientes locales."
        );
      }

      const pendientes = respuestaPendientes.data ?? [];

      if (pendientes.length === 0) {
        return {
          success: true,
          message: "No hay registros pendientes de sincronizar.",
          subidos: 0,
        };
      }

      const porTabla = {};
      const pendientesEnviados = [];

      for (const item of pendientes) {
        const agregado =
          await agregarPendientePorTabla(
            porTabla,
            item
          );

        if (agregado) {
          pendientesEnviados.push(item);
        }
      }

      const payload = construirPayloadSubida(porTabla);

      if (Object.keys(payload).length === 0) {
        return {
          success: true,
          message: "No hay modulos operativos pendientes.",
          subidos: 0,
        };
      }

      const androidId = obtenerAndroidId();

      const respuestaServidor = await api.post(
        "/sync/sincronizar",
        {
          ...payload,
          androidId,
        },
        {
          headers: {
            "x-android-id": androidId,
          },
        }
      );

      const dataServidor = respuestaServidor?.data?.data;
      const resultadoServidor = dataServidor?.resultado ?? {};
      const mapaIds = construirMapaIds(resultadoServidor);

      await marcarPendientesEnviadosComoSincronizados(
        pendientesEnviados,
        mapaIds
      );

      return {
        success: true,
        subidos: pendientesEnviados.length,
        resultado: resultadoServidor,
        fechaSubida: new Date().toISOString(),
      };
    } catch (err) {
      if (err?.response?.status === 401 || err?.status === 401) {
        const e = new Error("Sesion no autorizada o expirada.");

        e.status = 401;
        throw e;
      }

      throw new Error(obtenerMensajeErrorSubida(err));
    }
  },

  sincronizarCompleto: async () => {
    const subida = await configSyncService.subirCambiosPendientes();
    const descarga = await configSyncService.sincronizarCatalogos();

    return {
      subida,
      descarga,
    };
  },
};

export default configSyncService;
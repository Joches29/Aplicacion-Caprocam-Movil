/**
 * configSync.service.js
 * Sincronización Nube -> Móvil y Móvil -> Nube
 */

import api from "../../../api/api";
import { localApi } from "../../../database/local/localApi.service";
import * as Application from 'expo-application';

// ─────────────────────────────────────────────────────────────
// CONVERSIÓN camelCase -> snake_case + normalización de tipos
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// NORMALIZACIÓN POR TABLA
// Corrige inconsistencias específicas del backend por tabla.
// ─────────────────────────────────────────────────────────────

/**
 * Aplica correcciones específicas por tabla después de la conversión snake_case.
 *
 * Problemas detectados en el backend:
 * - fincas:       "codigoCBO" → "codigo_c_b_o" (acrónimo mal convertido, schema espera "codigo_cbo")
 *                 No devuelve "grupo_datos"
 * - estanques:    "idFinca" → "id_finca" (schema espera "finca_id")
 * - colaboradores: No devuelve "pin_hash" (NOT NULL en schema, se usa placeholder)
 * - productos:    "entryDate"/"expirationDate" en lugar de "fecha_ingreso"/"fecha_caducidad"
 * - inventario, laboratorios, procedencias, proveedores_larva: No devuelven "grupo_datos"
 */
const normalizarPorTabla = (tabla, registro, grupoDatos) => {
  const r = { ...registro };

  // ── Inyectar grupo_datos si el backend no lo incluye ──────
  if (grupoDatos != null && r.grupo_datos == null) {
    r.grupo_datos = grupoDatos;
  }

  switch (tabla) {
    case "fincas":
      if (r.codigo_c_b_o !== undefined) {
        r.codigo_cbo = r.codigo_c_b_o;
        delete r.codigo_c_b_o;
      }
      break;

    case "estanques":
      if (r.id_finca !== undefined) {
        r.finca_id = r.id_finca;
        delete r.id_finca;
      }
      break;

    case "colaboradores":
      if (!r.pin_hash) {
        r.pin_hash = "__SYNC_PLACEHOLDER__";
      }
      break;

    case "productos":
      if (r.entry_date !== undefined) {
        r.fecha_ingreso = r.entry_date;
        delete r.entry_date;
      }
      if (r.expiration_date !== undefined) {
        r.fecha_caducidad = r.expiration_date;
        delete r.expiration_date;
      }
      break;
  }

  return r;
};

// ─────────────────────────────────────────────────────────────
// MAPEOS: campo camelCase del backend -> nombre de tabla local
// ─────────────────────────────────────────────────────────────

const MAPEO_DESCARGA = {
  fincas:           "fincas",
  estanques:        "estanques",
  proveedores:      "proveedores",
  productos:        "productos",
  compradores:      "compradores",
  inventario:       "inventario",
  equipos:          "equipos",
  tareas:           "tareas",
  colaboradores:    "colaboradores",
  laboratorios:     "laboratorios",
  procedencias:     "procedencias",
  proveedoresLarva: "proveedores_larva",
  lotesLarva:       "lotes_larva",
  precrias:         "precrias",
  siembras:         "siembras",
};

// ─────────────────────────────────────────────────────────────
// FUNCIÓN AUXILIAR
// ─────────────────────────────────────────────────────────────

async function guardarCatalogoLocal(tabla, registros, grupoDatos) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return { tabla, total: 0, guardados: 0, success: true };
  }

  const registrosNorm = registros.map((r) => {
    const snake = convertirRegistroASnake(r);
    return normalizarPorTabla(tabla, snake, grupoDatos);
  });

  const resultado = await localApi.sync.guardarDesdeServidor(tabla, registrosNorm);

  if (!resultado.success) {
    console.warn(`[Sync] Falló guardar tabla "${tabla}":`, resultado.error ?? resultado.message);
    return { tabla, total: registros.length, guardados: 0, success: false, error: resultado.message };
  }

  console.log(`[Sync] ✓ Tabla "${tabla}" → ${registros.length} registros guardados`);
  return { tabla, total: registros.length, guardados: registros.length, success: true, resultado };
}

// ─────────────────────────────────────────────────────────────
// SERVICIO PRINCIPAL
// ─────────────────────────────────────────────────────────────

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

      const resultados = [];
      let totalGuardados = 0;
      const errores = [];

      for (const [campoCamel, tablaLocal] of Object.entries(MAPEO_DESCARGA)) {
        const registros = data[campoCamel] ?? [];
        const res = await guardarCatalogoLocal(tablaLocal, registros, grupoDatos);
        resultados.push(res);
        if (res.success) {
          totalGuardados += res.guardados ?? 0;
        } else {
          errores.push({ tabla: tablaLocal, error: res.error });
        }
      }

      return {
        success: true,
        totalGuardados,
        resultados,
        errores,
        fechaSync: meta.fechaSincronizacion ?? new Date().toISOString(),
        totales: meta.totales ?? {},
        fincasCount:           data.fincas?.length           ?? 0,
        estanquesCount:        data.estanques?.length         ?? 0,
        proveedoresCount:      data.proveedores?.length       ?? 0,
        productosCount:        data.productos?.length         ?? 0,
        compradoresCount:      data.compradores?.length       ?? 0,
        inventarioCount:       data.inventario?.length        ?? 0,
        equiposCount:          data.equipos?.length           ?? 0,
        tareasCount:           data.tareas?.length            ?? 0,
        colaboradoresCount:    data.colaboradores?.length     ?? 0,
        laboratoriosCount:     data.laboratorios?.length      ?? 0,
        procedenciasCount:     data.procedencias?.length      ?? 0,
        proveedoresLarvaCount: data.proveedoresLarva?.length  ?? 0,
        lotesLarvaCount:       data.lotesLarva?.length        ?? 0,
        precriasCount:         data.precrias?.length          ?? 0,
        siembrasCount:         data.siembras?.length          ?? 0,
      };
    } catch (err) {
      if (err?.response?.status === 401 || err?.status === 401) {
        const e = new Error("Sesión no autorizada o expirada. Por favor inicie sesión de nuevo.");
        e.status = 401;
        throw e;
      }
      const mensaje = err?.response?.data?.message || err?.message || "Error general durante la sincronización.";
      throw new Error(mensaje);
    }
  },

  subirCambiosPendientes: async () => {
    try {
      await localApi.inicializar();

      const respuestaPendientes = await localApi.sync.obtenerPendientes();

      if (!respuestaPendientes.success) {
        throw new Error(respuestaPendientes.message ?? "Error al obtener pendientes locales.");
      }

      const pendientes = respuestaPendientes.data ?? [];

      if (pendientes.length === 0) {
        return { success: true, message: "No hay registros pendientes de sincronizar.", subidos: 0 };
      }

      const porTabla = {};
      for (const item of pendientes) {
        if (!porTabla[item.tabla]) porTabla[item.tabla] = { crear: [], actualizar: [], eliminar: [] };
        let accion = (item.accion ?? "").toUpperCase();
        
        const servId = item.registro.servidor_id ?? item.registro.servidorId;
        if (accion === "UPDATE" && (!servId || servId === "null" || 
          servId === "undefined" || servId === "")) {
            accion = "CREATE";
        }

        if (accion === "CREATE") porTabla[item.tabla].crear.push(item.registro);
        else if (accion === "UPDATE") porTabla[item.tabla].actualizar.push(item.registro);
        else if (accion === "DELETE") porTabla[item.tabla].eliminar.push(item.registro.servidor_id ?? item.registro.id);
      }

      const MAPEO_SUBIDA = {
        alimentaciones:                 "alimentacion",
        crecimientos:                   "crecimiento",
        calculos_crecimiento:           "calculosCrecimiento",
        fisico_quimico:                 "fisicoQuimica",
        fisico_quimico_detalle:         "detalleFisicoQuimica",
        densidad_poblacional:           "densidadPoblacional",
        densidad_detalle_tiros:         "detalleTirosDensidad",
        enfermedades:                   "enfermedades",
        parasitologias:                 "parasitologias",
        raleos:                         "raleos",
        ventas:                         "ventas",
        trazabilidad:                   "trazabilidad",
        movimientos_inventario:         "movimientosInventario",
        mantenimiento_equipo:           "mantenimientos",
        mantenimiento_equipo_tareas:    "tareasMantenimiento",
        mantenimiento_equipo_productos: "productosMantenimiento",
      };

      const payload = {};
      for (const [tablaLocal, claveBE] of Object.entries(MAPEO_SUBIDA)) {
        if (porTabla[tablaLocal]) {
          payload[claveBE] = porTabla[tablaLocal];
        }
      }

      if (Object.keys(payload).length === 0) {
        return { success: true, message: "No hay módulos operativos pendientes.", subidos: 0 };
      }

      const androidId = Application.getAndroidId() ?? 'desconocido';

      const respuestaServidor = await api.post("/sync/sincronizar", {
        ...payload,
        androidId,
      }, {
        headers: {
          'x-android-id': androidId
        }
      });
      const dataServidor = respuestaServidor?.data?.data;
      const resultadoServidor = dataServidor?.resultado ?? {};

      const mapaIds = {};
      const MAPEO_INVERSO = {};
      for (const [tablaLocal, claveBE] of Object.entries(MAPEO_SUBIDA)) {
        MAPEO_INVERSO[claveBE] = tablaLocal;
      }
      for (const [claveModulo, datosModulo] of Object.entries(resultadoServidor)) {
        const tablaLocal = MAPEO_INVERSO[claveModulo] ?? claveModulo;
        const creados = datosModulo?.creados ?? [];
        for (const c of creados) {
          if (c.idLocal != null && c.idServidor != null) {
            mapaIds[`${tablaLocal}_${c.idLocal}`] = c.idServidor;
          }
        }
      }

      for (const item of pendientes) {
        try {
          const clave = `${item.tabla}_${item.registro.id}`;
          const servidorId = mapaIds[clave] ?? item.registro.servidor_id ?? null;
          await localApi.sync.marcarSincronizado(item.tabla, item.registro.id, servidorId);
        } catch (_) {}
      }

      return {
        success: true,
        subidos: pendientes.length,
        resultado: dataServidor?.resultado ?? {},
        fechaSubida: new Date().toISOString(),
      };
    } catch (err) {
      if (err?.response?.status === 401 || err?.status === 401) {
        const e = new Error("Sesión no autorizada o expirada.");
        e.status = 401;
        throw e;
      }
      
      // LOGICA NUEVA PARA EXTRAER EL ERROR REAL DE MYSQL
      const backendError = err?.response?.data?.error;
      const backendMessage = err?.response?.data?.message;
      
      console.error("[Sync Subida] Error completo del servidor:", err?.response?.data);

      let mensaje = "Error al subir cambios.";
      
      if (backendError && backendMessage) {
         mensaje = `${backendMessage} \n\nDETALLE TÉCNICO: ${backendError}`;
      } else if (backendMessage) {
         mensaje = backendMessage;
      } else if (backendError) {
         mensaje = backendError;
      } else if (err?.message) {
         mensaje = err.message;
      }

      throw new Error(mensaje);
    }
  },

  sincronizarCompleto: async () => {
    const subida = await configSyncService.subirCambiosPendientes();
    const descarga = await configSyncService.sincronizarCatalogos();
    return { subida, descarga };
  },
};

export default configSyncService;
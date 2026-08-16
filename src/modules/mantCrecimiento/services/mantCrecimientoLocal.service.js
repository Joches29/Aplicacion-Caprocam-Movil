/**
 * ============================================================
 * SERVICE LOCAL DE CRECIMIENTOS (SQLite)
 * ============================================================
 * Incluye muestreos (tabla calculos_crecimiento).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { localApi } from "../../../database/local/localApi.service";

const STORAGE_COLABORADOR_ACTUAL = "caprocam_colaborador_actual";
const STORAGE_GRUPO_DATOS = "caprocam_grupo_datos";

const METODOS_LOCAL_API = {
  obtenerTodos: ["obtenerTodos", "getAll", "listar"],
  obtenerPorId: ["obtenerPorId", "getById", "buscarPorId"],
  crear: ["crear", "create"],
  actualizar: ["actualizar", "update"],
  eliminar: ["eliminar", "deleteById", "remove"],
};

const obtenerDataRespuesta = (respuesta) =>
  respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

const convertirNumero = (valor, valorDefecto = 0) => {
  const numero = Number(valor);
  return Number.isNaN(numero) ? valorDefecto : numero;
};

const convertirTexto = (valor, valorDefecto = "") =>
  valor === undefined || valor === null ? valorDefecto : String(valor);

function obtenerValor(objeto, llaves, valorDefecto = null) {
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
}

async function obtenerJsonStorage(llave) {
  try {
    const raw = await AsyncStorage.getItem(llave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function obtenerContextoLocal() {
  const colaborador = await obtenerJsonStorage(STORAGE_COLABORADOR_ACTUAL);
  const grupoStorage = await obtenerJsonStorage(STORAGE_GRUPO_DATOS);
  const grupoColaborador = obtenerValor(
    colaborador,
    ["grupoDatos", "grupo_datos"],
    null,
  );
  const grupoDatos =
    grupoColaborador ??
    obtenerValor(grupoStorage, ["id", "grupoDatos", "grupo_datos"], 1);
  const colaboradorId = obtenerValor(
    colaborador,
    ["id", "colaboradorId", "colaborador_id"],
    null,
  );
  return {
    grupoDatos: convertirNumero(grupoDatos, 1),
    colaboradorId,
  };
}

async function ejecutarMetodoCrecimientos(tipoMetodo, argumentos = []) {
  const apiCrecimientos = localApi.crecimientos;
  if (!apiCrecimientos) {
    throw new Error("localApi.crecimientos no está disponible.");
  }
  const nombres = METODOS_LOCAL_API[tipoMetodo] || [];
  for (let i = 0; i < nombres.length; i += 1) {
    const nombreMetodo = nombres[i];
    if (typeof apiCrecimientos[nombreMetodo] === "function") {
      return await apiCrecimientos[nombreMetodo](...argumentos);
    }
  }
  throw new Error(`No existe método local para crecimientos: ${tipoMetodo}`);
}

async function ejecutarMetodoCalculos(tipoMetodo, argumentos = []) {
  const apiCalculos = localApi.calculosCrecimiento;
  if (!apiCalculos) {
    throw new Error("localApi.calculosCrecimiento no está disponible.");
  }
  const nombres = METODOS_LOCAL_API[tipoMetodo] || [];
  for (let i = 0; i < nombres.length; i += 1) {
    const nombreMetodo = nombres[i];
    if (typeof apiCalculos[nombreMetodo] === "function") {
      return await apiCalculos[nombreMetodo](...argumentos);
    }
  }
  throw new Error(`No existe método local para calculos_crecimiento: ${tipoMetodo}`);
}

function mapearMuestreoDesdeLocal(registro) {
  if (!registro) return null;
  return {
    id: obtenerValor(registro, ["id"], null),
    cantidad: convertirNumero(
      obtenerValor(registro, ["cantidad_individuos", "cantidadIndividuos", "cantidad"], 0),
    ),
    pesoTotal: convertirNumero(
      obtenerValor(registro, ["peso_total", "pesoTotal"], 0),
    ),
    pesoPromedio: convertirNumero(
      obtenerValor(registro, [
        "peso_promedio_individual",
        "pesoPromedioIndividual",
        "pesoPromedio",
        "peso_promedio",
      ], 0),
    ),
    orden: convertirNumero(obtenerValor(registro, ["orden"], 0), 0),
  };
}

async function obtenerMuestreosPorCrecimiento(crecimientoId) {
  if (crecimientoId == null) return [];
  try {
    const respuesta = await ejecutarMetodoCalculos("obtenerTodos");
    const data = obtenerDataRespuesta(respuesta);
    const lista = Array.isArray(data) ? data : [];
    return lista
      .filter(
        (item) =>
          Number(
            obtenerValor(item, ["crecimiento_id", "crecimientoId"], 0),
          ) === Number(crecimientoId),
      )
      .map(mapearMuestreoDesdeLocal)
      .filter(Boolean);
  } catch (e) {
    console.warn("No se pudieron cargar muestreos locales:", e);
    return [];
  }
}

function mapearCrecimientoDesdeLocal(registro) {
  return registro
    ? {
        id: obtenerValor(registro, ["id"], null),
        servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
        uuid: obtenerValor(registro, ["uuid"], ""),
        grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),
        finca: obtenerValor(registro, ["finca_id", "fincaId", "finca"], null),
        estanque: obtenerValor(
          registro,
          ["estanque_id", "estanqueId", "estanque"],
          null,
        ),
        colaborador: obtenerValor(
          registro,
          ["colaborador_id", "colaboradorId", "colaborador"],
          null,
        ),
        pesoActual: obtenerValor(registro, ["peso_actual", "pesoActual"], 0),
        fechaRegistro: obtenerValor(
          registro,
          ["fecha_registro", "fechaRegistro", "fecha"],
          "",
        ),
        activo: obtenerValor(registro, ["activo"], 1),
        sincronizado: obtenerValor(registro, ["sincronizado"], 0),
        pendienteSync: obtenerValor(
          registro,
          ["pendiente_sync", "pendienteSync"],
          1,
        ),
        accionSync: obtenerValor(registro, ["accion_sync", "accionSync"], null),
        fechaSync: obtenerValor(registro, ["fecha_sync", "fechaSync"], null),
        fechaCreacion: obtenerValor(
          registro,
          ["fecha_creacion", "fechaCreacion"],
          null,
        ),
        fechaActualizacion: obtenerValor(
          registro,
          ["fecha_actualizacion", "fechaActualizacion"],
          null,
        ),
        muestreos: [],
      }
    : null;
}

async function mapearCrecimientoParaLocal(crecimientoDTO) {
  const contexto = await obtenerContextoLocal();
  const grupoDatos = obtenerValor(
    crecimientoDTO,
    ["grupoDatos", "grupo_datos"],
    contexto.grupoDatos,
  );
  const fincaId = obtenerValor(
    crecimientoDTO,
    ["finca", "fincaId", "finca_id"],
    null,
  );
  const estanqueId = obtenerValor(
    crecimientoDTO,
    ["estanque", "estanqueId", "estanque_id"],
    null,
  );
  const colaboradorId = obtenerValor(
    crecimientoDTO,
    ["colaborador", "colaboradorId", "colaborador_id"],
    contexto.colaboradorId,
  );
  const pesoActual = obtenerValor(
    crecimientoDTO,
    ["pesoActual", "peso_actual"],
    0,
  );
  const fechaRegistro = obtenerValor(
    crecimientoDTO,
    ["fechaRegistro", "fecha_registro", "fecha"],
    "",
  );

  return {
    grupo_datos: convertirNumero(grupoDatos, contexto.grupoDatos),
    finca_id: convertirNumero(fincaId, null),
    estanque_id: convertirNumero(estanqueId, null),
    colaborador_id: colaboradorId ? convertirNumero(colaboradorId, null) : null,
    peso_actual: Number(pesoActual),
    fecha_registro: convertirTexto(fechaRegistro),
    creado_por_colaborador_id: contexto.colaboradorId,
  };
}

async function guardarMuestreos(crecimientoId, muestreos = [], contexto, existentes = []) {
  const lista = Array.isArray(muestreos) ? muestreos : [];
  
  const idsEntrantes = lista
    .map(m => m.id)
    .filter(id => id != null && Number(id) < 1000)
    .map(Number);

  for (const ext of existentes) {
    if (ext?.id != null && !idsEntrantes.includes(Number(ext.id))) {
      try {
        await ejecutarMetodoCalculos("eliminar", [ext.id]);
      } catch (e) {
        console.warn("No se pudo eliminar cálculo local", ext.id, e);
      }
    }
  }

  // Crear o actualizar
  for (let i = 0; i < lista.length; i += 1) {
    const m = lista[i];
    const cantidad = convertirNumero(m.cantidad ?? m.cantidadIndividuos, 0);
    const pesoTotal = convertirNumero(m.pesoTotal ?? m.peso_total, 0);
    const pesoPromedio = convertirNumero(
      m.pesoPromedio ?? m.peso_promedio ?? (cantidad > 0 ? pesoTotal / cantidad : 0),
      0,
    );

    const payloadCalculo = {
      grupo_datos: contexto.grupoDatos,
      crecimiento_id: Number(crecimientoId),
      cantidad_individuos: cantidad,
      peso_total: pesoTotal,
      peso_promedio_individual: Number(pesoPromedio.toFixed(2)),
      creado_por_colaborador_id: contexto.colaboradorId,
    };

    if (m.id != null && Number(m.id) < 1000) {
      await ejecutarMetodoCalculos("actualizar", [Number(m.id), payloadCalculo]);
    } else {
      await ejecutarMetodoCalculos("crear", [payloadCalculo]);
    }
  }
}

async function eliminarMuestreosDeCrecimiento(crecimientoId) {
  const existentes = await obtenerMuestreosPorCrecimiento(crecimientoId);
  for (const m of existentes) {
    if (m?.id != null) {
      try {
        await ejecutarMetodoCalculos("eliminar", [m.id]);
      } catch (e) {
        console.warn("No se pudo eliminar cálculo local", m.id, e);
      }
    }
  }
}

async function enriquecerConMuestreos(registro) {
  if (!registro) return null;
  const muestreos = await obtenerMuestreosPorCrecimiento(registro.id);
  return { ...registro, muestreos };
}

async function getAll(filtros = {}) {
  try {
    if (typeof localApi.inicializar === "function") {
      await localApi.inicializar();
    }
    const respuesta = await ejecutarMetodoCrecimientos("obtenerTodos");
    const data = obtenerDataRespuesta(respuesta);
    const registros = Array.isArray(data) ? data : [];
    const mapeados = registros
      .map(mapearCrecimientoDesdeLocal)
      .filter(Boolean)
      .filter((item) => {
        const coincideFinca = filtros.finca
          ? Number(item.finca) === Number(filtros.finca)
          : true;
        const coincideEstanque = filtros.estanque
          ? Number(item.estanque) === Number(filtros.estanque)
          : true;
        return coincideFinca && coincideEstanque;
      });

    return Promise.all(mapeados.map(enriquecerConMuestreos));
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function getById(id) {
  try {
    if (typeof localApi.inicializar === "function") {
      await localApi.inicializar();
    }
    const respuesta = await ejecutarMetodoCrecimientos("obtenerPorId", [id]);
    const registro = mapearCrecimientoDesdeLocal(obtenerDataRespuesta(respuesta));
    return enriquecerConMuestreos(registro);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function create(crecimientoDTO) {
  try {
    if (typeof localApi.inicializar === "function") {
      await localApi.inicializar();
    }
    const contexto = await obtenerContextoLocal();
    const datosLocales = await mapearCrecimientoParaLocal(crecimientoDTO);
    const respuesta = await ejecutarMetodoCrecimientos("crear", [datosLocales]);
    const creado = mapearCrecimientoDesdeLocal(obtenerDataRespuesta(respuesta));
    const muestreos = crecimientoDTO?.muestreos ?? [];
    if (creado?.id != null && muestreos.length) {
      await guardarMuestreos(creado.id, muestreos, contexto);
    }
    return enriquecerConMuestreos(creado);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function update(id, crecimientoDTO) {
  try {
    if (typeof localApi.inicializar === "function") {
      await localApi.inicializar();
    }
    const contexto = await obtenerContextoLocal();
    const datosLocales = await mapearCrecimientoParaLocal(crecimientoDTO);
    const respuesta = await ejecutarMetodoCrecimientos("actualizar", [
      id,
      datosLocales,
    ]);
    const actualizado = mapearCrecimientoDesdeLocal(
      obtenerDataRespuesta(respuesta),
    );
    const muestreos = crecimientoDTO?.muestreos ?? [];
    const existentes = await obtenerMuestreosPorCrecimiento(id);

    await guardarMuestreos(id, muestreos, contexto, existentes);
    
    return enriquecerConMuestreos(actualizado ?? { id });
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function deleteById(id) {
  try {
    if (typeof localApi.inicializar === "function") {
      await localApi.inicializar();
    }
    await eliminarMuestreosDeCrecimiento(id);
    const respuesta = await ejecutarMetodoCrecimientos("eliminar", [id]);
    return mapearCrecimientoDesdeLocal(obtenerDataRespuesta(respuesta));
  } catch (error) {
    console.error(error);
    throw error;
  }
}

const CrecimientosLocalService = {
  getAll,
  getById,
  create,
  update,
  deleteById,
};

export default CrecimientosLocalService;

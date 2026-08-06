/**
 * ============================================================
 * SERVICE LOCAL DE PARASITOLOGIA
 * ============================================================
 *
 * Centraliza las operaciones locales del modulo de parasitologia
 * usando SQLite.
 *
 * Mantiene una API similar al service HTTP para que los hooks
 * puedan trabajar con datos locales sin cambiar la pantalla.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { localApi } from "../../../database/local/localApi.service";

/*
============================================================
CONSTANTES
============================================================
*/

const STORAGE_COLABORADOR_ACTUAL = "caprocam_colaborador_actual";
const STORAGE_GRUPO_DATOS = "caprocam_grupo_datos";

const CATALOGO_PARASITOS = [
  "gregarina",
  "nematodo",
  "epicomensal",
  "protozoario",
  "otro",
];

const METODOS_LOCAL_API = {
  obtenerTodos: ["obtenerTodos", "getAll", "listar"],
  obtenerPorId: ["obtenerPorId", "getById", "buscarPorId"],
  crear: ["crear", "create"],
  actualizar: ["actualizar", "update"],
  eliminar: ["eliminar", "deleteById", "remove"],
};

/*
============================================================
HELPERS GENERALES
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

const convertirTexto = (valor, valorDefecto = "") =>
  valor === undefined || valor === null ? valorDefecto : String(valor);

const extraerError = (error) =>
  error?.message ? error.message : "Error desconocido";

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
    const valor = await AsyncStorage.getItem(llave);

    return valor ? JSON.parse(valor) : null;
  } catch (error) {
    console.error("Error al leer storage local", error);
    return null;
  }
}

async function obtenerContextoLocal() {
  const colaborador = await obtenerJsonStorage(STORAGE_COLABORADOR_ACTUAL);
  const grupoStorage = await AsyncStorage.getItem(STORAGE_GRUPO_DATOS);

  const grupoColaborador = obtenerValor(
    colaborador,
    ["grupoDatos", "grupo_datos"],
    null
  );

  const grupoDatos = grupoColaborador || grupoStorage || 1;

  const colaboradorId = obtenerValor(
    colaborador,
    ["id", "colaboradorId"],
    null
  );

  const nombre = obtenerValor(colaborador, ["nombre"], "");
  const apellidos = obtenerValor(colaborador, ["apellidos"], "");
  const responsable = `${nombre} ${apellidos}`.trim();

  return {
    grupoDatos: convertirNumero(grupoDatos, 1),
    colaboradorId,
    responsable,
  };
}

async function ejecutarMetodoParasitologias(tipoMetodo, argumentos = []) {
  const apiParasitologias = localApi.parasitologias;

  if (!apiParasitologias) {
    throw new Error("localApi.parasitologias no esta disponible.");
  }

  const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

  for (let i = 0; i < nombres.length; i += 1) {
    const nombreMetodo = nombres[i];

    if (typeof apiParasitologias[nombreMetodo] === "function") {
      return await apiParasitologias[nombreMetodo](...argumentos);
    }
  }

  throw new Error(`No existe metodo local para parasitologias: ${tipoMetodo}`);
}

/*
============================================================
CALCULOS
============================================================
*/

const calcularPorcentajeInfeccion = (muestreados, infectados) => {
  const totalMuestreados = convertirNumero(muestreados, 0);
  const totalInfectados = convertirNumero(infectados, 0);

  return totalMuestreados > 0
    ? Number(((totalInfectados / totalMuestreados) * 100).toFixed(2))
    : 0;
};

const calcularGradoInfeccion = (porcentaje) =>
  porcentaje >= 60 ? "alto" : porcentaje >= 30 ? "medio" : "bajo";

/*
============================================================
MAPEADORES
============================================================
*/

function mapearParasitologiaDesdeLocal(registro) {
  return registro
    ? {
        id: obtenerValor(registro, ["id"], null),
        servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
        uuid: obtenerValor(registro, ["uuid"], ""),
        grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

        fincaId: obtenerValor(registro, ["finca_id", "fincaId"], null),
        estanqueId: obtenerValor(registro, ["estanque_id", "estanqueId"], null),

        creadoPorUsuarioId: obtenerValor(
          registro,
          ["creado_por_usuario_id", "creadoPorUsuarioId"],
          null
        ),

        creadoPorColaboradorId: obtenerValor(
          registro,
          ["creado_por_colaborador_id", "creadoPorColaboradorId"],
          null
        ),

        tipoRegistro: obtenerValor(registro, ["tipo_registro", "tipoRegistro"], ""),
        fechaReporte: obtenerValor(registro, ["fecha_reporte", "fechaReporte", "fecha"], ""),
        responsable: obtenerValor(registro, ["responsable"], ""),

        parasito: obtenerValor(registro, ["parasito"], ""),
        camaronesMuestreados: obtenerValor(
          registro,
          ["camarones_muestreados", "camaronesMuestreados"],
          0
        ),
        camaronesInfectados: obtenerValor(
          registro,
          ["camarones_infectados", "camaronesInfectados"],
          0
        ),
        porcentajeInfeccion: obtenerValor(
          registro,
          ["porcentaje_infeccion", "porcentajeInfeccion"],
          0
        ),
        gradoInfeccion: obtenerValor(
          registro,
          ["grado_infeccion", "gradoInfeccion"],
          "bajo"
        ),
        observaciones: obtenerValor(registro, ["observaciones"], ""),

        activo: obtenerValor(registro, ["activo"], 1),
        sincronizado: obtenerValor(registro, ["sincronizado"], 0),
        pendienteSync: obtenerValor(registro, ["pendiente_sync", "pendienteSync"], 1),
        accionSync: obtenerValor(registro, ["accion_sync", "accionSync"], null),
        fechaSync: obtenerValor(registro, ["fecha_sync", "fechaSync"], null),

        fechaCreacion: obtenerValor(registro, ["fecha_creacion", "fechaCreacion"], null),
        fechaActualizacion: obtenerValor(
          registro,
          ["fecha_actualizacion", "fechaActualizacion"],
          null
        ),
      }
    : null;
}

async function mapearParasitologiaParaLocal(parasitologiaDTO) {
  const contexto = await obtenerContextoLocal();

  const fincaId = obtenerValor(
    parasitologiaDTO,
    ["fincaId", "finca_id", "idFinca"],
    null
  );

  const estanqueId = obtenerValor(
    parasitologiaDTO,
    ["estanqueId", "estanque_id", "idEstanque"],
    null
  );

  const fechaReporte = obtenerValor(
    parasitologiaDTO,
    ["fechaReporte", "fecha_reporte", "fecha"],
    ""
  );

  const muestreados = obtenerValor(
    parasitologiaDTO,
    ["camaronesMuestreados", "camarones_muestreados"],
    0
  );

  const infectados = obtenerValor(
    parasitologiaDTO,
    ["camaronesInfectados", "camarones_infectados"],
    0
  );

  const porcentajeInfeccion = calcularPorcentajeInfeccion(
    muestreados,
    infectados
  );

  const gradoInfeccion = calcularGradoInfeccion(porcentajeInfeccion);

  const responsable = obtenerValor(
    parasitologiaDTO,
    ["responsable"],
    contexto.responsable
  );

  const creadoPorColaboradorId = obtenerValor(
    parasitologiaDTO,
    ["creadoPorColaboradorId", "creado_por_colaborador_id"],
    contexto.colaboradorId
  );

  const creadoPorUsuarioId = obtenerValor(
    parasitologiaDTO,
    ["creadoPorUsuarioId", "creado_por_usuario_id"],
    null
  );

  return {
    grupo_datos: convertirNumero(
      obtenerValor(parasitologiaDTO, ["grupoDatos", "grupo_datos"], contexto.grupoDatos),
      contexto.grupoDatos
    ),
    finca_id: convertirNumero(fincaId, null),
    estanque_id: convertirNumero(estanqueId, null),
    tipo_registro: convertirTexto(parasitologiaDTO.tipoRegistro, "parasitologia"),
    fecha_reporte: convertirTexto(fechaReporte),
    responsable: convertirTexto(responsable),
    parasito: convertirTexto(parasitologiaDTO.parasito),
    camarones_muestreados: convertirNumero(muestreados, 0),
    camarones_infectados: convertirNumero(infectados, 0),
    porcentaje_infeccion: porcentajeInfeccion,
    grado_infeccion: gradoInfeccion,
    observaciones: parasitologiaDTO.observaciones
      ? convertirTexto(parasitologiaDTO.observaciones).trim()
      : null,
    creado_por_usuario_id: creadoPorUsuarioId,
    creado_por_colaborador_id: creadoPorColaboradorId,
  };
}

/*
============================================================
FILTROS Y RESUMEN
============================================================
*/

function aplicarFiltros(registros, filtros = {}) {
  const fincaId = obtenerValor(filtros, ["fincaId", "finca_id"], null);
  const estanqueId = obtenerValor(filtros, ["estanqueId", "estanque_id"], null);
  const parasito = obtenerValor(filtros, ["parasito"], null);
  const fechaReporte = obtenerValor(filtros, ["fechaReporte", "fecha_reporte"], null);

  return registros.filter((item) => {
    const coincideFinca = fincaId ? Number(item.fincaId) === Number(fincaId) : true;
    const coincideEstanque = estanqueId ? Number(item.estanqueId) === Number(estanqueId) : true;
    const coincideParasito = parasito ? String(item.parasito) === String(parasito) : true;
    const coincideFecha = fechaReporte ? String(item.fechaReporte).slice(0, 10) === String(fechaReporte).slice(0, 10) : true;

    return coincideFinca && coincideEstanque && coincideParasito && coincideFecha;
  });
}

function contarFrecuencias(registros, campo) {
  const acumulado = registros.reduce((total, item) => {
    const valor = item[campo];

    if (!valor) return total;

    total[valor] = total[valor] ? total[valor] + 1 : 1;

    return total;
  }, {});

  return Object.keys(acumulado)
    .map((nombre) => ({
      nombre,
      total: acumulado[nombre],
    }))
    .sort((a, b) => b.total - a.total);
}

/*
============================================================
OPERACIONES LOCALES
============================================================
*/

async function getAll(filtros = {}) {
  try {
    const respuesta = await ejecutarMetodoParasitologias("obtenerTodos");
    const data = obtenerDataRespuesta(respuesta);
    const registros = Array.isArray(data) ? data : [];

    return aplicarFiltros(
      registros.map(mapearParasitologiaDesdeLocal).filter(Boolean),
      filtros
    );
  } catch (error) {
    console.error("Error al obtener parasitologias locales", extraerError(error));
    throw error;
  }
}

async function getById(id) {
  try {
    const respuesta = await ejecutarMetodoParasitologias("obtenerPorId", [id]);

    return mapearParasitologiaDesdeLocal(obtenerDataRespuesta(respuesta));
  } catch (error) {
    console.error("Error al obtener la parasitologia local", extraerError(error));
    throw error;
  }
}

async function create(parasitologiaDTO) {
  try {
    const datosLocales = await mapearParasitologiaParaLocal(parasitologiaDTO);
    const respuesta = await ejecutarMetodoParasitologias("crear", [datosLocales]);

    return mapearParasitologiaDesdeLocal(obtenerDataRespuesta(respuesta));
  } catch (error) {
    console.error("Error al crear la parasitologia local", extraerError(error));
    throw error;
  }
}

async function update(id, parasitologiaDTO) {
  try {
    const datosLocales = await mapearParasitologiaParaLocal(parasitologiaDTO);
    const respuesta = await ejecutarMetodoParasitologias("actualizar", [
      id,
      datosLocales,
    ]);

    return mapearParasitologiaDesdeLocal(obtenerDataRespuesta(respuesta));
  } catch (error) {
    console.error("Error al actualizar la parasitologia local", extraerError(error));
    throw error;
  }
}

async function deleteById(id) {
  try {
    const respuesta = await ejecutarMetodoParasitologias("eliminar", [id]);

    return mapearParasitologiaDesdeLocal(obtenerDataRespuesta(respuesta));
  } catch (error) {
    console.error("Error al eliminar la parasitologia local", extraerError(error));
    throw error;
  }
}

async function getResumenDashboard(filtros = {}) {
  try {
    const registros = await getAll(filtros);

    const totalMuestreados = registros.reduce(
      (total, item) => total + convertirNumero(item.camaronesMuestreados, 0),
      0
    );

    const totalInfectados = registros.reduce(
      (total, item) => total + convertirNumero(item.camaronesInfectados, 0),
      0
    );

    const promedioInfeccion = registros.length > 0
      ? Number(
          (
            registros.reduce(
              (total, item) => total + convertirNumero(item.porcentajeInfeccion, 0),
              0
            ) / registros.length
          ).toFixed(2)
        )
      : 0;

    return {
      totalRegistros: registros.length,
      totalMuestreados,
      totalInfectados,
      totalCamaronesMuestreados: totalMuestreados,
      totalCamaronesInfectados: totalInfectados,
      porcentajePromedio: promedioInfeccion,
      promedioInfeccion,
      gradoPromedio: promedioInfeccion,
      parasitosFrecuentes: contarFrecuencias(registros, "parasito"),
      gradosFrecuentes: contarFrecuencias(registros, "gradoInfeccion"),
    };
  } catch (error) {
    console.error(
      "Error al obtener el resumen local de parasitologias",
      extraerError(error)
    );
    throw error;
  }
}

async function getCatalogo() {
  return CATALOGO_PARASITOS;
}

/*
============================================================
EXPORT
============================================================
*/

const ParasitologiaLocalService = {
  getAll,
  getById,
  create,
  update,
  deleteById,
  getResumenDashboard,
  getCatalogo,
};

export default ParasitologiaLocalService;
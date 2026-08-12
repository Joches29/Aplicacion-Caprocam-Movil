/**
 * ============================================================
 * SERVICE LOCAL DE REPORTERÍA
 * ============================================================
 *
 * Centraliza las operaciones de lectura y eliminación local
 * del módulo de reportería usando SQLite (localApi).
 *
 */

import { localApi } from "../../../database/local/localApi.service";
import {
  getLecturasLocal,
  eliminarLecturaLocal,
} from "../../mantAgua/services/FisicoQuimicaLocalService";

/*
============================================================
MAPEO TIPO DE REGISTRO -> SECCIÓN localApi
============================================================
*/

const SECCION_POR_TIPO = {
  crecimiento: "crecimientos",
  parasitologia: "parasitologias",
  enfermedades: "enfermedades",
  raleo: "raleos",
  alimentacion: "alimentaciones",
  densidad_poblacional: "densidadPoblacional",
};

/*
============================================================
HELPERS
============================================================
*/

const obtenerDataRespuesta = (respuesta) =>
  respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

const convertirNumero = (valor, valorDefecto = null) => {
  if (valor === undefined || valor === null || valor === "") return valorDefecto;
  const numero = Number(valor);
  return Number.isNaN(numero) ? valorDefecto : numero;
};

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

function snakeACamel(texto) {
  return texto.replace(/_([a-z])/g, (_, letra) => letra.toUpperCase());
}

/**
 * Normaliza un registro local a un shape amigable para la UI
 * (camelCase + aliases comunes del backend anterior).
 */
function normalizarRegistro(registro) {
  if (!registro) return null;

  // Genera automáticamente el alias camelCase de CADA campo snake_case
  const aliasCamel = {};
  Object.keys(registro).forEach((llave) => {
    if (llave.includes("_")) {
      aliasCamel[snakeACamel(llave)] = registro[llave];
    }
  });

  const fincaId = convertirNumero(
    obtenerValor(registro, ["finca_id", "fincaId", "finca", "idFinca"], null)
  );
  const estanqueId = convertirNumero(
    obtenerValor(registro, ["estanque_id", "estanqueId", "estanque", "idEstanque"], null)
  );
  const colaboradorId = convertirNumero(
    obtenerValor(registro, ["colaborador_id", "colaboradorId", "colaborador", "idColaborador"], null)
  );
  const productoId = convertirNumero(
    obtenerValor(registro, ["producto_id", "productoId", "producto", "idProducto"], null)
  );

  return {
    ...registro,
    ...aliasCamel,
    id: obtenerValor(registro, ["id"], null),
    servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    uuid: obtenerValor(registro, ["uuid"], ""),
    grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),

    fincaId,
    finca_id: fincaId,
    finca: fincaId,
    idFinca: fincaId,

    estanqueId,
    estanque_id: estanqueId,
    estanque: estanqueId,
    idEstanque: estanqueId,

    colaboradorId,
    colaborador_id: colaboradorId,
    colaborador: colaboradorId,
    idColaborador: colaboradorId,

    productoId,
    producto_id: productoId,
    producto: productoId,
    idProducto: productoId,

    fechaReporte: obtenerValor(
      registro,
      ["fecha_reporte", "fechaReporte", "fecha_registro", "fechaRegistro", "fecha"],
      ""
    ),
    fecha: obtenerValor(
      registro,
      ["fecha", "fecha_reporte", "fechaReporte", "fecha_registro"],
      ""
    ),
    responsable: obtenerValor(registro, ["responsable"], ""),
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
  };
}

function ordenarRecientesPrimero(registros = []) {
  return Array.isArray(registros) ? [...registros].reverse() : [];
}

function filtrarPorFincaEstanque(registros, fincaId, estanqueId) {
  const fId = Number(fincaId);
  const eId = Number(estanqueId);

  return (registros || []).filter((r) => {
    const regFinca = Number(
      obtenerValor(r, ["fincaId", "finca_id", "finca", "idFinca"], null)
    );
    const regEstanque = Number(
      obtenerValor(r, ["estanqueId", "estanque_id", "estanque", "idEstanque"], null)
    );

    return regFinca === fId && regEstanque === eId;
  });
}

async function obtenerTodosDeSeccion(seccion) {
  const apiSeccion = localApi[seccion];

  if (!apiSeccion || typeof apiSeccion.obtenerTodos !== "function") {
    throw new Error(`localApi.${seccion} no está disponible.`);
  }

  const respuesta = await apiSeccion.obtenerTodos();
  const data = obtenerDataRespuesta(respuesta);

  return Array.isArray(data) ? data : [];
}

/*
============================================================
OPERACIONES LOCALES
============================================================
*/

/**
 * Obtiene los registros locales de un tipo filtrados por finca y estanque.
 * Orden: más recientes primero.
 */
export async function obtenerDetalleReporte({ tipoRegistro, fincaId, estanqueId }) {
  // Caso especial: fisico_quimico no vive en localApi[seccion] genérico,
  // porque sus mediciones estan en una tabla de detalle aparte que hay
  // que unir y agrupar por lectura (igual que web usa getLecturas() en
  // vez del flujo generico con los demas tipos).
  if (tipoRegistro === "fisico_quimico") {
    try {
      const registrosFq = await getLecturasLocal();
      const normalizadosFq = (Array.isArray(registrosFq) ? registrosFq : [])
        .map(normalizarRegistro)
        .filter(Boolean);

      return ordenarRecientesPrimero(
        filtrarPorFincaEstanque(normalizadosFq, fincaId, estanqueId)
      );
    } catch (error) {
      console.error(
        "Error al obtener detalle local de fisico_quimico:",
        error?.message || error
      );
      throw error;
    }
  }

  const seccion = SECCION_POR_TIPO[tipoRegistro];

  if (!seccion) {
    return [];
  }

  try {
    const registros = await obtenerTodosDeSeccion(seccion);
    const normalizados = registros.map(normalizarRegistro).filter(Boolean);
    const filtrados = filtrarPorFincaEstanque(normalizados, fincaId, estanqueId);
    const ordenados = ordenarRecientesPrimero(filtrados);

    // Adjuntar muestreos (calculos_crecimiento) cuando el tipo es crecimiento
    if (tipoRegistro === "crecimiento") {
      let calculos = [];
      try {
        const apiCalculos = localApi.calculosCrecimiento;
        if (apiCalculos && typeof apiCalculos.obtenerTodos === "function") {
          const resCalculos = await apiCalculos.obtenerTodos();
          const dataCalculos = obtenerDataRespuesta(resCalculos);
          calculos = Array.isArray(dataCalculos) ? dataCalculos : [];
        }
      } catch (e) {
        console.warn("No se pudieron cargar calculos_crecimiento:", e);
      }

      return ordenados.map((reg) => {
        const delReg = calculos.filter(
          (c) =>
            Number(obtenerValor(c, ["crecimiento_id", "crecimientoId"], 0)) ===
            Number(reg.id)
        );
        const muestreos = delReg.map((c) => ({
          id: obtenerValor(c, ["id"], null),
          cantidad: Number(
            obtenerValor(c, ["cantidad_individuos", "cantidadIndividuos", "cantidad"], 0)
          ),
          pesoTotal: Number(obtenerValor(c, ["peso_total", "pesoTotal"], 0)),
          pesoPromedio: Number(
            obtenerValor(
              c,
              ["peso_promedio_individual", "pesoPromedioIndividual", "pesoPromedio"],
              0
            )
          ),
        }));
        return { ...reg, muestreos };
      });
    }

    return ordenados;
  } catch (error) {
    console.error(
      `Error al obtener detalle local de ${tipoRegistro}:`,
      error?.message || error
    );
    throw error;
  }
}

/**
 * Elimina un registro local por tipo e id.
 */
export async function eliminarRegistroLocal(tipoRegistro, id) {
  // Caso especial: fisico_quimico necesita borrar tambien sus filas
  // de fisico_quimico_detalle (mediciones), no solo la cabecera.
  // eliminarLecturaLocal ya hace ese borrado completo.
  if (tipoRegistro === "fisico_quimico") {
    return eliminarLecturaLocal(id);
  }

  const seccion = SECCION_POR_TIPO[tipoRegistro];

  if (!seccion) {
    throw new Error(`Tipo de registro no soportado: ${tipoRegistro}`);
  }

  // Si es crecimiento, borrar también sus cálculos/muestreos
  if (tipoRegistro === "crecimiento") {
    try {
      const apiCalculos = localApi.calculosCrecimiento;
      if (apiCalculos && typeof apiCalculos.obtenerTodos === "function") {
        const resCalculos = await apiCalculos.obtenerTodos();
        const dataCalculos = obtenerDataRespuesta(resCalculos);
        const lista = Array.isArray(dataCalculos) ? dataCalculos : [];
        for (const c of lista) {
          const cid = Number(obtenerValor(c, ["crecimiento_id", "crecimientoId"], 0));
          if (cid === Number(id) && c.id != null && typeof apiCalculos.eliminar === "function") {
            await apiCalculos.eliminar(c.id);
          }
        }
      }
    } catch (e) {
      console.warn("No se pudieron eliminar calculos de crecimiento:", e);
    }
  }

  const apiSeccion = localApi[seccion];

  if (!apiSeccion || typeof apiSeccion.eliminar !== "function") {
    throw new Error(`localApi.${seccion}.eliminar no está disponible.`);
  }

  const respuesta = await apiSeccion.eliminar(id);
  return obtenerDataRespuesta(respuesta);
}

/**
 * Catálogos locales para filtros y enriquecimiento.
 */
export async function obtenerCatalogosLocales() {
  if (typeof localApi.inicializar === "function") {
    await localApi.inicializar();
  }

  const [fincasRes, estanquesRes, colaboradoresRes, productosRes, usuariosRes] =
    await Promise.all([
      localApi.fincas.obtenerTodos(),
      localApi.estanques.obtenerTodos(),
      localApi.colaboradores.obtenerTodos(),
      localApi.productos.obtenerTodos(),
      localApi.usuarios.obtenerTodos(),
    ]);

  const fincas = Array.isArray(obtenerDataRespuesta(fincasRes))
    ? obtenerDataRespuesta(fincasRes)
    : [];
  const estanques = Array.isArray(obtenerDataRespuesta(estanquesRes))
    ? obtenerDataRespuesta(estanquesRes)
    : [];
  const colaboradores = Array.isArray(obtenerDataRespuesta(colaboradoresRes))
    ? obtenerDataRespuesta(colaboradoresRes)
    : [];
  const productos = Array.isArray(obtenerDataRespuesta(productosRes))
    ? obtenerDataRespuesta(productosRes)
    : [];
  const usuarios = Array.isArray(obtenerDataRespuesta(usuariosRes))
    ? obtenerDataRespuesta(usuariosRes)
    : [];

  return { fincas, estanques, colaboradores, productos, usuarios };
}

const ReporteriaLocalService = {
  obtenerDetalleReporte,
  eliminarRegistroLocal,
  obtenerCatalogosLocales,
  SECCION_POR_TIPO,
};

export default ReporteriaLocalService;
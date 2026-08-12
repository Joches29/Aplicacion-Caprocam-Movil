/**
 * ============================================================
 * UTILIDADES DE CÁLCULO - SIEMBRA
 * ============================================================
 *
 * Contiene funciones puras relacionadas con cálculos del módulo
 * de Siembra.
 *
 * FUNCIONALIDAD:
 * - Calcula la cantidad sembrada según área y densidad.
 * - Calcula el progreso del ciclo (día actual / duración total).
 *
 * No depende de React ni componentes visuales.
 */
import { diasTranscurridosDesde, formatearFechaDesdeISO } from "./dateUtils";

/**
 * Inverso de calcularCantidadSembrada: a partir de la cantidad de
 * larvas que el usuario ingresa directamente (compradas/recibidas)
 * y el área del estanque, calcula la densidad resultante en PL/m².
 * Se redondea a 2 decimales - la densidad real casi nunca da un
 * número entero exacto como sí pasaba cuando era el input.
 */
export function calcularDensidadDesdeCantidad(
  areaHectareas,
  cantidadSembrada,
) {
  const area = Number(areaHectareas);
  const cantidad = Number(cantidadSembrada);

  if (Number.isNaN(area) || Number.isNaN(cantidad)) {
    return "";
  }

  if (area <= 0 || cantidad <= 0) {
    return "";
  }

  return String(Math.round((cantidad / (area * 10000)) * 100) / 100);
}

/**
 * Calcula el progreso del ciclo productivo de una siembra o
 * pre-cría a partir de sus días de cultivo y su duración total.
 * Punto único para este cálculo: lo usan tanto el detalle como
 * el listado, para que ambos midan el progreso de la misma forma.
 */
export function calcularProgresoCiclo(registro) {
  if (!registro) {
    return { totalDias: 0, diaActual: 0, progreso: 0 };
  }

  const esPrecria = registro.tipoRegistro === "precria";

  const totalDias =
    Number(esPrecria ? registro.duracionDias : registro.duracionCiclo) || 0;

  const fechaInicioStr = esPrecria
    ? registro.fechaInicio
    : registro.fechaSiembra;

  let fechaFinStr = null;
  if (esPrecria && registro.fechaFin) {
    fechaFinStr = registro.fechaFin;
  } else if (!esPrecria && String(registro.estado || "").toLowerCase() === "finalizada") {
    // Para siembras finalizadas, usamos la fecha de actualización si no hay fecha_fin.
    const fechaFinRaw = registro.fechaFin || registro.fecha_fin || registro.fecha_actualizacion || registro.updated_at;
    fechaFinStr = fechaFinRaw && String(fechaFinRaw).includes("-") 
      ? formatearFechaDesdeISO(fechaFinRaw) 
      : fechaFinRaw;
  }

  const diasCalculados = diasTranscurridosDesde(fechaInicioStr, fechaFinStr);
  const diaActual =
    totalDias > 0 ? Math.min(diasCalculados, totalDias) : diasCalculados;

  const progreso =
    totalDias > 0 ? Math.round((diaActual / totalDias) * 100) : 0;

  return { totalDias, diaActual, progreso };
}
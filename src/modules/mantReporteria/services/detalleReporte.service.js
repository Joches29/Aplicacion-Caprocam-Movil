/**
 * ============================================================
 * SERVICE: detalleReporte (capa de compatibilidad)
 * ============================================================
 *
 * Antes consultaba servicios HTTP de cada módulo.
 * Ahora delega 100% a ReporteriaLocal.service (SQLite / localApi)
 * 
 */

import { obtenerDetalleReporte as obtenerDetalleLocal } from "./ReporteriaLocal.service";

/**
 * Obtiene el detalle de reportes filtrado por tipo, finca y estanque
 * desde la base de datos local SQLite.
 *
 * @param {{ tipoRegistro: string, fincaId: number|string, estanqueId: number|string }} params
 * @returns {Promise<Array>}
 */
export async function obtenerDetalleReporte({ tipoRegistro, fincaId, estanqueId }) {
  return obtenerDetalleLocal({ tipoRegistro, fincaId, estanqueId });
}

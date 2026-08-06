/**
 * ============================================================
 * SERVICIO AgregarTrazabilidadService
 * ============================================================
 *
 * Descripción:
 * Procesa el envío de nuevos registros de trazabilidad formateando campos e integrando toMysqlDate.
 *
 * @dependencies toMysqlDate (shared/utils/dateUtils), crearRegistro (TrazabilidadServices)
 * @validations Convierte la fecha dd/mm/aaaa a YYYY-MM-DD MySQL antes de enviar al backend.
 * @navigation N/A
 *
 * Cambio de schema (Gerald, 05/08/2026): se quitó colaboradorId
 * del body. La tabla trazabilidad ya no tiene esa columna como
 * campo de negocio -- quién hizo el registro se resuelve por
 * auditoría (creado_por_usuario_id / creado_por_colaborador_id),
 * no por un campo del formulario.
 */
import { toMysqlDate } from "../../../shared/utils/dateUtils";
import { crearRegistro } from "./TrazabilidadServices";

export async function crearRegistroTrazabilidad(formData) {
  const body = {
    fincaId: formData.fincaId,
    estanqueOrigenId: formData.estanqueOrigenId,
    estanqueDestinoId: formData.estanqueDestinoId,
    fecha: toMysqlDate(formData.fecha) || formData.fecha,
    tamano: formData.tamaño,
    dias: formData.dias,
    pl: formData.pl,
  };

  return crearRegistro(body);
}
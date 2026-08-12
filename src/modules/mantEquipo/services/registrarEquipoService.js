/**
 * ============================================================
 * SERVICIO: registrarEquipoService
 * ============================================================
 * Módulo: Mantenimiento de Equipos
 *
 * Expone catálogos y el payload normalizado para el formulario
 * de registro de equipos, y conecta con equiposService para
 * persistir contra SQLite local (Offline-First).
 * ============================================================
 */

import { equiposService } from './equiposService';

export const TIPOS_EQUIPO = [
  { label: 'Aireación', value: 'Aireacion' },
  { label: 'Bombeo', value: 'Bombeo' },
  { label: 'Alimentación', value: 'Alimentacion' },
  { label: 'Monitoreo', value: 'Monitoreo' },
  { label: 'Mantenimiento', value: 'Mantenimiento' },
  { label: 'Otro', value: 'Otro' },
];

export const ESTADOS_OPERATIVOS_EQUIPO = [
  { label: 'Activo', value: 'Activo' },
  { label: 'Mantenimiento', value: 'Mantenimiento' },
  { label: 'Inactivo', value: 'Inactivo' },
];

/**
 * Crea el payload que espera equiposService.
 */
export function crearEquipoPayload(formulario, { isEditing, estadoActual, horasActualesActual } = {}) {
  return {
    codigoInterno: formulario.codigoInterno.trim(),
    nombre: formulario.nombre.trim(),
    descripcion: formulario.descripcion.trim(),
    tipo: formulario.tipo,
    tipoEquipo: formulario.tipo,
    fechaInstalacion: formulario.fechaInstalacion,
    estadoOperativo: formulario.estadoOperativo,
    funcionEquipo: formulario.funcionEquipo.trim(),
    estadoEncendido: isEditing && estadoActual ? estadoActual === 'Encendido' : false,
    horasActuales: isEditing && horasActualesActual !== undefined ? horasActualesActual : 0,
    ...(formulario.estanqueId ? { estanqueId: Number(formulario.estanqueId) } : {}),
    ...(formulario.horasMantenimiento
      ? { horasMantenimiento: Number(formulario.horasMantenimiento) }
      : {}),
  };
}

export async function agregarEquipo(payload) {
  try {
    return await equiposService.createEquipo(payload);
  } catch (error) {
    throw new Error(error.message || 'No se pudo guardar el equipo');
  }
}

export async function actualizarEquipo(id, payload) {
  try {
    return await equiposService.updateEquipo(Number(id), payload);
  } catch (error) {
    throw new Error(error.message || 'No se pudo actualizar el equipo');
  }
}
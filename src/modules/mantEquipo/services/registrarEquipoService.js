/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: registrarEquipoService.js
Autor: Rodolfo
Fecha: 04/08/2026
Modulo: Mantenimiento de Equipos
Descripcion:
Expone catalogos y el payload normalizado para el formulario
de registro de equipos. Delega la persistencia en equiposService
que opera sobre SQLite local.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { equiposService } from "./equiposService";

/*
//////////////////////////////////////////////////////////
CONSTANTES / CATALOGOS
//////////////////////////////////////////////////////////
*/

/**
 * Tipos de equipo disponibles para el formulario.
 * Los values coinciden con los ENUM de la base de datos.
 */
export const TIPOS_EQUIPO = [
    { label: "Aireación", value: "Aireacion" },
    { label: "Bombeo", value: "Bombeo" },
    { label: "Alimentación", value: "Alimentacion" },
    { label: "Monitoreo", value: "Monitoreo" },
    { label: "Mantenimiento", value: "Mantenimiento" },
    { label: "Otro", value: "Otro" },
];

/**
 * Estados operativos disponibles para el formulario.
 */
export const ESTADOS_OPERATIVOS_EQUIPO = [
    { label: "Activo", value: "Activo" },
    { label: "Mantenimiento", value: "Mantenimiento" },
    { label: "Inactivo", value: "Inactivo" },
];

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Crea el payload normalizado que necesita equiposService.
 * Convierte los datos del formulario al shape correcto para
 * insertarlo en SQLite local.
 *
 * @param {object} formulario - Datos del formulario de registro.
 * @param {object} opciones - Opciones adicionales.
 * @param {boolean} opciones.isEditing - Si se esta editando.
 * @param {string} opciones.estadoActual - Estado actual del equipo (Encendido/Apagado).
 * @param {number} opciones.horasActualesActual - Horas actuales del equipo.
 * @returns {object} Payload para equiposService.
 */
export function crearEquipoPayload(formulario, { isEditing, estadoActual, horasActualesActual } = {}) {
    return {
        codigoInterno: formulario.codigoInterno.trim(),
        nombre: formulario.nombre.trim(),
        descripcion: formulario.descripcion.trim(),
        // tipo viene del formulario como valor capitalizado (e.g. "Aireacion")
        // equiposService lo convierte a minusculas internamente para el shape frontend
        // pero mapEquipoALocal lo acepta directamente como tipoEquipo
        tipo: null,
        tipoEquipo: formulario.tipo,
        fechaInstalacion: formulario.fechaInstalacion,
        estadoOperativo: formulario.estadoOperativo,
        funcionEquipo: formulario.funcionEquipo.trim(),
        estadoEncendido: isEditing && estadoActual ? estadoActual === "Encendido" : false,
        horasActuales: isEditing && horasActualesActual !== undefined ? horasActualesActual : 0,
        ...(formulario.estanqueId ? { estanqueId: Number(formulario.estanqueId) } : {}),
        ...(formulario.horasMantenimiento
            ? { horasMantenimiento: Number(formulario.horasMantenimiento) }
            : {}),
    };
}

/**
 * Persiste un nuevo equipo en SQLite local.
 * Delegado en equiposService.createEquipo para centralizar
 * la logica de mapeo y auditoria.
 *
 * @param {object} payload - Payload creado por crearEquipoPayload.
 * @returns {Promise<object>} Equipo creado.
 */
export async function agregarEquipo(payload) {
    try {
        return await equiposService.createEquipo(payload);
    } catch (error) {
        throw new Error(error.message || "No se pudo guardar el equipo. Intente nuevamente.");
    }
}

/**
 * Actualiza un equipo existente en SQLite local.
 * Delegado en equiposService.updateEquipo para centralizar
 * la logica de mapeo.
 *
 * @param {number|string} id - ID local del equipo.
 * @param {object} payload - Payload creado por crearEquipoPayload.
 * @returns {Promise<object>} Equipo actualizado.
 */
export async function actualizarEquipo(id, payload) {
    try {
        return await equiposService.updateEquipo(Number(id), payload);
    } catch (error) {
        throw new Error(error.message || "No se pudo actualizar el equipo. Intente nuevamente.");
    }
}
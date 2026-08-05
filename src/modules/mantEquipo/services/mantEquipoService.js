/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: mantEquipoService.js
Autor: Rodolfo
Fecha: 04/08/2026
Modulo: Mantenimiento de Equipos
Descripcion:
Servicio CRUD para tickets de mantenimiento operando sobre
SQLite local. Maneja 3 tablas relacionadas:
  - mantenimiento_equipo (ticket principal)
  - mantenimiento_equipo_tareas (junction ticket-tarea)
  - mantenimiento_equipo_productos (junction ticket-producto)
Marca todos los registros con pendiente_sync para sincronizacion
futura con el backend cuando haya conexion a internet.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from "../../../database/local/localApi.service";
import { equiposService } from "./equiposService";
import { obtenerTareas } from "./tareasService";
import { obtenerCamposAuditoria, obtenerGrupoDatosSesion } from "../../../shared/utils/sessionUtils";
import {
    ESTADO_BACKEND_A_FRONTEND,
    ESTADO_FRONTEND_A_BACKEND,
    TIPO_PERSONAL_A_BACKEND,
    TIPO_PERSONAL_A_FRONTEND,
    LISTA_ESTADOS_EQUIPO,
} from "../constants/mantEquipoMensajes";

// Re-exportar para compatibilidad con importaciones existentes
export {
    ESTADO_BACKEND_A_FRONTEND,
    ESTADO_FRONTEND_A_BACKEND,
    TIPO_PERSONAL_A_BACKEND,
    TIPO_PERSONAL_A_FRONTEND,
    LISTA_ESTADOS_EQUIPO,
    LISTA_ESTADOS_EQUIPO as ESTADOS_EQUIPO,
};

/*
//////////////////////////////////////////////////////////
FUNCIONES DE MAPEO — TICKET
//////////////////////////////////////////////////////////
*/

/**
 * Mapea un registro SQLite de mantenimiento_equipo al shape del frontend.
 * @param {object} item - Registro SQLite de mantenimiento_equipo.
 * @param {Array} tareas - Tareas vinculadas (de mantenimiento_equipo_tareas).
 * @param {Array} productos - Productos vinculados (de mantenimiento_equipo_productos).
 * @returns {object} Ticket en formato frontend.
 */
function mapTicketLocal(item, tareas = [], productos = []) {
    if (!item || !item.id) {
        throw new Error("mapTicketLocal: item invalido.");
    }

    const estadoRaw = item.estado_ticket || "En espera";
    const estadoFront = ESTADO_BACKEND_A_FRONTEND[estadoRaw] || "en_espera";
    const tipoRaw = item.tipo_personal || "TrabajadorInterno";
    const tipoPersonal = TIPO_PERSONAL_A_FRONTEND[tipoRaw] || "interno";

    return {
        id: String(item.id),
        dbId: item.id,
        equipoId: item.equipo_id ? String(item.equipo_id) : null,
        herramienta: item.equipo_id ? `Equipo ${item.equipo_id}` : "Equipo General",
        titulo: item.titulo_ticket || "Mantenimiento",
        descripcion: item.descripcion_ticket || "",
        tareas: tareas,
        productos: productos,
        estado: estadoFront,
        creadoPor: item.creado_por_colaborador_id
            ? String(item.creado_por_colaborador_id)
            : "Colaborador",
        fechaCreacion: new Date(item.fecha_mantenimiento || item.fecha_creacion || Date.now()),
        estadoEquipo: item.estado_equipo || "",
        tipoPersonal,
        costoManoObra: Number(item.costo_mano_obra) || 0,
        costoProductos: Number(item.costo_productos) || 0,
        costoTotalEstimado: Number(item.costo_total_estimado) || 0,
        costoTotal: Number(item.costo_total_estimado) || 0,
        // Campos sync
        sincronizado: Boolean(item.sincronizado),
        pendienteSync: Boolean(item.pendiente_sync),
        uuid: item.uuid,
    };
}

/**
 * Mapea una tarea vinculada (mantenimiento_equipo_tareas) al shape del frontend.
 * @param {object} t - Registro de junction.
 * @param {Array} catalogoTareas - Catalogo de tareas para enriquecer datos.
 * @returns {object} Tarea vinculada mapeada.
 */
function mapTareaVinculada(t, catalogoTareas = []) {
    const tareaId = String(t.tarea_id || t.tareaId || "");
    const catalogo = catalogoTareas.find(
        (x) => String(x.id) === tareaId || String(x.value) === tareaId
    );

    const nombre = t.nombre || catalogo?.nombre || catalogo?.label || `Tarea ${tareaId}`;

    return {
        id: t.id,
        tareaId,
        value: tareaId,
        label: nombre,
        nombre,
        categoria: t.categoria || catalogo?.categoria || "",
        duracionEstimada: Number(t.duracion_estimada || catalogo?.duracionEstimada || 0),
        descripcion: t.descripcion || catalogo?.descripcion || "",
        estado: t.estado_tarea || "Pendiente",
        realizada: (t.estado_tarea) === "Realizado",
    };
}

/**
 * Mapea un producto vinculado (mantenimiento_equipo_productos) al shape del frontend.
 * @param {object} p - Registro de junction.
 * @returns {object} Producto vinculado mapeado.
 */
function mapProductoVinculado(p) {
    return {
        id: p.id,
        productoId: p.producto_id ? String(p.producto_id) : null,
        cantidad: Number(p.cantidad) || 1,
        costoUnitario: Number(p.costo_unitario) || 0,
        subtotal: Number(p.subtotal) || 0,
        nombre: p.nombre || `Producto ${p.producto_id || p.id}`,
    };
}

/*
//////////////////////////////////////////////////////////
FUNCIONES DE CONSTRUCCION DE PAYLOAD
//////////////////////////////////////////////////////////
*/

/**
 * Construye el payload para insertar/actualizar en mantenimiento_equipo.
 * @param {object} ticket - Ticket del formulario frontend.
 * @param {object} auditoria - Campos de auditoria (grupo_datos, colaborador_id).
 * @returns {object} Payload para SQLite.
 */
function buildPayloadLocal(ticket, auditoria) {
    if (!ticket.equipoId) {
        throw new Error("buildPayloadLocal: equipoId es obligatorio.");
    }
    if (!ticket.titulo) {
        throw new Error("buildPayloadLocal: titulo es obligatorio.");
    }

    const estadoBackend = ESTADO_FRONTEND_A_BACKEND[ticket.estado] || "En espera";
    const tipoPersonalBackend = TIPO_PERSONAL_A_BACKEND[ticket.tipoPersonal] || "TrabajadorInterno";

    const fechaISO =
        ticket.fechaCreacion instanceof Date
            ? ticket.fechaCreacion.toISOString().slice(0, 19).replace("T", " ")
            : new Date().toISOString().slice(0, 19).replace("T", " ");

    const codigoTicket = (
        ticket.codigoTicket || ticket.codigo || `MT-${String(Date.now()).slice(-6)}`
    ).slice(0, 10);

    const costoProductos = Number(ticket.costoProductos || ticket.costoTotal) || 0;
    const costoManoObra = Number(ticket.costoManoObra) || 0;

    return {
        ...auditoria,
        codigo_ticket: codigoTicket,
        fecha_mantenimiento: fechaISO,
        titulo_ticket: ticket.titulo,
        descripcion_ticket: ticket.descripcion || "",
        equipo_id: Number(ticket.equipoId),
        estado_ticket: estadoBackend,
        estado_equipo: ticket.estadoEquipo || "Mantenimiento",
        tipo_personal: tipoPersonalBackend,
        costo_mano_obra: costoManoObra,
        costo_productos: costoProductos,
        costo_total_estimado: costoManoObra + costoProductos,
    };
}

/*
//////////////////////////////////////////////////////////
FUNCIONES DE JUNCTION — TAREAS
//////////////////////////////////////////////////////////
*/

/**
 * Crea los registros de junction mantenimiento_equipo_tareas.
 * @param {number} mantenimientoId - ID local del ticket.
 * @param {Array} tareas - Tareas del formulario.
 * @param {object} auditoria - Campos de auditoria.
 */
async function crearTareasVinculadas(mantenimientoId, tareas, auditoria) {
    if (!Array.isArray(tareas) || tareas.length === 0) return;

    for (const t of tareas) {
        const tareaId = t.tareaId || t.value || t.id;
        if (!tareaId) continue;

        await localApi.mantenimientoEquipoTareas.crear({
            ...auditoria,
            mantenimiento_equipo_id: mantenimientoId,
            tarea_id: Number(tareaId),
            estado_tarea: t.realizada ? "Realizado" : "Pendiente",
        });
    }
}

/**
 * Sincroniza (diff) las tareas vinculadas a un ticket existente.
 * Inserta las nuevas, actualiza las que cambiaron y elimina las que salieron.
 * @param {number} mantenimientoId - ID local del ticket.
 * @param {Array} tareasNuevas - Tareas actuales del formulario.
 * @param {object} auditoria - Campos de auditoria.
 */
async function sincronizarTareasLocal(mantenimientoId, tareasNuevas, auditoria) {
    const respExistentes = await localApi.mantenimientoEquipoTareas.obtenerTodos({
        mantenimiento_equipo_id: mantenimientoId,
        incluirInactivos: true,
    });

    const existentes = respExistentes.success ? (respExistentes.data || []) : [];
    const safeTareasNuevas = Array.isArray(tareasNuevas) ? tareasNuevas : [];
    const procesadosIds = new Set();

    for (const t of safeTareasNuevas) {
        const tareaId = t.tareaId || t.value || t.id;
        if (!tareaId) continue;

        const estadoNuevo = t.realizada ? "Realizado" : "Pendiente";
        const existente = existentes.find(
            (x) => String(x.tarea_id) === String(tareaId) && x.activo === 1
        );

        if (existente) {
            procesadosIds.add(existente.id);
            if (existente.estado_tarea !== estadoNuevo) {
                await localApi.mantenimientoEquipoTareas.actualizar(existente.id, {
                    estado_tarea: estadoNuevo,
                });
            }
        } else {
            await localApi.mantenimientoEquipoTareas.crear({
                ...auditoria,
                mantenimiento_equipo_id: mantenimientoId,
                tarea_id: Number(tareaId),
                estado_tarea: estadoNuevo,
            });
        }
    }

    // Eliminar (soft delete) tareas que ya no están
    for (const ex of existentes) {
        if (ex.activo === 1 && !procesadosIds.has(ex.id)) {
            await localApi.mantenimientoEquipoTareas.eliminar(ex.id);
        }
    }
}

/*
//////////////////////////////////////////////////////////
FUNCIONES DE JUNCTION — PRODUCTOS
//////////////////////////////////////////////////////////
*/

/**
 * Crea los registros de junction mantenimiento_equipo_productos.
 * @param {number} mantenimientoId - ID local del ticket.
 * @param {Array} productos - Productos del formulario.
 * @param {object} auditoria - Campos de auditoria.
 */
async function crearProductosVinculados(mantenimientoId, productos, auditoria) {
    if (!Array.isArray(productos) || productos.length === 0) return;

    for (const p of productos) {
        const productoId = p.productoId || p.id;
        if (!productoId) continue;

        const cantidad = Number(p.cantidad) || 1;
        const costoUnitario = Number(p.precioUnidad || p.precio || p.costoUnitario) || 0;
        const subtotal = cantidad * costoUnitario;

        await localApi.mantenimientoEquipoProductos.crear({
            ...auditoria,
            mantenimiento_equipo_id: mantenimientoId,
            producto_id: Number(productoId),
            cantidad,
            costo_unitario: costoUnitario,
            subtotal,
        });
    }
}

/**
 * Sincroniza (diff) los productos vinculados a un ticket existente.
 * @param {number} mantenimientoId - ID local del ticket.
 * @param {Array} productosNuevos - Productos actuales del formulario.
 * @param {object} auditoria - Campos de auditoria.
 */
async function sincronizarProductosLocal(mantenimientoId, productosNuevos, auditoria) {
    const respExistentes = await localApi.mantenimientoEquipoProductos.obtenerTodos({
        mantenimiento_equipo_id: mantenimientoId,
        incluirInactivos: true,
    });

    const existentes = respExistentes.success ? (respExistentes.data || []) : [];
    const safeProductosNuevos = Array.isArray(productosNuevos) ? productosNuevos : [];
    const procesadosIds = new Set();

    for (const p of safeProductosNuevos) {
        const productoId = p.productoId || p.id;
        if (!productoId) continue;

        const cantidad = Number(p.cantidad) || 1;
        const costoUnitario = Number(p.precioUnidad || p.precio || p.costoUnitario) || 0;
        const subtotal = cantidad * costoUnitario;

        const existente = existentes.find(
            (x) => String(x.producto_id) === String(productoId) && x.activo === 1
        );

        if (existente) {
            procesadosIds.add(existente.id);
            const cantActual = Number(existente.cantidad);
            const costoActual = Number(existente.costo_unitario);
            if (cantActual !== cantidad || costoActual !== costoUnitario) {
                await localApi.mantenimientoEquipoProductos.actualizar(existente.id, {
                    cantidad,
                    costo_unitario: costoUnitario,
                    subtotal,
                });
            }
        } else {
            await localApi.mantenimientoEquipoProductos.crear({
                ...auditoria,
                mantenimiento_equipo_id: mantenimientoId,
                producto_id: Number(productoId),
                cantidad,
                costo_unitario: costoUnitario,
                subtotal,
            });
        }
    }

    // Eliminar (soft delete) productos que ya no están
    for (const ex of existentes) {
        if (ex.activo === 1 && !procesadosIds.has(ex.id)) {
            await localApi.mantenimientoEquipoProductos.eliminar(ex.id);
        }
    }
}

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES — TICKETS
//////////////////////////////////////////////////////////
*/

/**
 * Obtiene todos los tickets de mantenimiento desde SQLite.
 * Enriquece cada ticket con sus tareas y productos vinculados.
 * @returns {Promise<Array>} Lista de tickets mapeados.
 */
export async function obtenerTickets() {
    const respTickets = await localApi.mantenimientoEquipo.obtenerTodos();

    if (!respTickets.success) {
        throw new Error(respTickets.message || "Error al obtener tickets.");
    }

    const tickets = respTickets.data || [];
    const result = [];

    for (const item of tickets) {
        const respTareas = await localApi.mantenimientoEquipoTareas.obtenerTodos({
            mantenimiento_equipo_id: item.id,
        });
        const respProductos = await localApi.mantenimientoEquipoProductos.obtenerTodos({
            mantenimiento_equipo_id: item.id,
        });

        const tareasMapeadas = (respTareas.data || []).map((t) => mapTareaVinculada(t));
        const productosMapeados = (respProductos.data || []).map(mapProductoVinculado);

        result.push(mapTicketLocal(item, tareasMapeadas, productosMapeados));
    }

    return result;
}

/**
 * Obtiene un ticket por su ID local con tareas y productos enriquecidos.
 * @param {number|string} id - ID local del ticket.
 * @returns {Promise<object>} Ticket mapeado con tareas y productos.
 */
export async function obtenerTicketPorId(id) {
    const numericId = Number(String(id).replace(/\D/g, ""));

    if (!numericId) {
        throw new Error(`obtenerTicketPorId: ID invalido: "${id}"`);
    }

    const respTicket = await localApi.mantenimientoEquipo.obtenerPorId(numericId);

    if (!respTicket.success || !respTicket.data) {
        throw new Error(`Ticket con ID "${id}" no encontrado.`);
    }

    const item = respTicket.data;

    // Obtener catalogo de tareas para enriquecer nombres
    let catalogoTareas = [];
    try {
        catalogoTareas = await obtenerTareas();
    } catch {
        catalogoTareas = [];
    }

    const respTareas = await localApi.mantenimientoEquipoTareas.obtenerTodos({
        mantenimiento_equipo_id: numericId,
    });
    const respProductos = await localApi.mantenimientoEquipoProductos.obtenerTodos({
        mantenimiento_equipo_id: numericId,
    });

    const tareasMapeadas = (respTareas.data || []).map((t) =>
        mapTareaVinculada(t, catalogoTareas)
    );
    const productosMapeados = (respProductos.data || []).map(mapProductoVinculado);

    return mapTicketLocal(item, tareasMapeadas, productosMapeados);
}

/**
 * Actualiza el estado operativo del equipo asociado a un ticket.
 * @param {string|number} equipoId - ID local del equipo.
 * @param {string} nuevoEstado - Estado frontend (activo/inactivo/mantenimiento).
 */
export async function actualizarEstadoEquipo(equipoId, nuevoEstado) {
    if (!equipoId || !nuevoEstado) return;
    try {
        const equipo = await equiposService.getEquipoById(equipoId);
        if (!equipo) return;
        await equiposService.updateEquipo(equipoId, { ...equipo, estado: nuevoEstado });
    } catch (err) {
        console.warn("actualizarEstadoEquipo:", err?.message || err);
    }
}

/**
 * Reinicia el estado operativo del equipo a Activo.
 * @param {string|number} equipoId - ID local del equipo.
 */
export function reiniciarHorasEquipo(equipoId) {
    if (!equipoId) return;
    equiposService
        .updateEquipo(equipoId, { estadoOperativo: "Activo" })
        .catch((err) => console.warn("reiniciarHorasEquipo:", err?.message || err));
}

/**
 * Crea un nuevo ticket de mantenimiento en SQLite local.
 * Inserta en mantenimiento_equipo, luego vincula tareas y productos.
 * @param {object} ticket - Datos del formulario de ticket.
 * @returns {Promise<object>} Ticket creado mapeado.
 */
export async function agregarTicket(ticket) {
    const auditoria = await obtenerCamposAuditoria();
    const payload = buildPayloadLocal(ticket, auditoria);

    const respTicket = await localApi.mantenimientoEquipo.crear(payload);

    if (!respTicket.success) {
        const msg = respTicket.error ? `${respTicket.message} (${respTicket.error})` : respTicket.message;
        throw new Error(msg || "Error al crear el ticket.");
    }

    const nuevoId = respTicket.data.id;

    // Vincular tareas y productos en secuencia
    await crearTareasVinculadas(nuevoId, ticket.tareas || [], auditoria);
    await crearProductosVinculados(nuevoId, ticket.productos || [], auditoria);

    return await obtenerTicketPorId(nuevoId);
}

/**
 * Actualiza un ticket existente en SQLite local.
 * Realiza diff inteligente de tareas y productos vinculados.
 * @param {object} ticket - Datos actualizados del ticket.
 * @returns {Promise<object>} Ticket actualizado mapeado.
 */
export async function actualizarTicket(ticket) {
    const targetId = Number(ticket.dbId || String(ticket.id).replace(/\D/g, ""));

    if (!targetId) {
        throw new Error("actualizarTicket: no se puede determinar el ID del ticket.");
    }

    const auditoria = await obtenerCamposAuditoria();
    const payload = buildPayloadLocal(ticket, auditoria);

    const respUpdate = await localApi.mantenimientoEquipo.actualizar(targetId, payload);

    if (!respUpdate.success) {
        const msg = respUpdate.error ? `${respUpdate.message} (${respUpdate.error})` : respUpdate.message;
        throw new Error(msg || "Error al actualizar el ticket.");
    }

    // Diff inteligente de tareas y productos
    await sincronizarTareasLocal(targetId, ticket.tareas, auditoria);
    await sincronizarProductosLocal(targetId, ticket.productos, auditoria);

    return await obtenerTicketPorId(targetId);
}

/**
 * Elimina logicamente un ticket en SQLite local (soft delete).
 * @param {number|string} id - ID local del ticket.
 */
export async function eliminarTicket(id) {
    const targetId = Number(String(id).replace(/\D/g, ""));

    if (!targetId) {
        throw new Error("eliminarTicket: ID invalido.");
    }

    const respuesta = await localApi.mantenimientoEquipo.eliminar(targetId);

    if (!respuesta.success) {
        throw new Error(respuesta.message || "Error al eliminar el ticket.");
    }
}

/**
 * Actualiza el estado de una tarea vinculada en el ticket.
 * @param {number} vinculoId - ID local del registro de junction.
 * @param {string} estadoTarea - "Pendiente" | "Realizado".
 * @returns {Promise<object>} Registro actualizado.
 */
export async function actualizarEstadoTareaEnTicket(vinculoId, estadoTarea) {
    const respuesta = await localApi.mantenimientoEquipoTareas.actualizar(
        Number(vinculoId),
        { estado_tarea: estadoTarea }
    );

    if (!respuesta.success) {
        throw new Error(respuesta.message || "Error al actualizar estado de tarea.");
    }

    return respuesta.data;
}

/**
 * Elimina logicamente una tarea del ticket.
 * @param {number} vinculoId - ID local del registro de junction.
 */
export async function eliminarTareaDelTicket(vinculoId) {
    const respuesta = await localApi.mantenimientoEquipoTareas.eliminar(Number(vinculoId));

    if (!respuesta.success) {
        throw new Error(respuesta.message || "Error al eliminar tarea del ticket.");
    }
}

/**
 * Elimina logicamente un producto del ticket.
 * @param {number} vinculoId - ID local del registro de junction.
 */
export async function eliminarProductoDelTicket(vinculoId) {
    const respuesta = await localApi.mantenimientoEquipoProductos.eliminar(Number(vinculoId));

    if (!respuesta.success) {
        throw new Error(respuesta.message || "Error al eliminar producto del ticket.");
    }
}

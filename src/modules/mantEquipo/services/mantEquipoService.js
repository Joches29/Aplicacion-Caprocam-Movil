import api from "../../../api/api";
/**
 * ============================================================
 * SERVICIO: mantEquipoService
 * ============================================================
 *
 * Conecta el módulo de Mantenimiento de Equipos con SQLite local
 * (Offline-First). Expone funciones para tickets, tareas y
 * productos de mantenimiento.
 * ============================================================
 */

import { localApi } from "../../../database/local/localApi.service.js";
import { obtenerBaseLocal } from "../../../database/local/sqlite.database.js";
import { equiposService } from "./equiposService.js";
import { obtenerTareas } from "./tareasService.js";
import { obtenerCamposAuditoria } from "../../../shared/utils/sessionUtils.js";
import {
  ESTADO_BACKEND_A_FRONTEND,
  ESTADO_FRONTEND_A_BACKEND,
  TIPO_PERSONAL_A_BACKEND,
  TIPO_PERSONAL_A_FRONTEND,
  LISTA_ESTADOS_EQUIPO,
  MENSAJES_SERVICIOS,
} from "../constants/mantEquipoMensajes.js";

// Re-exportar para compatibilidad
export {
  ESTADO_BACKEND_A_FRONTEND,
  ESTADO_FRONTEND_A_BACKEND,
  TIPO_PERSONAL_A_BACKEND,
  TIPO_PERSONAL_A_FRONTEND,
  LISTA_ESTADOS_EQUIPO,
  LISTA_ESTADOS_EQUIPO as ESTADOS_EQUIPO,
};

/**
 * Obtiene el catálogo completo de productos desde SQLite local,
 * combinando la tabla 'productos' e 'inventario' para no omitir ningún registro.
 */
export async function getProductosCatalogo() {
  try {
    const [resProductos, resInventario] = await Promise.allSettled([
      localApi.productos.obtenerTodos({ incluirInactivos: false }),
      localApi.inventario.obtenerTodos({ incluirInactivos: false }),
    ]);

    const prodsRaw = resProductos.status === 'fulfilled' && resProductos.value.success
      ? (resProductos.value.data || [])
      : [];
    const invRaw = resInventario.status === 'fulfilled' && resInventario.value.success
      ? (resInventario.value.data || [])
      : [];

    return prodsRaw.map((p) => {
      const pLocalId = String(p.id);
      const pServId = p.servidor_id ? String(p.servidor_id) : null;
      const inv = invRaw.find((i) => {
        const invProdId = String(i.producto_id ?? '');
        if (pServId && invProdId === pServId) return true;
        if (invProdId === pLocalId) return true;
        return false;
      });

      const price = Number(p.precio_unidad ?? p.precioUnidad ?? 0);
      const stock = Number(inv?.cantidad ?? p.cantidad ?? 0);

      return {
        ...p,
        id: pLocalId,
        productoId: pLocalId,
        servidorId: pServId,
        nombre: p.nombre || `Producto ${p.id}`,
        categoria: p.categoria || '',
        precioUnidad: price,
        costoUnitario: price,
        stockMaximo: stock,
        cantidad: stock,
      };
    });
  } catch (err) {
    return [];
  }
}

// ─── Adaptador: respuesta local SQLite → objeto frontend ───────────────────────
function adaptTicketLocal(item, tareas = [], productos = [], creadorNombre = null) {
  if (!item || !item.id) throw new Error(MENSAJES_SERVICIOS?.itemInvalido || 'Ticket inválido');

  const estadoRaw = item.estado_ticket || 'En espera';
  const estadoFront = ESTADO_BACKEND_A_FRONTEND[estadoRaw] || 'en_espera';
  const equipoId = item.equipo_id ? String(item.equipo_id) : null;
  const tipoRaw = item.tipo_personal || 'TrabajadorInterno';
  const tipoPersonal = TIPO_PERSONAL_A_FRONTEND[tipoRaw] || 'interno';

  const idVisual = String(item.id);

  return {
    id: idVisual,
    dbId: item.id,
    equipoId,
    herramienta: equipoId ? `Equipo ${equipoId}` : 'Equipo General',
    titulo: item.titulo_ticket || 'Mantenimiento',
    descripcion: item.descripcion_ticket || '',
    tareas,
    productos,
    estado: estadoFront,
    creadoPor: creadorNombre || (item.creado_por_colaborador_id
      ? String(item.creado_por_colaborador_id)
      : (item.creado_por_usuario_id ? String(item.creado_por_usuario_id) : 'Usuario')),
    fechaCreacion: new Date(item.fecha_mantenimiento || item.fecha_creacion || Date.now()),
    estadoEquipo: item.estado_equipo || '',
    tipoPersonal,
    costoManoObra: Number(item.costo_mano_obra) || 0,
    costoProductos: Number(item.costo_productos) || 0,
    costoTotalEstimado: Number(item.costo_total_estimado) || 0,
    costoTotal: Number(item.costo_total_estimado) || 0,
    sincronizado: Boolean(item.sincronizado),
    pendienteSync: Boolean(item.pendiente_sync),
  };
}

function mapTareaVinculada(t, catalogoTareas = []) {
  const tareaId = String(t.tarea_id || t.tareaId || t.id || '');
  const c = catalogoTareas.find(x =>
    String(x.id) === tareaId ||
    String(x.tareaId) === tareaId ||
    String(x.value) === tareaId
  );

  const nombreDefault = t.nombre || c?.nombre || c?.label || `Tarea ${tareaId}`;

  return {
    id: t.id,
    tareaId,
    value: tareaId,
    label: nombreDefault,
    nombre: nombreDefault,
    categoria: t.categoria || c?.categoria || '',
    duracionEstimada: Number(t.duracion_estimada || t.duracionEstimada || c?.duracionEstimada || c?.horas) || 0,
    descripcion: t.descripcion || c?.descripcion || '',
    estado: t.estado_tarea || t.estadoTarea || 'Pendiente',
    realizada: (t.estado_tarea || t.estadoTarea) === 'Realizado',
  };
}

function mapProductoVinculado(p, catalogoProductos = []) {
  const prodId = String(p.producto_id || p.productoId || p.id || '');
  const enCatalogo = catalogoProductos.find(c =>
    String(c.productoId || c.producto_id || c.id) === prodId
  );

  const costoUnit = Number(p.costo_unitario || p.costoUnitario || enCatalogo?.precioUnidad || enCatalogo?.precio_unidad || 0);

  return {
    id: p.id,
    productoId: prodId,
    nombre: p.nombre || enCatalogo?.nombre || `Producto ${prodId}`,
    precioUnidad: costoUnit,
    costoUnitario: costoUnit,
    cantidad: Number(p.cantidad) || 1,
    subtotal: Number(p.subtotal) || (Number(p.cantidad || 1) * costoUnit),
  };
}

// ─── OBTENER todos los tickets desde SQLite ────────────────────────────────────
const MAPA_USUARIOS_CONOCIDOS = {
  '1': 'Administrador Sistema',
  '2': 'Carlos Mendoza Solano',
  '3': 'Maria Jimenez Castro',
  '4': 'Roberto Vargas Quiros',
};

export async function obtenerTickets() {
  try {
    const respTickets = await localApi.mantenimientoEquipo.obtenerTodos();
    if (!respTickets.success) {
      throw new Error(respTickets.message || "No se pudieron obtener los tickets de mantenimiento");
    }

    const tickets = respTickets.data || [];
    const result = [];

    let catalogoTareas = [];
    let catalogoProductos = [];
    let listaColaboradores = [];

    try {
      catalogoTareas = await obtenerTareas();
      catalogoProductos = await getProductosCatalogo();
      const respColabs = await localApi.colaboradores.obtenerTodos();
      if (respColabs.success && Array.isArray(respColabs.data)) {
        listaColaboradores = respColabs.data;
      }
    } catch (_) {}

    for (const item of tickets) {
      const respTareas = await localApi.mantenimientoEquipoTareas.obtenerTodos({
        mantenimiento_equipo_id: item.id,
      });
      const respProductos = await localApi.mantenimientoEquipoProductos.obtenerTodos({
        mantenimiento_equipo_id: item.id,
      });

      const tareasMapeadas = (respTareas.data || []).map(t => mapTareaVinculada(t, catalogoTareas));
      const productosMapeados = (respProductos.data || []).map(p => mapProductoVinculado(p, catalogoProductos));

      const cid = item.creado_por_colaborador_id || item.creadoPorColaboradorId;
      const uid = item.creado_por_usuario_id || item.creadoPorUsuarioId;
      let creadorNom = null;

      if (cid) {
        const colab = listaColaboradores.find(c => Number(c.servidor_id) === Number(cid)) ||
                      listaColaboradores.find(c => Number(c.id) === Number(cid));
        if (colab) {
          const nom = [colab.nombre, colab.apellidos].filter(Boolean).join(' ').trim();
          creadorNom = nom || colab.nombre_usuario || colab.nombreUsuario || `Colaborador #${cid}`;
        } else {
          creadorNom = `Colaborador #${cid}`;
        }
      } else if (uid) {
        creadorNom = MAPA_USUARIOS_CONOCIDOS[String(uid)] || `Usuario #${uid}`;
      }

      result.push(adaptTicketLocal(item, tareasMapeadas, productosMapeados, creadorNom));
    }

    return result;
  } catch (err) {
    throw new Error(err.message || 'No se pudieron obtener los tickets de mantenimiento');
  }
}

// ─── OBTENER un ticket por ID con sus tareas y productos de SQLite ─────────────
export async function obtenerTicketPorId(id) {
  const numericId = Number(String(id).replace(/\D/g, ''));

  if (!numericId) {
    throw new Error(`ID de ticket inválido: "${id}"`);
  }

  try {
    const respTicket = await localApi.mantenimientoEquipo.obtenerPorId(numericId);
    if (!respTicket.success || !respTicket.data) {
      throw new Error(`No se pudo obtener el ticket con ID ${id}`);
    }

    const item = respTicket.data;

    let catalogoTareas = [];
    let catalogoProductos = [];
    let nombreCreador = null;

    try {
      catalogoTareas = await obtenerTareas();
      catalogoProductos = await getProductosCatalogo();
      const cid = item.creado_por_colaborador_id || item.creadoPorColaboradorId;
      const uid = item.creado_por_usuario_id || item.creadoPorUsuarioId;

      if (cid) {
        const respColabs = await localApi.colaboradores.obtenerTodos();
        if (respColabs.success && Array.isArray(respColabs.data)) {
          const colab = respColabs.data.find(c => Number(c.servidor_id) === Number(cid)) ||
                        respColabs.data.find(c => Number(c.id) === Number(cid));
          if (colab) {
            const nom = [colab.nombre, colab.apellidos].filter(Boolean).join(' ').trim();
            nombreCreador = nom || colab.nombre_usuario || colab.nombreUsuario || `Colaborador #${cid}`;
          }
        }
      } else if (uid) {
        // Intentar resolver online si hay conexión
        try {
          const respOnline = await api.get(`/login/${uid}`, { timeout: 2000 });
          const uData = respOnline.data?.data || respOnline.data;
          if (uData) {
            const nom = [uData.nombre, uData.apellidos].filter(Boolean).join(' ').trim();
            nombreCreador = nom || uData.nombreUsuario || uData.email;
          }
        } catch (_) {}

        if (!nombreCreador) {
          nombreCreador = MAPA_USUARIOS_CONOCIDOS[String(uid)] || `Usuario #${uid}`;
        }
      }
    } catch (_) {}

    const respTareas = await localApi.mantenimientoEquipoTareas.obtenerTodos({
      mantenimiento_equipo_id: numericId,
    });
    const respProductos = await localApi.mantenimientoEquipoProductos.obtenerTodos({
      mantenimiento_equipo_id: numericId,
    });

    const tareasMapeadas = (respTareas.data || []).map(t => mapTareaVinculada(t, catalogoTareas));
    const productosMapeados = (respProductos.data || []).map(p => mapProductoVinculado(p, catalogoProductos));

    return adaptTicketLocal(item, tareasMapeadas, productosMapeados, nombreCreador);
  } catch (errorDirecto) {
    const todos = await obtenerTickets();
    const encontrado = todos.find(
      t => t.id === String(id) || Number(t.dbId) === numericId
    );
    if (!encontrado) {
      throw new Error(errorDirecto.message || `No se pudo obtener el ticket con ID ${id}`);
    }
    return encontrado;
  }
}

// ─── Actualizar estado operativo del equipo ───────────────────────────────────
export async function actualizarEstadoEquipo(equipoId, nuevoEstado) {
  if (!equipoId || !nuevoEstado) return;
  try {
    const equipo = await equiposService.getEquipoById(equipoId);
    if (!equipo) return;
    await equiposService.updateEquipo(equipoId, { ...equipo, estado: nuevoEstado });
  } catch (err) {
    console.warn('actualizarEstadoEquipo error:', err?.message || err);
  }
}

// ─── Reiniciar estado operativo del equipo a Activo y restablecer horas de uso a 0 ──────────
export async function reiniciarHorasEquipo(equipoId) {
  if (!equipoId) return;
  try {
    const equipo = await equiposService.getEquipoById(equipoId);
    if (!equipo) return;
    await equiposService.updateEquipo(equipoId, {
      ...equipo,
      estado: 'activo',
      horasActuales: 0,
      horasUso: 0,
    });
  } catch (err) {
    console.warn('reiniciarHorasEquipo error:', err?.message || err);
  }
}

// ─── Construir payload local para inserción / actualización ──────────────────
function buildPayloadLocal(ticket, auditoria) {
  if (!ticket.equipoId) throw new Error(MENSAJES_SERVICIOS?.equipoObligatorio || 'El equipo es obligatorio');
  if (!ticket.titulo) throw new Error(MENSAJES_SERVICIOS?.tituloObligatorio || 'El título es obligatorio');

  const estadoBackend = ESTADO_FRONTEND_A_BACKEND[ticket.estado] || 'En espera';
  const tipoPersonalBackend = TIPO_PERSONAL_A_BACKEND[ticket.tipoPersonal] || 'TrabajadorInterno';

  const fechaISO = ticket.fechaCreacion instanceof Date
    ? ticket.fechaCreacion.toISOString().slice(0, 19).replace('T', ' ')
    : new Date().toISOString().slice(0, 19).replace('T', ' ');

  const codigoTicket = (ticket.codigoTicket || ticket.codigo || `MT-${String(Date.now()).slice(-6)}`).slice(0, 10);

  const costoManoObra = Number(ticket.costoManoObra) || 0;
  const costoProductos = Number(ticket.costoProductos || ticket.costoTotal) || 0;

  return {
    ...auditoria,
    codigo_ticket: codigoTicket,
    fecha_mantenimiento: fechaISO,
    titulo_ticket: ticket.titulo,
    descripcion_ticket: ticket.descripcion || '',
    equipo_id: Number(ticket.equipoId),
    estado_ticket: estadoBackend,
    estado_equipo: ticket.estadoEquipo || 'Mantenimiento',
    tipo_personal: tipoPersonalBackend,
    costo_mano_obra: costoManoObra,
    costo_productos: costoProductos,
    costo_total_estimado: Number(ticket.costoTotal) || (costoManoObra + costoProductos),
  };
}

// ─── Vincular tareas al ticket local ──────────────────────────────────────────
async function vincularTareasLocal(mantenimientoEquipoId, tareas, auditoria) {
  if (!Array.isArray(tareas) || tareas.length === 0) return;

  for (const t of tareas) {
    const tareaId = t.tareaId || t.value || t.id;
    if (!tareaId) continue;

    await localApi.mantenimientoEquipoTareas.crear({
      ...auditoria,
      mantenimiento_equipo_id: mantenimientoEquipoId,
      tarea_id: Number(tareaId),
      estado_tarea: t.realizada ? 'Realizado' : 'Pendiente',
    });
  }
}

// ─── Vincular productos al ticket local ───────────────────────────────────────
async function vincularProductosLocal(mantenimientoEquipoId, productos, auditoria) {
  if (!Array.isArray(productos) || productos.length === 0) return;

  for (const p of productos) {
    const productoId = p.productoId || p.id;
    if (!productoId) continue;

    const cantidad = Number(p.cantidad) || 1;
    const costoUnitario = Number(p.precioUnidad || p.precio || p.costoUnitario) || 0;
    const subtotal = cantidad * costoUnitario;

    await localApi.mantenimientoEquipoProductos.crear({
      ...auditoria,
      mantenimiento_equipo_id: mantenimientoEquipoId,
      producto_id: Number(productoId),
      cantidad,
      costo_unitario: costoUnitario,
      subtotal,
    });
  }
}

// ─── Descontar stock de inventario local ──────────────────────────────────────
export async function descontarStockLocal(productos) {
  if (!Array.isArray(productos) || productos.length === 0) return;
  try {
    const auditoria = await obtenerCamposAuditoria();
    const [resInv, resProds] = await Promise.all([
      localApi.inventario.obtenerTodos({ incluirInactivos: false }),
      localApi.productos.obtenerTodos({ incluirInactivos: false }),
    ]);
    const invList = (resInv.success && Array.isArray(resInv.data)) ? resInv.data : [];
    const prodList = (resProds.success && Array.isArray(resProds.data)) ? resProds.data : [];
    const db = await obtenerBaseLocal();

    for (const prod of productos) {
      const prodId = String(prod.productoId ?? prod.producto_id ?? prod.id ?? '');
      if (!prodId) continue;

      const cantUsada = Number(prod.cantidad) || 1;
      if (cantUsada <= 0) continue;

      // Buscar producto en catalogo para conocer su local id, servidor_id y codigo
      const pCatalog = prodList.find(p =>
        String(p.id) === prodId ||
        (p.servidor_id && String(p.servidor_id) === prodId) ||
        (p.codigo && String(p.codigo) === prodId)
      );

      const pLocalId = pCatalog ? String(pCatalog.id) : prodId;
      const pServId = pCatalog?.servidor_id ? String(pCatalog.servidor_id) : null;
      const pCodigo = pCatalog?.codigo ? String(pCatalog.codigo) : null;

      const invItem = invList.find(i => {
        const invProdId = String(i.producto_id ?? '');
        if (pServId && invProdId === pServId) return true;
        if (invProdId === pLocalId) return true;
        if (pCodigo && i.codigo && String(i.codigo) === pCodigo) return true;
        return false;
      });

      if (invItem) {
        const cantActual = Number(invItem.cantidad) || 0;
        const nuevaCantidad = Math.max(0, cantActual - cantUsada);

        // 1. Actualización directa e incondicional en SQLite
        await db.runAsync(
          `UPDATE inventario SET cantidad = ?, version = version + 1 WHERE id = ?`,
          [nuevaCantidad, invItem.id]
        );

        // 2. Actualización en localApi
        try {
          await localApi.inventario.actualizar(invItem.id, {
            cantidad: nuevaCantidad,
          });
        } catch (_) {}

        // 3. Registrar movimiento de Salida
        try {
          await localApi.movimientosInventario.crear({
            ...auditoria,
            inventario_id: invItem.id,
            producto_id: Number(invItem.producto_id || pLocalId),
            tipo_movimiento: 'Salida',
            cantidad: cantUsada,
            observacion: 'Salida automatica por finalizacion de ticket de mantenimiento.',
          });
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('descontarStockLocal error:', err?.message || err);
  }
}

// ─── Restaurar / Sumar stock de inventario local ──────────────────────────────
export async function restaurarStockLocal(productos) {
  if (!Array.isArray(productos) || productos.length === 0) return;
  try {
    const auditoria = await obtenerCamposAuditoria();
    const [resInv, resProds] = await Promise.all([
      localApi.inventario.obtenerTodos({ incluirInactivos: false }),
      localApi.productos.obtenerTodos({ incluirInactivos: false }),
    ]);
    const invList = (resInv.success && Array.isArray(resInv.data)) ? resInv.data : [];
    const prodList = (resProds.success && Array.isArray(resProds.data)) ? resProds.data : [];
    const db = await obtenerBaseLocal();

    for (const prod of productos) {
      const prodId = String(prod.productoId ?? prod.producto_id ?? prod.id ?? '');
      if (!prodId) continue;

      const cantDevuelta = Number(prod.cantidad) || 1;
      if (cantDevuelta <= 0) continue;

      const pCatalog = prodList.find(p =>
        String(p.id) === prodId ||
        (p.servidor_id && String(p.servidor_id) === prodId) ||
        (p.codigo && String(p.codigo) === prodId)
      );

      const pLocalId = pCatalog ? String(pCatalog.id) : prodId;
      const pServId = pCatalog?.servidor_id ? String(pCatalog.servidor_id) : null;
      const pCodigo = pCatalog?.codigo ? String(pCatalog.codigo) : null;

      const invItem = invList.find(i => {
        const invProdId = String(i.producto_id ?? '');
        if (pServId && invProdId === pServId) return true;
        if (invProdId === pLocalId) return true;
        if (pCodigo && i.codigo && String(i.codigo) === pCodigo) return true;
        return false;
      });

      if (invItem) {
        const cantActual = Number(invItem.cantidad) || 0;
        const nuevaCantidad = cantActual + cantDevuelta;

        // 1. Actualización directa e incondicional en SQLite
        await db.runAsync(
          `UPDATE inventario SET cantidad = ?, version = version + 1 WHERE id = ?`,
          [nuevaCantidad, invItem.id]
        );

        // 2. Actualización en localApi
        try {
          await localApi.inventario.actualizar(invItem.id, {
            cantidad: nuevaCantidad,
          });
        } catch (_) {}

        // 3. Registrar movimiento de Entrada (reversión)
        try {
          await localApi.movimientosInventario.crear({
            ...auditoria,
            inventario_id: invItem.id,
            producto_id: Number(invItem.producto_id || pLocalId),
            tipo_movimiento: 'Entrada',
            cantidad: cantDevuelta,
            observacion: 'Reversion automatica de stock por reapertura de ticket de mantenimiento.',
          });
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('restaurarStockLocal error:', err?.message || err);
  }
}

// ─── CREAR ticket ──────────────────────────────────────────────────────────────
export async function agregarTicket(ticket) {
  try {
    const auditoria = await obtenerCamposAuditoria();
    const payload = buildPayloadLocal(ticket, auditoria);

    const res = await localApi.mantenimientoEquipo.crear(payload);
    if (!res.success) {
      const msg = res.error ? `${res.message} (${res.error})` : res.message;
      throw new Error(msg || 'No se pudo agregar el ticket');
    }

    const nuevoId = res.data.id;

    await vincularTareasLocal(nuevoId, ticket.tareas || [], auditoria);
    await vincularProductosLocal(nuevoId, ticket.productos || [], auditoria);

    const esEstadoTerminado = (est) => String(est || '').trim().toLowerCase() === 'terminado';
    const esTerminado = esEstadoTerminado(ticket.estado) || esEstadoTerminado(payload.estado_ticket);

    if (ticket.equipoId) {
      if (String(ticket.estado || '').toLowerCase() === 'en_mantenimiento' || payload.estado_ticket === 'En mantenimiento') {
        await actualizarEstadoEquipo(ticket.equipoId, 'mantenimiento');
      } else if (esTerminado) {
        await reiniciarHorasEquipo(ticket.equipoId);
      }
    }

    if (esTerminado) {
      await descontarStockLocal(ticket.productos || []);
    }

    return await obtenerTicketPorId(nuevoId);
  } catch (err) {
    throw new Error(err.message || 'No se pudo agregar el ticket');
  }
}

// ─── Sincronizar tareas al actualizar ticket (diff inteligente local) ─────────
async function sincronizarTareasLocal(mantenimientoEquipoId, tareasNuevas, auditoria) {
  const res = await localApi.mantenimientoEquipoTareas.obtenerTodos({
    mantenimiento_equipo_id: mantenimientoEquipoId,
    incluirInactivos: true,
  });
  const existentes = res.success ? (res.data || []) : [];

  const safeTareasNuevas = Array.isArray(tareasNuevas) ? tareasNuevas : [];
  const procesadosExistentesIds = new Set();

  for (const t of safeTareasNuevas) {
    const tareaId = t.tareaId || t.value || t.id;
    if (!tareaId) continue;

    const estadoNuevo = t.realizada ? 'Realizado' : 'Pendiente';
    const existente = existentes.find(x => String(x.tarea_id) === String(tareaId) && x.activo === 1);

    if (existente) {
      procesadosExistentesIds.add(existente.id);
      if (existente.estado_tarea !== estadoNuevo) {
        await localApi.mantenimientoEquipoTareas.actualizar(existente.id, { estado_tarea: estadoNuevo });
      }
    } else {
      await localApi.mantenimientoEquipoTareas.crear({
        ...auditoria,
        mantenimiento_equipo_id: mantenimientoEquipoId,
        tarea_id: Number(tareaId),
        estado_tarea: estadoNuevo,
      });
    }
  }

  for (const ex of existentes) {
    if (ex.activo === 1 && !procesadosExistentesIds.has(ex.id)) {
      await localApi.mantenimientoEquipoTareas.eliminar(ex.id);
    }
  }
}

// ─── Sincronizar productos al actualizar ticket (diff inteligente local) ──────
async function sincronizarProductosLocal(mantenimientoEquipoId, productosNuevos, auditoria) {
  const res = await localApi.mantenimientoEquipoProductos.obtenerTodos({
    mantenimiento_equipo_id: mantenimientoEquipoId,
    incluirInactivos: true,
  });
  const existentes = res.success ? (res.data || []) : [];

  const safeProductosNuevos = Array.isArray(productosNuevos) ? productosNuevos : [];
  const procesadosExistentesIds = new Set();

  for (const p of safeProductosNuevos) {
    const productoId = p.productoId || p.id;
    if (!productoId) continue;

    const cantidad = Number(p.cantidad) || 1;
    const costoUnitario = Number(p.precioUnidad || p.precio || p.costoUnitario) || 0;
    const subtotal = cantidad * costoUnitario;

    const existente = existentes.find(x => String(x.producto_id) === String(productoId) && x.activo === 1);

    if (existente) {
      procesadosExistentesIds.add(existente.id);
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
        mantenimiento_equipo_id: mantenimientoEquipoId,
        producto_id: Number(productoId),
        cantidad,
        costo_unitario: costoUnitario,
        subtotal,
      });
    }
  }

  for (const ex of existentes) {
    if (ex.activo === 1 && !procesadosExistentesIds.has(ex.id)) {
      await localApi.mantenimientoEquipoProductos.eliminar(ex.id);
    }
  }
}

// ─── ACTUALIZAR ticket ─────────────────────────────────────────────────────────
export async function actualizarTicket(ticket) {
  const targetId = Number(ticket.dbId || String(ticket.id).replace(/\D/g, ''));
  if (!targetId) throw new Error(MENSAJES_SERVICIOS?.sinIdActualizar || 'No se pudo actualizar el ticket');

  try {
    // 1. Obtener ticket previo para conocer su estado y productos anteriores
    let ticketAnterior = null;
    try {
      ticketAnterior = await obtenerTicketPorId(targetId);
    } catch (_) {}

    const auditoria = await obtenerCamposAuditoria();
    const payload = buildPayloadLocal(ticket, auditoria);
    const res = await localApi.mantenimientoEquipo.actualizar(targetId, payload);
    if (!res.success) {
      const msg = res.error ? `${res.message} (${res.error})` : res.message;
      throw new Error(msg || 'No se pudo actualizar el ticket');
    }

    await sincronizarTareasLocal(targetId, ticket.tareas, auditoria);
    await sincronizarProductosLocal(targetId, ticket.productos, auditoria);

    const esEstadoTerminado = (est) => String(est || '').trim().toLowerCase() === 'terminado';

    const eraTerminado = ticketAnterior && (
      esEstadoTerminado(ticketAnterior.estado) ||
      esEstadoTerminado(ticketAnterior.estado_ticket)
    );
    const esTerminado = (
      esEstadoTerminado(ticket.estado) ||
      esEstadoTerminado(payload.estado_ticket)
    );

    if (ticket.equipoId) {
      if (String(ticket.estado || '').toLowerCase() === 'en_mantenimiento' || payload.estado_ticket === 'En mantenimiento') {
        await actualizarEstadoEquipo(ticket.equipoId, 'mantenimiento');
      } else if (esTerminado) {
        await reiniciarHorasEquipo(ticket.equipoId);
      }
    }

    // 2. Control de Stock
    if (!eraTerminado && esTerminado) {
      // De 'En espera' / 'En mantenimiento' a 'Terminado' -> Disminuir stock
      await descontarStockLocal(ticket.productos || []);
    } else if (eraTerminado && !esTerminado) {
      // De 'Terminado' a 'En espera' / 'En mantenimiento' -> Restaurar stock
      const prodsARestaurar = (ticketAnterior?.productos && ticketAnterior.productos.length > 0)
        ? ticketAnterior.productos
        : (ticket.productos || []);
      await restaurarStockLocal(prodsARestaurar);
    } else if (eraTerminado && esTerminado) {
      // Se mantuvo en Terminado pero los productos o cantidades pudieron variar
      if (ticketAnterior?.productos && ticketAnterior.productos.length > 0) {
        await restaurarStockLocal(ticketAnterior.productos);
      }
      await descontarStockLocal(ticket.productos || []);
    }

    const ticketActualizado = await obtenerTicketPorId(targetId);
    return ticketActualizado;
  } catch (err) {
    throw new Error(err.message || 'No se pudo actualizar el ticket');
  }
}

// ─── ELIMINAR ticket ───────────────────────────────────────────────────────────
export async function eliminarTicket(id) {
  const targetId = Number(String(id).replace(/\D/g, ''));
  if (!targetId) throw new Error(MENSAJES_SERVICIOS?.idInvalidoEliminar || 'ID de ticket inválido');
  try {
    let ticketAnterior = null;
    try {
      ticketAnterior = await obtenerTicketPorId(targetId);
    } catch (_) {}

    const res = await localApi.mantenimientoEquipo.eliminar(targetId);
    if (!res.success) {
      throw new Error(res.message || 'No se pudo eliminar el ticket');
    }

    const esEstadoTerminado = (est) => String(est || '').trim().toLowerCase() === 'terminado';
    if (ticketAnterior && (esEstadoTerminado(ticketAnterior.estado) || esEstadoTerminado(ticketAnterior.estado_ticket))) {
      await restaurarStockLocal(ticketAnterior.productos || []);
    }
  } catch (err) {
    throw new Error(err.message || 'No se pudo eliminar el ticket');
  }
}

// ─── Actualizar estado de una tarea en el ticket ──────────────────────────────
export async function actualizarEstadoTareaEnTicket(vinculoId, estadoTarea) {
  try {
    const res = await localApi.mantenimientoEquipoTareas.actualizar(Number(vinculoId), {
      estado_tarea: estadoTarea,
    });
    if (!res.success) {
      throw new Error(res.message || 'No se pudo actualizar la tarea del ticket');
    }
    return res.data;
  } catch (err) {
    throw new Error(err.message || 'No se pudo actualizar la tarea del ticket');
  }
}

// ─── Eliminar una tarea del ticket ────────────────────────────────────────────
export async function eliminarTareaDelTicket(vinculoId) {
  try {
    const res = await localApi.mantenimientoEquipoTareas.eliminar(Number(vinculoId));
    if (!res.success) {
      throw new Error(res.message || 'No se pudo eliminar la tarea del ticket');
    }
  } catch (err) {
    throw new Error(err.message || 'No se pudo eliminar la tarea del ticket');
  }
}

// ─── Eliminar un producto del ticket ─────────────────────────────────────────
export async function eliminarProductoDelTicket(vinculoId) {
  try {
    const res = await localApi.mantenimientoEquipoProductos.eliminar(Number(vinculoId));
    if (!res.success) {
      throw new Error(res.message || 'No se pudo eliminar el producto del ticket');
    }
  } catch (err) {
    throw new Error(err.message || 'No se pudo eliminar el producto del ticket');
  }
}
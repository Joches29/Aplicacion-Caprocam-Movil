/**
 * ============================================================
 * LOOKUP DE PROVEEDORES (uso interno del módulo Productos)
 * ============================================================
 * Este archivo vive DENTRO de productos/services porque el
 * formulario y el detalle de producto necesitan leer proveedores
 * (para el select y para mostrar el nombre), pero el módulo
 * Proveedores como tal no es responsabilidad de este equipo. Solo
 * se usa GET, nunca se crea/edita/borra un proveedor desde acá.
 *
 * IMPORTANTE:
 * - Versión SQLite (offline-first), igual que producto.service.js.
 *   Antes llamaba a /proveedores por HTTP (api.js), pero el resto
 *   del módulo ya corre 100% contra la base local -- esa llamada
 *   HTTP fallaba en silencio (sin backend/token real) y por eso
 *   el proveedor no se veía ni en el detalle ni en los selects de
 *   Agregar/Editar Producto.
 * - Se filtra por grupo_datos de la sesión activa, igual que
 *   producto.service.js, para no mezclar datos entre fincas.
 * - Mantiene los mismos nombres de función y el mismo shape de
 *   respuesta que la versión anterior, para no tener que tocar
 *   useAgregarProducto.js, useEditarProducto.js ni
 *   useDetalleProductoScreen.js.
 * ============================================================
 */

import { localApi } from "../../../database/local/localApi.service";
import { obtenerGrupoDatosSesion } from "../../../shared/utils/sessionUtils";

let baseInicializada = false;

async function asegurarBaseInicializada() {
  if (baseInicializada) return;
  await localApi.inicializar();
  baseInicializada = true;
}

function mapProveedor(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre_empresa,
    tipoProducto: row.tipo_producto ?? "",
  };
}

export async function getProveedores() {
  await asegurarBaseInicializada();
  const grupoDatos = await obtenerGrupoDatosSesion();

  const resultado = await localApi.proveedores.obtenerTodos({
    grupo_datos: grupoDatos,
  });

  if (!resultado?.success) {
    throw new Error("No se pudieron obtener los proveedores.");
  }

  return (resultado.data || []).map(mapProveedor);
}

export async function getProveedorPorId(id) {
  await asegurarBaseInicializada();
  if (id === null || id === undefined || id === "") return null;

  const idStr = String(id);
  const idNum = Number(id);

  const resTodos = await localApi.proveedores.obtenerTodos({ incluirInactivos: false });
  const lista = (resTodos?.success && Array.isArray(resTodos.data)) ? resTodos.data : [];

  const encontrado =
    lista.find((p) => String(p.servidor_id) === idStr) ||
    lista.find((p) => String(p.id) === idStr);

  if (encontrado) {
    return mapProveedor(encontrado);
  }

  if (!isNaN(idNum)) {
    const resId = await localApi.proveedores.obtenerPorId(idNum);
    if (resId?.success && resId.data) {
      return mapProveedor(resId.data);
    }
  }

  return null;
}

// Quita tildes y pasa a minúsculas, para comparar "Alimentación" con
// "alimento", "Antibiótico" con "antibiotico", etc.
function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Filtra proveedores cuyo tipoProducto "se parece" a la categoría de
// producto elegida (best effort). Si no hay ninguna coincidencia,
// devuelve la lista completa para no dejar el select vacío por un
// simple desacuerdo de nombres entre back y front.
export function filtrarProveedoresPorCategoria(proveedores, categoria) {
  const categoriaNorm = normalizar(categoria).slice(0, 5); // ej. "alime", "antib"
  const filtrados = proveedores.filter((p) =>
    normalizar(p.tipoProducto).includes(categoriaNorm) ||
    categoriaNorm.includes(normalizar(p.tipoProducto).slice(0, 5))
  );
  return filtrados.length > 0 ? filtrados : proveedores;
}
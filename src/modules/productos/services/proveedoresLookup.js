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

  /*
  El producto guarda el proveedor con el ID DEL SERVIDOR
  (proveedor_id viene del backend tal cual). Pero SQLite reasigna
  su propio id autoincremental al descargar, y esos dos numeros
  NO coinciden.

  Ejemplo real: Nicovita tiene servidor_id = 1 pero id local = 2,
  mientras que id local = 1 es "Proveedor Demo" (del seed de
  pruebas). Buscar por id local devolvia el proveedor equivocado
  en silencio, sin error.

  Por eso se busca primero por servidor_id y solo se cae al id
  local si no hay coincidencia (caso de un proveedor creado en el
  telefono que todavia no subio, que no tiene servidor_id).
  */
  const idBuscado = Number(id);

  const porServidor = await localApi.proveedores.obtenerTodos({
    servidor_id: idBuscado,
  });

  if (porServidor?.success && porServidor.data?.length > 0) {
    return mapProveedor(porServidor.data[0]);
  }

  const resultado = await localApi.proveedores.obtenerPorId(idBuscado);

  if (!resultado?.success) {
    throw new Error("No se pudo obtener el proveedor.");
  }

  return mapProveedor(resultado.data);
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
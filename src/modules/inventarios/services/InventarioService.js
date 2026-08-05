// modules/inventarios/services/inventarioService.js

/**
 * ============================================================
 * SERVICE: InventarioService
 * ============================================================
 *
 * Responsabilidad:
 * Capa de servicios y comunicación HTTP para el módulo de inventarios.
 * Se conecta de forma asíncrona con la API para gestionar las operaciones
 * CRUD (leer, agregar, actualizar y eliminar) de los productos del inventario.
 *
 * Datos:
 * Cada producto: { id, codigo, nombre, categoria, cantidad, unidad,
 * stockMinimo, proveedor, precioUnidad, fechaCaducidad }.
 * fechaCaducidad ya existe como dato real del producto (se define y
 * se guarda desde el módulo de Productos); aquí solo se refleja para
 * que el filtro de "Fecha de caducidad" de FilterButton.jsx pueda
 * usarlo. Formato dd/mm/aaaa, igual al que entrega el DateInput
 * compartido.
 *
 * Validaciones:
 * No aplica validación de campos aquí (se realiza en el formulario que
 * consume este servicio). El id se autogenera de forma incremental.
 *
 * Navegación:
 * No aplica, es una capa de datos sin UI.
 *
 * Dependencias:
 * Es consumido por hooks/useInventario.js.
 */
import api from "../../../api/api";
import { localApi } from "../../../database/local/localApi.service";

function mapearProductoInventarioLocal(registroInventario, catalogoProductos = []) {
  if (!registroInventario) return null;

  const productoId = registroInventario.producto_id ?? registroInventario.productoId ?? null;
  const productoCatalogo = catalogoProductos.find((producto) => {
    return String(producto.id) === String(productoId) || String(producto.servidor_id) === String(productoId);
  });

  const cantidad = Number(registroInventario.cantidad ?? productoCatalogo?.cantidad ?? 0) || 0;
  const stockMinimo = Number(registroInventario.stock_minimo ?? productoCatalogo?.stock_minimo ?? 0) || 0;
  const precioUnidad = Number(
    productoCatalogo?.precio_unidad ?? productoCatalogo?.precioUnidad ?? registroInventario.precio_unidad ?? 0,
  ) || 0;

  return {
    id: registroInventario.id ?? productoCatalogo?.id ?? productoId,
    productoId,
    codigo: productoCatalogo?.codigo ?? registroInventario.codigo ?? "",
    nombre: productoCatalogo?.nombre ?? registroInventario.nombre ?? `Producto ${productoId ?? ""}`,
    categoria: productoCatalogo?.categoria ?? registroInventario.categoria ?? "",
    proveedor: productoCatalogo?.proveedor ?? registroInventario.proveedor ?? "",
    proveedorId: registroInventario.proveedor_id ?? productoCatalogo?.proveedor_id ?? productoCatalogo?.proveedorId ?? null,
    cantidad,
    unidad: productoCatalogo?.unidad ?? registroInventario.unidad ?? "",
    stockMinimo,
    stock_maximo: stockMinimo,
    precioUnidad,
    precio_unidad: precioUnidad,
    entryDate: productoCatalogo?.entryDate ?? productoCatalogo?.fecha_ingreso ?? registroInventario.entryDate ?? null,
    expirationDate: productoCatalogo?.expirationDate ?? productoCatalogo?.fecha_caducidad ?? registroInventario.expirationDate ?? null,
    fechaCaducidad: productoCatalogo?.fecha_caducidad ?? productoCatalogo?.expirationDate ?? registroInventario.fechaCaducidad ?? null,
  };
}

async function obtenerProductosInventarioLocal() {
  const [respInventario, respProductos] = await Promise.all([
    localApi.inventario.obtenerTodos({ incluirInactivos: true }),
    localApi.productos.obtenerTodos({ incluirInactivos: true }),
  ]);

  const inventario = respInventario.success ? (respInventario.data || []) : [];
  const catalogoProductos = respProductos.success ? (respProductos.data || []) : [];

  if (inventario.length > 0) {
    return inventario.map((registro) => mapearProductoInventarioLocal(registro, catalogoProductos));
  }

  return catalogoProductos.map((producto) => ({
    id: producto.id,
    productoId: producto.id,
    codigo: producto.codigo ?? "",
    nombre: producto.nombre ?? "",
    categoria: producto.categoria ?? "",
    proveedor: producto.proveedor ?? "",
    proveedorId: producto.proveedor_id ?? producto.proveedorId ?? null,
    cantidad: Number(producto.cantidad ?? 0) || 0,
    unidad: producto.unidad ?? "",
    stockMinimo: Number(producto.stock_minimo ?? producto.stockMinimo ?? 0) || 0,
    stock_maximo: Number(producto.stock_minimo ?? producto.stockMinimo ?? 0) || 0,
    precioUnidad: Number(producto.precio_unidad ?? producto.precioUnidad ?? 0) || 0,
    precio_unidad: Number(producto.precio_unidad ?? producto.precioUnidad ?? 0) || 0,
    entryDate: producto.entryDate ?? producto.fecha_ingreso ?? null,
    expirationDate: producto.expirationDate ?? producto.fecha_caducidad ?? null,
    fechaCaducidad: producto.fecha_caducidad ?? producto.expirationDate ?? null,
  }));
}

export async function getProductosInventario() {
  try {
    const productosLocales = await obtenerProductosInventarioLocal();

    if (productosLocales.length > 0) {
      return productosLocales.sort((a, b) => Number(b.id) - Number(a.id));
    }

    const response = await api.get("/inventario");

    return response.data.data;
  } catch (error) {
    console.error("Error al obtener productos de inventario:", error);

    throw error;
  }
}

export async function getProductoById(id) {
  try {
    const productosLocales = await obtenerProductosInventarioLocal();
    const productoLocal = productosLocales.find((producto) => String(producto.id) === String(id) || String(producto.productoId) === String(id));

    if (productoLocal) {
      return productoLocal;
    }

    const response = await api.get(`/inventario/${id}`);

    return response.data.data;
  } catch (error) {
    console.error(
      "Error al obtener producto:",
      error.response?.data || error.message,
    );

    throw error;
  }
}

export async function addProducto({ producto_id, proveedor_id, stock_minimo, cantidad = 0 }) {
  try {
    const respuestaLocal = await localApi.inventario.crear({
      producto_id,
      proveedor_id,
      stock_minimo,
      cantidad,
    });

    if (respuestaLocal.success) {
      return respuestaLocal;
    }

    const response = await api.post("/inventario", {
      producto_id,
      proveedor_id,
      stock_minimo,
      cantidad,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error al crear producto:",
      error.response?.data || error.message,
    );

    throw error;
  }
}

export async function updateProducto(id, { proveedor_id, stock_minimo, cantidad = 0 }) {
  try {
    const respuestaLocal = await localApi.inventario.actualizar(Number(id), {
      proveedor_id,
      stock_minimo,
      cantidad,
    });

    if (respuestaLocal.success) {
      return respuestaLocal;
    }

    const response = await api.put(`/inventario/${id}`, {
      proveedor_id,
      stock_minimo,
      cantidad,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Error al actualizar producto:",
      error.response?.data || error.message,
    );

    throw error;
  }
}

export async function deleteProducto(id) {
  try {
    const respuestaLocal = await localApi.inventario.eliminar(Number(id));

    if (respuestaLocal.success) {
      return respuestaLocal;
    }

    const response = await api.delete(`/inventario/${id}`);

    return response.data;
  } catch (error) {
    console.error(
      "Error al eliminar producto:",
      error.response?.data || error.message,
    );

    throw error;
  }
}

export async function buscarProductosPorNombre(nombre) {
  try {
    const productosLocales = await obtenerProductosInventarioLocal();
    const texto = String(nombre || "").trim().toLowerCase();

    if (!texto) {
      return productosLocales;
    }

    return productosLocales.filter((producto) => {
      return [producto.nombre, producto.codigo, producto.categoria, producto.proveedor]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(texto));
    });
  } catch (error) {
    console.error(
      "Error al buscar productos:",
      error.response?.data || error.message,
    );

    throw error;
  }
}

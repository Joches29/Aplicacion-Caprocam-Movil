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

async function obtenerProductosInventarioLocal() {
  const [respInventario, respProductos, respProveedores] = await Promise.all([
    localApi.inventario.obtenerTodos({ incluirInactivos: false }),
    localApi.productos.obtenerTodos({ incluirInactivos: false }),
    localApi.proveedores.obtenerTodos({ incluirInactivos: false }),
  ]);

  const inventario = respInventario.success ? (respInventario.data || []) : [];
  const catalogoProductos = respProductos.success ? (respProductos.data || []) : [];
  const catalogoProveedores = respProveedores.success ? (respProveedores.data || []) : [];

  const buscarNombreProveedor = (provId, prodFallback) => {
    if (provId) {
      const provIdStr = String(provId);
      const prov = catalogoProveedores.find(
        (p) => String(p.servidor_id) === provIdStr || String(p.id) === provIdStr
      );
      if (prov?.nombre_empresa || prov?.nombre) return prov.nombre_empresa || prov.nombre;
    }
    if (prodFallback && isNaN(Number(prodFallback))) return prodFallback;
    return "Sin proveedor asignado";
  };

  const lista = catalogoProductos.map((p) => {
    const pLocalId = String(p.id);
    const pServId = p.servidor_id ? String(p.servidor_id) : null;

    const invRow = inventario.find((i) => {
      const invProdId = String(i.producto_id ?? "");
      if (pServId && invProdId === pServId) return true;
      if (invProdId === pLocalId) return true;
      if (p.codigo && i.codigo && String(i.codigo) === String(p.codigo)) return true;
      return false;
    });

    const proveedorId = invRow?.proveedor_id ?? p.proveedor_id ?? p.proveedorId ?? null;
    const nombreProveedor = buscarNombreProveedor(proveedorId, p.proveedor);

    const cantidad = Number(invRow?.cantidad ?? p.cantidad ?? 0) || 0;
    const stockMinimo = Number(invRow?.stock_minimo ?? p.stock_minimo ?? p.stockMinimo ?? 0) || 0;
    const precioUnidad = Number(p.precio_unidad ?? p.precioUnidad ?? 0) || 0;

    return {
      id: p.id,
      productoId: p.id,
      servidorId: p.servidor_id ?? null,
      codigo: p.codigo ?? "",
      nombre: p.nombre ?? `Producto ${p.id}`,
      categoria: p.categoria ?? "",
      proveedor: nombreProveedor,
      proveedorId,
      cantidad,
      unidad: p.unidad ?? "",
      stockMinimo,
      stock_maximo: stockMinimo,
      precioUnidad,
      precio_unidad: precioUnidad,
      entryDate: p.entryDate ?? p.fecha_ingreso ?? null,
      expirationDate: p.expirationDate ?? p.fecha_caducidad ?? null,
      fechaCaducidad: p.fecha_caducidad ?? p.expirationDate ?? null,
    };
  });

  return lista;
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
    const inventarioResult = await localApi.inventario.obtenerTodos({ producto_id: Number(id) });
    const inventarioRow = inventarioResult.success ? inventarioResult.data?.[0] : null;
    const updateId = inventarioRow ? inventarioRow.id : Number(id);

    const respuestaLocal = await localApi.inventario.actualizar(updateId, {
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
    const inventarioResult = await localApi.inventario.obtenerTodos({ producto_id: Number(id) });
    const inventarioRow = inventarioResult.success ? inventarioResult.data?.[0] : null;
    const deleteId = inventarioRow ? inventarioRow.id : Number(id);

    const respuestaLocal = await localApi.inventario.eliminar(deleteId);

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

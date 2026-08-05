/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: producto.service.js
Modulo: Productos
Descripcion:
Version SQLite (offline-first) del service de Productos.
Reemplaza temporalmente las llamadas HTTP directas por lectura/
escritura en la base local, para poder trabajar y probar sin
depender del backend ni de un JWT real.

IMPORTANTE:
- Mantiene exactamente los mismos nombres de funcion y la misma
  forma de los datos que la version anterior (producto.service.api.js,
  que queda guardada como respaldo/referencia), para no tener que
  tocar ninguno de los hooks que ya consumen este service
  (useAgregarProducto.js, useEditarProducto.js,
  useDetalleProductoScreen.js).
- LIMITE CON INVENTARIO: cantidad y stockMinimo NO viven en la
  tabla local "productos" -- viven en la tabla local "inventario"
  (columnas cantidad / stock_minimo). Por eso cada operacion de
  este service que crea/edita/borra un producto tambien crea/
  edita/borra su fila 1:1 en "inventario".
- NO SE USA eliminarRegistroLocalDespuesSync ("borrado de
  residuo"). "productos" e "inventario" son catalogo, no
  transaccional.
- grupoDatos/colaboradorId salen de local/sesionTemporal.helper.js.
  GRUPO_DATOS_TEMPORAL = 1001, confirmado contra el colaborador de
  prueba real (Gerald Alfaro, creado por testLocalDb.service.js).
//////////////////////////////////////////////////////////
*/

import { localApi } from "../../../database/local/localApi.service";
import { obtenerContextoLocal } from "../local/sesionTemporal.helper";

let baseInicializada = false;

async function asegurarBaseInicializada() {
  if (baseInicializada) return;
  await localApi.inicializar();
  baseInicializada = true;
}

async function obtenerInventarioDeProducto(productoIdLocal) {
  const resultado = await localApi.inventario.obtenerTodos({
    producto_id: productoIdLocal,
  });

  if (!resultado?.success) return null;

  return (resultado.data || [])[0] || null;
}

function combinarProductoInventario(productoRow, inventarioRow) {
  return {
    id: productoRow.id,
    codigo: productoRow.codigo,
    nombre: productoRow.nombre,
    categoria: productoRow.categoria,
    proveedorId: productoRow.proveedor_id ?? null,
    cantidad: inventarioRow?.cantidad ?? 0,
    unidad: productoRow.unidad ?? "",
    stockMinimo: inventarioRow?.stock_minimo ?? 0,
    precioUnidad: productoRow.precio_unidad ?? 0,
    entryDate: productoRow.fecha_ingreso ?? "",
    expirationDate: productoRow.fecha_caducidad ?? "",
  };
}

export const productoService = {

  getProductos: async () => {
    await asegurarBaseInicializada();
    const { grupoDatos } = await obtenerContextoLocal();

    const resultado = await localApi.productos.obtenerTodos({
      grupo_datos: grupoDatos,
      estado: "ACTIVO",
    });

    if (!resultado?.success) {
      throw new Error("No se pudieron obtener los productos.");
    }

    const productos = resultado.data || [];

    const combinados = await Promise.all(
      productos.map(async (productoRow) => {
        const inventarioRow = await obtenerInventarioDeProducto(productoRow.id);
        return combinarProductoInventario(productoRow, inventarioRow);
      })
    );

    return combinados;
  },

  getProductoPorId: async (id) => {
    await asegurarBaseInicializada();
    const resultado = await localApi.productos.obtenerPorId(Number(id));

    if (!resultado?.success) {
      throw new Error("No se pudo obtener el producto.");
    }

    if (!resultado.data) {
      const noEncontrado = new Error("Producto no encontrado.");
      noEncontrado.response = { status: 404 };
      throw noEncontrado;
    }

    const inventarioRow = await obtenerInventarioDeProducto(resultado.data.id);
    return combinarProductoInventario(resultado.data, inventarioRow);
  },

  crearProducto: async (datos) => {
    await asegurarBaseInicializada();
    const { grupoDatos, colaboradorId } = await obtenerContextoLocal();

    if (!datos.codigo || !datos.nombre || !datos.categoria) {
      const err = new Error("Faltan campos requeridos: codigo, nombre y categoria.");
      err.response = { status: 400 };
      throw err;
    }

    const proveedorId = datos.proveedorId ?? null;

    const productoCreado = await localApi.productos.crear({
      grupo_datos: grupoDatos,
      codigo: datos.codigo,
      nombre: datos.nombre,
      categoria: datos.categoria,
      unidad: datos.unidad || null,
      precio_unidad: datos.precioUnidad ?? 0,
      proveedor_id: proveedorId,
      fecha_ingreso: datos.entryDate || null,
      fecha_caducidad: datos.expirationDate || null,
      estado: "ACTIVO",
      creado_por_colaborador_id: colaboradorId,
    });

   


    if (!productoCreado?.success) {
      throw new Error("No se pudo crear el producto.");
    }

    const inventarioCreado = await localApi.inventario.crear({
      grupo_datos: grupoDatos,
      producto_id: productoCreado.data.id,
      proveedor_id: proveedorId,
      cantidad: datos.cantidad ?? 0,
      stock_minimo: datos.stockMinimo ?? 0,
      creado_por_colaborador_id: colaboradorId,
    });

    if (!inventarioCreado?.success) {
      throw new Error("El producto se creo pero no se pudo crear su registro de inventario.");
    }

    return combinarProductoInventario(productoCreado.data, inventarioCreado.data);
  },

  actualizarProducto: async (id, datos) => {
    await asegurarBaseInicializada();
    const proveedorId = datos.proveedorId ?? null;

    const productoActualizado = await localApi.productos.actualizar(Number(id), {
      codigo: datos.codigo,
      nombre: datos.nombre,
      categoria: datos.categoria,
      unidad: datos.unidad || null,
      precio_unidad: datos.precioUnidad ?? 0,
      proveedor_id: proveedorId,
      fecha_ingreso: datos.entryDate || null,
      fecha_caducidad: datos.expirationDate || null,
    });

    if (!productoActualizado?.success) {
      const noEncontrado = new Error("Producto no encontrado.");
      noEncontrado.response = { status: 404 };
      throw noEncontrado;
    }

    let inventarioRow = await obtenerInventarioDeProducto(Number(id));

    if (inventarioRow) {
      const inventarioActualizado = await localApi.inventario.actualizar(inventarioRow.id, {
        proveedor_id: proveedorId,
        cantidad: datos.cantidad ?? 0,
        stock_minimo: datos.stockMinimo ?? 0,
      });

      if (!inventarioActualizado?.success) {
        throw new Error("No se pudo actualizar el inventario del producto.");
      }

      inventarioRow = inventarioActualizado.data;
    } else {
      const { grupoDatos, colaboradorId } = await obtenerContextoLocal();
      const inventarioCreado = await localApi.inventario.crear({
        grupo_datos: grupoDatos,
        producto_id: Number(id),
        proveedor_id: proveedorId,
        cantidad: datos.cantidad ?? 0,
        stock_minimo: datos.stockMinimo ?? 0,
        creado_por_colaborador_id: colaboradorId,
      });

      if (!inventarioCreado?.success) {
        throw new Error("No se pudo crear el inventario del producto.");
      }

      inventarioRow = inventarioCreado.data;
    }

    return combinarProductoInventario(productoActualizado.data, inventarioRow);
  },

  desactivarProducto: async (id) => {
    await asegurarBaseInicializada();

    const inventarioRow = await obtenerInventarioDeProducto(Number(id));

    const resultado = await localApi.productos.eliminar(Number(id));

    if (!resultado?.success) {
      const noEncontrado = new Error("Producto no encontrado.");
      noEncontrado.response = { status: 404 };
      throw noEncontrado;
    }

    if (inventarioRow) {
      await localApi.inventario.eliminar(inventarioRow.id);
    }

    return resultado.data;
  },

  buscarProductosPorNombre: async (nombre) => {
    const todos = await productoService.getProductos();
    const nombreNorm = (nombre || "").trim().toLowerCase();

    if (!nombreNorm) return todos;

    return todos.filter((producto) =>
      (producto.nombre || "").toLowerCase().includes(nombreNorm)
    );
  },
};


export function mapProducto(apiProducto) {
  if (!apiProducto) return null;
  return {
    id: apiProducto.id,
    codigo: apiProducto.codigo ?? "",
    nombre: apiProducto.nombre ?? "",
    categoria: apiProducto.categoria ?? "",
    proveedor: apiProducto.proveedor ?? "",
    proveedorId: apiProducto.proveedorId ?? null,
    cantidad: apiProducto.cantidad ?? 0,
    unidad: apiProducto.unidad ?? "",
    stockMinimo: apiProducto.stockMinimo ?? 0,
    precioUnidad: apiProducto.precioUnidad ?? 0,
    entryDate: apiProducto.entryDate ?? "",
    expirationDate: apiProducto.expirationDate ?? "",
  };
}
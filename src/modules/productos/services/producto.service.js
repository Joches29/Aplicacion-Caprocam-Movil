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
import { obtenerGrupoDatosSesion, obtenerColaboradorIdSesion } from "../../../shared/utils/sessionUtils";

let baseInicializada = false;

async function asegurarBaseInicializada() {
  if (baseInicializada) return;
  await localApi.inicializar();
  baseInicializada = true;
}

async function obtenerInventarioDeProducto(productoRow) {
  if (!productoRow) return null;
  const res = await localApi.inventario.obtenerTodos({ incluirInactivos: false });
  if (!res?.success || !Array.isArray(res.data)) return null;

  const pLocalId = typeof productoRow === "object" ? String(productoRow.id ?? "") : String(productoRow);
  const pServId = typeof productoRow === "object" && productoRow.servidor_id ? String(productoRow.servidor_id) : null;
  const pCodigo = typeof productoRow === "object" && productoRow.codigo ? String(productoRow.codigo) : null;

  const match = res.data.find((i) => {
    const invProdId = String(i.producto_id ?? "");
    if (pServId && invProdId === pServId) return true;
    if (pLocalId && invProdId === pLocalId) return true;
    if (pCodigo && i.codigo && String(i.codigo) === pCodigo) return true;
    return false;
  });

  return match || null;
}

function combinarProductoInventario(productoRow, inventarioRow) {
  return {
    id: productoRow.id,
    servidorId: productoRow.servidor_id ?? null,
    codigo: productoRow.codigo ?? "",
    nombre: productoRow.nombre ?? "",
    categoria: productoRow.categoria ?? "",
    proveedor: productoRow.proveedor ?? "",
    proveedorId: inventarioRow?.proveedor_id ?? productoRow.proveedor_id ?? productoRow.proveedorId ?? null,
    cantidad: Number(inventarioRow?.cantidad ?? productoRow.cantidad ?? 0),
    unidad: productoRow.unidad ?? "",
    stockMinimo: Number(inventarioRow?.stock_minimo ?? productoRow.stock_minimo ?? productoRow.stockMinimo ?? 0),
    precioUnidad: Number(productoRow.precio_unidad ?? productoRow.precioUnidad ?? 0),
    entryDate: productoRow.fecha_ingreso ?? productoRow.entryDate ?? "",
    expirationDate: productoRow.fecha_caducidad ?? productoRow.expirationDate ?? "",
  };
}

export const productoService = {

  getProductos: async () => {
    await asegurarBaseInicializada();
    const grupoDatos = await obtenerGrupoDatosSesion();

    const [resProds, resInv] = await Promise.all([
      localApi.productos.obtenerTodos({
        grupo_datos: grupoDatos,
        estado: "ACTIVO",
      }),
      localApi.inventario.obtenerTodos({ incluirInactivos: false }),
    ]);

    const productos = (resProds?.success && Array.isArray(resProds.data)) ? resProds.data : [];
    const inventarios = (resInv?.success && Array.isArray(resInv.data)) ? resInv.data : [];

    const combinados = productos.map((productoRow) => {
      const pLocalId = String(productoRow.id);
      const pServId = productoRow.servidor_id ? String(productoRow.servidor_id) : null;

      const inventarioRow = inventarios.find((i) => {
        const invProdId = String(i.producto_id ?? "");
        if (pServId && invProdId === pServId) return true;
        if (invProdId === pLocalId) return true;
        return false;
      });

      return combinarProductoInventario(productoRow, inventarioRow);
    });

    return combinados;
  },

  getProductoPorId: async (id) => {
    await asegurarBaseInicializada();
    const idStr = String(id ?? "");
    const idNum = Number(id);

    let productoRow = null;

    // 1. Buscar por ID directo en tabla productos
    if (!Number.isNaN(idNum)) {
      const resDirecto = await localApi.productos.obtenerPorId(idNum);
      if (resDirecto?.success && resDirecto.data) {
        productoRow = resDirecto.data;
      }
    }

    // 2. Buscar por servidor_id en tabla productos
    if (!productoRow && !Number.isNaN(idNum)) {
      const resServidor = await localApi.productos.obtenerPorServidorId(idNum);
      if (resServidor?.success && resServidor.data) {
        productoRow = resServidor.data;
      }
    }

    // 3. Buscar en toda la lista de productos por id, servidor_id o codigo
    if (!productoRow) {
      const resTodos = await localApi.productos.obtenerTodos({ incluirInactivos: false });
      if (resTodos?.success && Array.isArray(resTodos.data)) {
        productoRow = resTodos.data.find((p) =>
          String(p.id) === idStr ||
          String(p.servidor_id) === idStr ||
          String(p.codigo) === idStr
        ) || null;
      }
    }

    // 4. Si aún no se encontró, buscar en tabla inventario para resolver producto_id
    if (!productoRow) {
      const resInv = await localApi.inventario.obtenerTodos({ incluirInactivos: false });
      if (resInv?.success && Array.isArray(resInv.data)) {
        const invMatch = resInv.data.find((i) =>
          String(i.id) === idStr ||
          String(i.producto_id) === idStr ||
          String(i.servidor_id) === idStr
        );
        if (invMatch) {
          const targetPId = invMatch.producto_id || invMatch.id;
          const resP = await localApi.productos.obtenerPorId(Number(targetPId));
          if (resP?.success && resP.data) {
            productoRow = resP.data;
          } else {
            const resPServ = await localApi.productos.obtenerPorServidorId(Number(targetPId));
            if (resPServ?.success && resPServ.data) {
              productoRow = resPServ.data;
            }
          }
        }
      }
    }

    if (!productoRow) {
      const noEncontrado = new Error("Producto no encontrado.");
      noEncontrado.response = { status: 404 };
      throw noEncontrado;
    }

    const inventarioRow = await obtenerInventarioDeProducto(productoRow);
    return combinarProductoInventario(productoRow, inventarioRow);
  },

  crearProducto: async (datos) => {
    await asegurarBaseInicializada();
    const grupoDatos = await obtenerGrupoDatosSesion();
     const colaboradorId = await obtenerColaboradorIdSesion();
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
      const grupoDatos = await obtenerGrupoDatosSesion();
      const colaboradorId = await obtenerColaboradorIdSesion();
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
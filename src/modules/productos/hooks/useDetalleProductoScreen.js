/**
 * ============================================================
 * HOOK: USEDETALLEPRODUCTO
 * ============================================================
 * Módulo: Productos
 *
 * Maneja la lógica de la pantalla de detalle de un producto.
 *
 * FUNCIONALIDAD:
 * 1. Obtiene el producto por id desde InventarioService.
 * 2. Calcula si el producto tiene stock bajo (cantidad < stock mínimo).
 * 3. Resuelve el color de la categoría para pintar el badge.
 * 4. Formatea precio unitario y valor total en stock en colones (₡).
 * 5. Expone la navegación hacia atrás (Inventarios).
 *
 * IMPORTANTE:
 * - Si no existe un producto con ese id, "producto" llega null.
 * - Detalle de solo lectura: sin edición ni borrado desde móvil
 *   (Minuta 05/08/2026) -- alta/edición/baja se maneja desde web.
 * ============================================================
 */

import { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { productoService, mapProducto } from "../services/producto.service";
import { getProveedorPorId } from "../services/proveedoresLookup";
import { useError } from "../../../shared/context/ErrorContext";

import { colorCategoria, colorCategoriaDefault } from "../styles/DetalleProductScreenStyles";

export function useDetalleProducto() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { mostrarError } = useError();

  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Carga el producto activo desde la API por su id, y resuelve el
  // nombre real del proveedor a partir de su proveedorId.
  const cargarProducto = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await productoService.getProductoPorId(id);
      const productoMapeado = mapProducto(data);

      if (productoMapeado?.proveedorId) {
        try {
          const proveedor = await getProveedorPorId(productoMapeado.proveedorId);
          productoMapeado.proveedor = proveedor?.nombre ?? "Sin proveedor asignado";
        } catch {
          // Si /proveedores no está disponible, no bloqueamos el
          // detalle del producto por eso -- solo se muestra vacío.
          productoMapeado.proveedor = "";
        }
      } else if (productoMapeado) {
        productoMapeado.proveedor = "Sin proveedor asignado";
      }

      setProducto(productoMapeado);
    } catch (err) {
      setProducto(null);
      setError("No se pudo cargar el producto.");
      mostrarError(err);
    } finally {
      setCargando(false);
    }
  }, [id, mostrarError]);

  useEffect(() => {
    if (id) cargarProducto();
  }, [id, cargarProducto]);

  const tieneStockBajo = producto ? producto.cantidad < producto.stockMinimo : false;
  const colores = producto ? colorCategoria[producto.categoria] || colorCategoriaDefault : colorCategoriaDefault;
  const precioFormateado = producto ? `₡${producto.precioUnidad.toLocaleString("es-CR")}` : "";
  const stockTotalFormateado = producto ? `₡${(producto.precioUnidad * producto.cantidad).toLocaleString("es-CR")}` : "";

  function handleBack() {
    router.replace("/(drawer)/inventarios");
  }

  return {
    producto,
    cargando,
    error,
    tieneStockBajo,
    colores,
    precioFormateado,
    stockTotalFormateado,
    handleBack,
  };
}
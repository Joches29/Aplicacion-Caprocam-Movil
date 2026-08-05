/**
 * devSeedProductos.js — SOLO PARA PRUEBAS LOCALES
 * Inserta proveedores + productos + inventario de prueba en SQLite,
 * bajo grupo_datos = 1001 (mismo grupo que Gerald Alfaro).
 *
 * ⚠️ Borrar este archivo (y el import/llamado en LoginScreen.jsx)
 * antes de mergear a dev.
 */

import { localApi } from "../../../database/local/localApi.service";

const GRUPO_DATOS_TEMPORAL = 1001;

export const sembrarProductosPrueba = async () => {
  await localApi.inicializar();

  const yaExistentes = await localApi.productos.obtenerTodos({
    grupo_datos: GRUPO_DATOS_TEMPORAL,
    codigo: "ALM-001",
  });

  if (yaExistentes?.success && (yaExistentes.data || []).length > 0) {
    console.log("Productos de prueba ya existian, no se vuelven a sembrar.");
    return yaExistentes.data;
  }

  const proveedorAlimento = await localApi.proveedores.crear({
    grupo_datos: GRUPO_DATOS_TEMPORAL,
    nombre_empresa: "Alimentos del Golfo S.A.",
    tipo_producto: "Alimentación",
    telefono: "88887777",
    correo_electronico: "ventas@alimentosdelgolfo.test",
  });

  const proveedorQuimico = await localApi.proveedores.crear({
    grupo_datos: GRUPO_DATOS_TEMPORAL,
    nombre_empresa: "Quimicorp CR",
    tipo_producto: "Químico",
    telefono: "88886666",
    correo_electronico: "info@quimicorp.test",
  });

  const proveedorIdAlimento = proveedorAlimento?.data?.id ?? null;
  const proveedorIdQuimico = proveedorQuimico?.data?.id ?? null;

  const productosPrueba = [
    { codigo: "ALM-001", nombre: "Alimento balanceado 35% proteína", categoria: "Alimentación", unidad: "kg", precio_unidad: 18500, proveedor_id: proveedorIdAlimento, fecha_ingreso: "2026-08-01", fecha_caducidad: "2027-02-01", cantidad: 250, stock_minimo: 50 },
    { codigo: "QUI-010", nombre: "Cal agrícola", categoria: "Químico", unidad: "kg", precio_unidad: 3200, proveedor_id: proveedorIdQuimico, fecha_ingreso: "2026-07-15", fecha_caducidad: null, cantidad: 80, stock_minimo: 100 },
    { codigo: "TRT-004", nombre: "Tratamiento antiparasitario", categoria: "Tratamiento", unidad: "litros", precio_unidad: 45000, proveedor_id: null, fecha_ingreso: "2026-08-03", fecha_caducidad: "2026-12-01", cantidad: 12, stock_minimo: 5 },
  ];

  const resultados = [];

  for (const p of productosPrueba) {
    const productoCreado = await localApi.productos.crear({
      grupo_datos: GRUPO_DATOS_TEMPORAL,
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria,
      unidad: p.unidad,
      precio_unidad: p.precio_unidad,
      proveedor_id: p.proveedor_id,
      fecha_ingreso: p.fecha_ingreso,
      fecha_caducidad: p.fecha_caducidad,
      estado: "ACTIVO",
      creado_por_colaborador_id: null,
    });

    const inventarioCreado = await localApi.inventario.crear({
      grupo_datos: GRUPO_DATOS_TEMPORAL,
      producto_id: productoCreado.data.id,
      proveedor_id: p.proveedor_id,
      cantidad: p.cantidad,
      stock_minimo: p.stock_minimo,
      creado_por_colaborador_id: null,
    });

    resultados.push({ producto: productoCreado.data, inventario: inventarioCreado.data });
  }

  console.log("Productos de prueba creados:", resultados);
  return resultados;
};
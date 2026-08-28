/**
 * ============================================================
 * SERVICE: DATAPRODUCTFORM
 * ============================================================
 * Módulo: Productos
 *
 * Datos estáticos que usan los formularios de producto
 * (AgregarProducto.jsx y EditarProducto.jsx).
 *
 * FUNCIONALIDAD:
 * 1. CATEGORIAS: opciones para el Select de categoría del producto.
 * 2. UNIDADES: opciones para el Select de unidad de medida.
 * 3. initialForm: estado inicial vacío del formulario, usado al crear
 *    un producto nuevo (y para resetear el form si params.productoParam
 *    no llega o es inválido).
 *
 * IMPORTANTE:
 * - Las categorías "Alimentación" y "Tratamiento" son las que habilitan
 *   el campo "Fecha de caducidad" en useAgregarProducto.js / useEditarProducto.js.
 * - unidad arranca en "kg" por defecto en initialForm.
 * - CATEGORIAS sincronizado con team6 (frontend web) al 22/8/2026:
 *   se reemplazan "Fertilizante", "Antibiótico" y "Probiótico" por
 *   "Mantenimiento" y "Equipos", para que el módulo de Mantenimiento
 *   de Equipos pueda filtrar productos por esa categoría (categoria
 *   es VARCHAR libre en el back, pero el select debe ofrecer las
 *   mismas opciones que web para no generar valores huérfanos al
 *   sincronizar). Ver hilo de WhatsApp del 21-22/8/2026.
 * ============================================================
*/


// ─────────────────────────────────────────────
// Opciones de selects
// ─────────────────────────────────────────────
export const CATEGORIAS = [
  { label: "Alimentación", value: "Alimentación" },
  { label: "Tratamiento", value: "Tratamiento" },
  { label: "Químico", value: "Químico" },
  { label: "Mantenimiento", value: "Mantenimiento" },
  { label: "Equipos", value: "Equipos" },
];

export const UNIDADES = [
  { label: "kg", value: "kg" },
  { label: "g", value: "g" },
  { label: "litros", value: "litros" },
  { label: "mL", value: "mL" },
  { label: "unidades", value: "unidades" },
];

// ─────────────────────────────────────────────
// Estado inicial limpio
// ─────────────────────────────────────────────
export const initialForm = {
  codigo: "",   
  nombre: "",
  categoria: "",
  proveedor: "",
  cantidad: "",
  unidad: "kg",
  stockMinimo: "",
  precioUnidad: "",
  entryDate: "",
  expirationDate: "",
};
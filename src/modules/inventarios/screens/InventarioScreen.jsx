/**
 * ============================================================
 * SCREEN: InventarioScreen
 * ============================================================
 *
 * Responsabilidad:
 * Pantalla principal del módulo de Inventarios. Muestra el listado de
 * productos con búsqueda, filtros y alerta de stock bajo, y permite
 * navegar al detalle de un producto o a la creación de uno nuevo.
 *
 * Datos:
 * Consume useInventario(), que a su vez lee del InventarioService.
 * Cada producto muestra: nombre, código, categoría, cantidad, unidad,
 * stock mínimo, proveedor, precio por unidad y fecha de caducidad
 * (dd/mm/aaaa, dato real que llega por la llave foránea con
 * Productos).
 *
 * Validaciones:
 * No aplica formularios en esta pantalla. El único estado visual
 * condicional es el resaltado de stock bajo (cantidad < stockMinimo).
 *
 * Navegación:
 * onDetail(id): navega al detalle de un producto.
 * onNew(): navega a la creación de un nuevo producto (el producto
 * creado se antepone al listado, ver InventarioService.addProducto).
 * onBack: se recibe como prop por consistencia con la navegación del
 * módulo; el botón de regreso lo resuelve el header global, no esta
 * pantalla.
 *
 * Dependencias:
 * shared/components (CardPress, Badge, Button, Text, Title, EmptyState,
 * Icons, Alert), components/SearchBar.jsx, components/FilterButton.jsx,
 * hooks/useInventario.js, theme (colors, icons, style).
 *
 * Notas de diseño:
 * La tarjeta de producto es completamente tocable (CardPress) y
 * navega al detalle desde cualquier punto; no lleva botón "Ver
 * detalle" explícito, igual que en el estándar visual de referencia.
 * El ícono junto al nombre cambia según la categoría del producto
 * (alimentación, tratamiento, químico, fertilizante,
 * antibiótico/probiótico, mantenimiento), usando el ícono de caja
 * como valor por defecto.
 * El badge de "Stock bajo" no lleva ícono, solo texto.
 * El botón "Añadir Producto" es flotante y queda fijo al fondo de
 * la pantalla, fuera del FlatList.
 * Cuando Productos navega de vuelta con el parámetro alertaProducto,
 * se muestra un Alert de éxito arriba durante 3 segundos.
 *
 */

import { View, FlatList } from "react-native";

import CardPress from "../../../shared/components/CardPress";
import Badge from "../../../shared/components/Badge";
import Button from "../../../shared/components/Button";
import CustomText from "../../../shared/components/Text";
import Title from "../../../shared/components/Title";
import EmptyState from "../../../shared/components/EmptyState";
import Icon from "../../../shared/components/Icons";
import SearchBar from "../../../shared/components/SearchBar";
import FilterButton from "../../../shared/components/FilterButton";
import Alert from "../../../shared/components/Alert";

import { COLORS } from "../../../theme/colors";
import { ICONS } from "../../../theme/icons";
import { STYLE } from "../../../theme/style";
import { styles } from "../styles/InventarioStyles";

import { useInventario } from "../hooks/useInventario";
import { getIconForCategory, getPluralizedUnit } from "../hooks/inventarioFormatters";

function FilaDetalle({ etiqueta, valor, resaltado = false }) {
  return (
    <View style={styles.filaDetalle}>
      <CustomText size={12} color={COLORS.textTertiary} style={styles.etiquetaDetalle}>
        {etiqueta}
      </CustomText>
      <CustomText
        size={14}
        weight="600"
        color={resaltado ? COLORS.error : COLORS.textSecondary}
        style={styles.valorDetalle}
      >
        {valor}
      </CustomText>
    </View>
  );
}

function TarjetaProducto({ producto, onVerDetalle }) {
  const tieneStockBajo = producto.cantidad < producto.stockMinimo;
  const precioFormateado =
    producto.precioUnidad != null && producto.precioUnidad !== ""
      ? `₡${Number(producto.precioUnidad).toLocaleString("es-CR")}`
      : "₡0";

  const fechaCaducidadFormateada =
    producto.fechaCaducidad != null &&
    producto.fechaCaducidad.toString().trim() !== "" &&
    producto.fechaCaducidad !== "-"
      ? producto.fechaCaducidad
      : "Sin Fecha de Caducidad";

  return (
    <CardPress
      onPress={onVerDetalle}
      style={[styles.tarjeta, tieneStockBajo && styles.tarjetaStockBajo]}
    >
      <View style={styles.filaTituloIcono}>
        <Icon icon={getIconForCategory(producto.categoria)} color={COLORS.primary} />
        <Title level={5} style={styles.nombreProducto}>
          {producto.nombre}
        </Title>
      </View>

      {tieneStockBajo && (
        <View style={styles.badgeStockBajo}>
          <CustomText size={12} weight="600" color={COLORS.error} style={styles.badgeStockBajoTexto}>
            Stock bajo
          </CustomText>
        </View>
      )}

      <Badge
        label={producto.categoria}
        style={styles.badgeCategoria}
        textStyle={styles.badgeTexto}
      />

      <View style={styles.filasDetalle}>
        <FilaDetalle etiqueta="Código" valor={producto.codigo || "No registrado"} />
        <FilaDetalle
          etiqueta="Cantidad"
          valor={`${producto.cantidad} ${getPluralizedUnit(producto.cantidad, producto.unidad)}`}
          resaltado={tieneStockBajo}
        />
        <FilaDetalle
          etiqueta="Stock mínimo"
          valor={`${producto.stockMinimo} ${getPluralizedUnit(producto.stockMinimo, producto.unidad)}`}
        />
        <FilaDetalle
          etiqueta="Proveedor"
          valor={producto.proveedor || "Sin proveedor asignado"}
        />
        <FilaDetalle etiqueta="Precio/unidad" valor={precioFormateado} />
        <FilaDetalle etiqueta="Fecha de caducidad" valor={fechaCaducidadFormateada} />
      </View>
    </CardPress>
  );
}

export default function InventarioScreen({ onDetail, onNew, onBack }) {
  const {
    flatListRef,
    busqueda,
    setBusqueda,
    filtros,
    setFiltros,
    categorias,
    proveedores,
    unidades,
    productosFiltrados,
    cantidadStockBajo,
    feedback,
  } = useInventario();

  return (
    <View style={STYLE.container}>
      {/* Zona de filtros y búsqueda fija arriba (fuera de la FlatList para que no pierda el foco) */}
      <View style={[STYLE.contentWrapper, styles.zonaFiltros]}>
        {feedback && (
          <Alert
            variant={feedback.variant}
            message={feedback.message}
            style={styles.alertFeedback}
          />
        )}

        <View style={styles.barraBusqueda}>
          <SearchBar
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar producto, código, categoría, proveedor..."
            containerStyle={styles.searchBarContainer}
          />
          <FilterButton
            categories={categorias}
            suppliers={proveedores}
            units={unidades}
            activeFilters={filtros}
            onApply={setFiltros}
            showLowStock
            showExpiryDate
            buttonStyle={styles.filterButton}
          />
        </View>

        {cantidadStockBajo > 0 && (
          <View style={styles.alertaBanner}>
            <Icon icon={ICONS.notification} color={COLORS.error} />
            <CustomText size={13} weight="600" color={COLORS.error} style={styles.alertaTexto}>
              {cantidadStockBajo}{" "}
              {cantidadStockBajo === 1 ? "producto" : "productos"} con stock bajo
            </CustomText>
          </View>
        )}

        <CustomText size={13} color={COLORS.textTertiary} style={styles.contadorResultados}>
          {productosFiltrados.length}{" "}
          {productosFiltrados.length === 1 ? "producto encontrado" : "productos encontrados"}
        </CustomText>
      </View>

      <FlatList
        ref={flatListRef}
        data={productosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TarjetaProducto
            producto={item}
            onVerDetalle={() => onDetail(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Sin productos"
            description="No se encontraron productos con esa búsqueda."
          />
        }
        contentContainerStyle={styles.lista}
      />

      
    </View>
  );
}